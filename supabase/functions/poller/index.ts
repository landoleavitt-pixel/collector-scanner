// Fields & Floors notification poller
//
// Runs on Supabase Edge Functions, triggered by pg_cron (hourly).
// Workflow:
//   1. Fetch all active saved searches (notify_enabled = true)
//   2. Group by deduplicated query+filter signature
//   3. Call the existing /api/search endpoint for each unique combo
//      (so the verification pipeline lives in one place — the Next.js app)
//   4. For each user, diff results against sent_notifications to find new matches
//   5. Send one email per user with all their new matches
//   6. Write sent_notifications rows so we never re-notify

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4";
import { sendPushToUser } from "./apns.ts";
import {
  APP_BASE_URL, buildBidReminderEmail, buildEmailHtml, buildSubject, senderFor, timeLeftLabel,
  type Listing, type SavedSearch, type UserDigest,
} from "./emails.ts";

// --- Environment ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

// One-time startup log to verify env vars are loaded. Shows only the
// prefix and length of the key — never the full secret.
console.log(`Boot: RESEND_API_KEY prefix=${RESEND_API_KEY?.slice(0, 6)}, length=${RESEND_API_KEY?.length}, APP_BASE_URL=${APP_BASE_URL}`);

// --- Who may start a run ---
// The function is public (verify_jwt = false in supabase/config.toml), so
// without this anyone who finds its address could start a run. The pg_cron
// jobs send a private secret in the x-ff-cron-secret header; it must match
// POLLER_CRON_SECRET. While that secret isn't set yet, runs are allowed as
// before (and logged), so alerts keep working until the secret is in place.
const CRON_SECRET = Deno.env.get("POLLER_CRON_SECRET") || "";
if (!CRON_SECRET) console.warn("POLLER_CRON_SECRET is not set: the alert checker accepts runs from anyone");

// Compares two strings without leaking how many leading characters match.
async function sameSecret(given: string, wanted: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(wanted)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// --- Main handler ---
Deno.serve(async (_req) => {
  if (CRON_SECRET && !(await sameSecret(_req.headers.get("x-ff-cron-secret") || "", CRON_SECRET))) {
    console.warn("Rejected a poller run without the right x-ff-cron-secret");
    return jsonResponse({ ok: false, error: "Not allowed" }, 401);
  }

  // Reminder-only run: a pg_cron job calls ?only=reminders every 5 minutes so
  // 30/15/5-minute reminders land on time. The hourly full run below also
  // checks reminders, as a backup.
  if (new URL(_req.url).searchParams.get("only") === "reminders") {
    const reminderErrors: string[] = [];
    const reminded = await processBidReminders(reminderErrors);
    return jsonResponse({ ok: true, bidRemindersSent: reminded, errors: reminderErrors.slice(0, 5) });
  }

  const startedAt = new Date().toISOString();
  let searchesChecked = 0;
  let notificationsSent = 0;
  let digestsDeferred = 0;
  const errors: string[] = [];

  try {
    // 1. Fetch all active saved searches
    const { data: searches, error: fetchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("notify_enabled", true);

    if (fetchError) throw fetchError;
    if (!searches || searches.length === 0) {
      return jsonResponse({ ok: true, message: "No active searches", searchesChecked: 0 });
    }

    // 1b. Gate by subscription tier. Only base-tier users and founding members
    // receive alerts. We filter BEFORE grouping/searching so unentitled users
    // never cost us an eBay API call.
    const allUserIds = [...new Set((searches as SavedSearch[]).map((s) => s.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, tier, is_founding_member, notify_frequency, last_notified_at")
      .in("id", allUserIds);

    if (profileError) throw profileError;

    // Early access (Supabase secret EARLY_ACCESS, on unless "0"): every account
    // alerts on everything it has switched on. The saved-searches API caps
    // that at 5 per account. Set EARLY_ACCESS=0 on launch day.
    const earlyAccess = (Deno.env.get("EARLY_ACCESS") ?? "1") !== "0";
    const entitled = new Set(
      (profiles ?? [])
        .filter((p) => earlyAccess || p.tier === "base" || p.is_founding_member === true)
        .map((p) => p.id)
    );

    // Per-user notification cadence. The poller runs hourly regardless; this
    // decides whether a given user's digest is actually SENT this run.
    // Deferring is what makes digests work: if we don't send, we also don't
    // write sent_notifications, so those matches stay "new" and roll into the
    // next email instead of being silently swallowed.
    const cadenceByUser = new Map<string, { frequency: string; lastNotifiedAt: string | null }>();
    for (const p of profiles ?? []) {
      cadenceByUser.set(p.id, {
        frequency: p.notify_frequency || "hourly",
        lastNotifiedAt: p.last_notified_at ?? null,
      });
    }

    // Entitled users alert on everything they have switched on. Free accounts
    // get one live alert: their oldest watching search.
    const freeSeen = new Set<string>();
    const gatedSearches = [...(searches as SavedSearch[])]
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .filter((s) => {
        if (entitled.has(s.user_id)) return true;
        if (freeSeen.has(s.user_id)) return false;
        freeSeen.add(s.user_id);
        return true;
      });

    if (gatedSearches.length === 0) {
      return jsonResponse({ ok: true, message: "No entitled active searches", searchesChecked: 0 });
    }

    // 2. Group by query+filter signature so identical searches share one eBay call
    const groups = groupBySignature(gatedSearches);

    // Build a per-user digest as we process each group
    const userDigests = new Map<string, UserDigest>();

    for (const [_signature, group] of groups) {
      try {
        const { query, filters, side, searches: searchesInGroup } = group;

        // 3. Hit our own /api/search endpoint so verification pipeline stays in one place
        //    (card-game searches use /api/tcg-search)
        const results = side === "fables"
          ? await callTcgSearch(query, filters)
          : await callAppSearch(query, filters);
        searchesChecked += searchesInGroup.length;

        if (!results || results.length === 0) continue;

        // 4. For each user, find listings they haven't been notified about
        const userIds = [...new Set(searchesInGroup.map((s) => s.user_id))];
        const listingIds = results.map((r) => r.id);

        const { data: alreadySent } = await supabase
          .from("sent_notifications")
          .select("user_id, listing_id")
          .in("user_id", userIds)
          .in("listing_id", listingIds);

        const sentSet = new Set(
          (alreadySent ?? []).map((row) => `${row.user_id}::${row.listing_id}`)
        );

        for (const search of searchesInGroup) {
          // "Only the ones I need": drop listings that can only be versions
          // this member already owns. If their marks can't be read, alert on
          // everything, as before.
          const owned = side === "fables" ? await ownedVersionsFor(search) : null;
          const newMatches = results.filter(
            (r) => !sentSet.has(`${search.user_id}::${r.id}`) && !onlyOwned(r, owned)
          );
          if (newMatches.length === 0) continue;

          const email = await getUserEmail(search.user_id);
          if (!email) continue;

          // One digest per user per side, so each email carries one brand.
          const digestKey = `${search.user_id}::${side}`;
          if (!userDigests.has(digestKey)) {
            userDigests.set(digestKey, {
              userId: search.user_id,
              email,
              side: side === "fables" ? "fables" : "sports",
              bySearch: new Map(),
            });
          }
          userDigests.get(digestKey)!.bySearch.set(search, newMatches);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Group ${group.query}: ${msg}`);
      }
    }

    // 5. Send one email per user with all their new matches — but only if
    //    their chosen cadence says they're due.
    for (const digest of userDigests.values()) {
      try {
        const cadence = cadenceByUser.get(digest.userId);
        if (!isDueForDigest(cadence?.frequency, cadence?.lastNotifiedAt)) {
          // Not due. Skip WITHOUT writing sent_notifications so these matches
          // remain unnotified and accumulate into the next scheduled digest.
          digestsDeferred++;
          continue;
        }

        await sendDigestEmail(digest);
        await sendPushToUser(supabase, digest.userId, buildDigestPush(digest));

        // 6. Log everything we just notified about so we don't re-spam
        const rows: Array<{ user_id: string; saved_search_id: string; listing_id: string }> = [];
        for (const [search, listings] of digest.bySearch) {
          for (const listing of listings) {
            rows.push({
              user_id: digest.userId,
              saved_search_id: search.id,
              listing_id: listing.id,
            });
          }
        }
        if (rows.length > 0) {
          // The email is already out, so a failed log write would resend the
          // same listings next run. Retry once; if it still fails, record it
          // and carry on (the cadence stamp below still applies).
          let { error: logError } = await supabase.from("sent_notifications").insert(rows);
          if (logError) {
            ({ error: logError } = await supabase.from("sent_notifications").insert(rows));
          }
          if (logError) {
            console.error(`sent_notifications insert failed for ${digest.userId}:`, logError.message);
            errors.push(`Log sent for ${digest.email}: ${logError.message}`);
          }
        }
        // Stamp the send so daily/weekly cadences can measure from it.
        await supabase
          .from("profiles")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", digest.userId);
        notificationsSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Send to ${digest.email}: ${msg}`);
      }
    }

    // Keep tiles fresh (price, bid count, ended/sold) in the background —
    // tiered + capped so it never blows the daily eBay quota.
    const watchlist = await refreshWatchlist(errors);

    return jsonResponse({
      ok: true,
      startedAt,
      searchesChecked,
      notificationsSent,
      watchlistRefreshed: watchlist.refreshed,
      watchlistEnded: watchlist.ended,
      watchlistSkipped: watchlist.skipped,
      bidRemindersSent: await processBidReminders(errors),
      errorCount: errors.length,
      errors: errors.slice(0, 5),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});

// --- Helpers ---

// Bid reminders: email users when a watched auction enters its final hours.
// "Approximate" timing — runs each hourly poll, fires once per auction when it's
// within the reminder window. Optionally gated on a max current-bid price.
// Members pick any mix of these, in minutes before the auction ends. Each
// one is sent once. reminder_max_price (optional) still gates every send.
const REMINDER_OFFSETS = [180, 60, 30, 15, 5];
const MAX_OFFSET_MIN = Math.max(...REMINDER_OFFSETS);
// How often the reminder-only cron job runs (minutes).
const REMINDER_CHECK_MIN = 5;

async function processBidReminders(errors: string[]): Promise<number> {
  let sent = 0;
  try {
    const nowMs = Date.now();
    const horizon = new Date(nowMs + (MAX_OFFSET_MIN + REMINDER_CHECK_MIN) * 60000).toISOString();

    // Armed reminders on active auctions ending within the longest window.
    const { data: rows, error } = await supabase
      .from("watched_listings")
      .select("*")
      .eq("bid_reminder", true)
      .eq("status", "active")
      .eq("is_auction", true)
      .gt("end_time", new Date(nowMs).toISOString())
      .lte("end_time", horizon);

    if (error) throw error;
    if (!rows || rows.length === 0) return 0;

    for (const row of rows) {
      try {
        const endMs = new Date(row.end_time).getTime();
        if (isNaN(endMs)) continue;
        const msLeft = endMs - nowMs;
        if (msLeft <= 0) continue;

        const offsets: number[] = (Array.isArray(row.reminder_offsets) && row.reminder_offsets.length)
          ? row.reminder_offsets.filter((o: number) => REMINDER_OFFSETS.includes(o))
          : [180];
        const already: number[] = Array.isArray(row.reminders_sent) ? row.reminders_sent : [];
        // Every chosen time that's due and hasn't been sent. The reminder-only
        // check runs every 5 minutes, so each one goes out up to 5 minutes
        // EARLY rather than late: "5 min" arrives with 5–10 minutes left, never
        // after it's too late to bid. If several are due at once (a missed
        // check), send one reminder and mark them all done, so nobody gets a burst.
        const due = offsets.filter((o) => !already.includes(o) && msLeft <= (o + REMINDER_CHECK_MIN) * 60000);
        if (due.length === 0) continue;

        const markDone = () => supabase
          .from("watched_listings")
          .update({ reminders_sent: [...already, ...due], reminder_sent: true })
          .eq("id", row.id);

        // Optional price gate: only remind if the current bid is at/below max.
        let currentPrice = row.price;
        if (row.reminder_max_price != null) {
          const live = await fetchLiveItemPrice(row.listing_id);
          if (live != null) currentPrice = live;
          if (currentPrice != null && Number(currentPrice) > Number(row.reminder_max_price)) {
            await markDone(); // over their max for this time slot; skip it
            continue;
          }
        }

        const email = await getUserEmail(row.user_id);
        if (!email) continue;

        await sendBidReminderEmail(email, row, currentPrice, msLeft);
        await sendPushToUser(supabase, row.user_id, {
          title: `Ending in about ${timeLeftLabel(msLeft)}`,
          body: row.title || "An auction you're watching is ending soon.",
          url: row.side === "fables" ? `/fables?card=${encodeURIComponent(row.listing_id)}` : "/watchlist-cards",
        });

        await markDone();
        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Bid reminder ${row.listing_id}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Bid reminders: ${msg}`);
  }
  return sent;
}

// Fetch a single item's current price from eBay via the Browse API getItem.
// Returns null on any error (we then fall back to the stored price).
// COMPACT fieldgroup reliably returns currentBidPrice for auctions.
async function fetchLiveItemPrice(listingId: string): Promise<number | null> {
  try {
    const token = await getEbayToken();
    if (!token) return null;
    const url = `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(listingId)}?fieldgroups=COMPACT`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const v = data?.currentBidPrice?.value ?? data?.price?.value;
    return v != null ? Number(v) : null;
  } catch {
    return null;
  }
}

let _ebayToken: string | null = null;
let _ebayTokenExp = 0;
async function getEbayToken(): Promise<string | null> {
  try {
    const now = Date.now();
    if (_ebayToken && now < _ebayTokenExp - 60_000) return _ebayToken;
    const appId = Deno.env.get("EBAY_APP_ID");
    const certId = Deno.env.get("EBAY_CERT_ID");
    if (!appId || !certId) return null;
    const basic = btoa(`${appId}:${certId}`);
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    });
    if (!res.ok) return null;
    const data = await res.json();
    _ebayToken = data.access_token;
    _ebayTokenExp = now + data.expires_in * 1000;
    return _ebayToken;
  } catch {
    return null;
  }
}

// ── Watchlist freshness refresh ───────────────────────────────────────────
// Keeps watched-listing tiles current in the background so users see live
// prices / bid counts and ended-or-sold status without having to open the
// Watchlist page. Quota-aware tiering (this poll runs hourly):
//   • auctions ending within 24h  → every poll
//   • auctions 1–7 days out       → every ~6h
//   • everything else / BIN       → once a day
// A hard ceiling on eBay calls per run keeps the daily total well under the
// app cap no matter how large watchlists grow; ending-soonest rows go first.
const REFRESH_BATCH_LIMIT = 80;          // max eBay item calls per poll run
const RW_HOUR = 60 * 60 * 1000;
const RW_DAY = 24 * RW_HOUR;
const RW_POLL_SLACK = 30 * 60 * 1000;    // cushion so the hourly poll never misses a tier

function refreshIntervalMs(row: Record<string, any>, nowMs: number): number {
  // Fixed-price (BIN) and rows with no end date refresh once a day.
  if (!row.is_auction || !row.end_time) return RW_DAY;
  const endMs = new Date(row.end_time).getTime();
  if (isNaN(endMs)) return RW_DAY;
  const msLeft = endMs - nowMs;
  if (msLeft <= 24 * RW_HOUR) return 0;         // ending soon (or already past) → every poll
  if (msLeft <= 7 * RW_DAY) return 6 * RW_HOUR; // this week
  return RW_DAY;                                // far out
}

function isRefreshDue(row: Record<string, any>, nowMs: number): boolean {
  const interval = refreshIntervalMs(row, nowMs);
  if (interval === 0) return true;
  const last = row.last_checked ? new Date(row.last_checked).getTime() : 0;
  if (isNaN(last)) return true;
  return nowMs - last >= interval - RW_POLL_SLACK;
}

// Discriminated result so a transient failure (network / 5xx / rate-limit)
// never marks a live card ended — only a real 404 / OUT_OF_STOCK counts.
type ItemSnapshot =
  | { state: "ended" }
  | { state: "active"; price: number | null; bidCount: number | null; endTime: string | null }
  | { state: "transient" };

async function fetchItemSnapshot(listingId: string, token: string): Promise<ItemSnapshot> {
  // eBay's Browse getItem takes the item ID in the URL path, not as a query
  // parameter. The COMPACT fieldgroup is the documented way to reliably get
  // bidCount + currentBidPrice + itemEndDate for auctions.
  const url = `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(listingId)}?fieldgroups=COMPACT`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return { state: "transient" };
  }
  if (res.status === 404) return { state: "ended" };
  if (!res.ok) return { state: "transient" };

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { state: "transient" };
  }

  const avail = data?.estimatedAvailabilities?.[0]?.estimatedAvailabilityStatus;
  if (avail === "OUT_OF_STOCK") return { state: "ended" };

  const rawPrice = data?.currentBidPrice?.value ?? data?.price?.value;
  const price = rawPrice != null ? Number(rawPrice) : null;
  const bidCount = data?.bidCount != null ? Number(data.bidCount) : null;
  const endTime = data?.itemEndDate ?? null;
  return { state: "active", price, bidCount, endTime };
}

async function refreshWatchlist(
  errors: string[],
): Promise<{ refreshed: number; ended: number; skipped: number }> {
  let refreshed = 0;
  let ended = 0;
  let skipped = 0;
  try {
    const { data: rows, error } = await supabase
      .from("watched_listings")
      .select("id, listing_id, is_auction, end_time, last_checked, status")
      .eq("status", "active");
    if (error) throw error;
    if (!rows || rows.length === 0) return { refreshed, ended, skipped };

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    // Only rows actually due, ending-soonest first, capped per run.
    const due = (rows as Record<string, any>[])
      .filter((r) => isRefreshDue(r, nowMs))
      .sort((a, b) => {
        const ae = a.end_time ? new Date(a.end_time).getTime() : Infinity;
        const be = b.end_time ? new Date(b.end_time).getTime() : Infinity;
        return ae - be;
      });
    skipped = rows.length - due.length;
    const batch = due.slice(0, REFRESH_BATCH_LIMIT);
    if (batch.length === 0) return { refreshed, ended, skipped };

    const token = await getEbayToken();
    if (!token) {
      errors.push("Watchlist refresh: no eBay token");
      return { refreshed, ended, skipped };
    }

    for (const row of batch) {
      try {
        const snap = await fetchItemSnapshot(row.listing_id, token);
        if (snap.state === "transient") continue; // leave as-is; retry next poll

        if (snap.state === "ended") {
          await supabase
            .from("watched_listings")
            .update({ status: "ended", sold_at: nowIso, last_checked: nowIso })
            .eq("id", row.id);
          ended++;
          refreshed++;
          continue;
        }

        // active — refresh live fields, keep last-known values for anything missing
        const patch: Record<string, any> = { last_checked: nowIso };
        if (snap.price != null) patch.price = snap.price;
        if (snap.bidCount != null) patch.bid_count = snap.bidCount;
        if (snap.endTime) patch.end_time = snap.endTime;
        await supabase.from("watched_listings").update(patch).eq("id", row.id);
        refreshed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Refresh ${row.listing_id}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Watchlist refresh: ${msg}`);
  }
  return { refreshed, ended, skipped };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Group identical query+filter combos so we make one eBay call per unique signature.
function groupBySignature(searches: SavedSearch[]) {
  const groups = new Map<
    string,
    { query: string; filters: Record<string, unknown>; side: string; searches: SavedSearch[] }
  >();
  for (const s of searches) {
    const side = s.side ?? "sports";
    const sig = JSON.stringify({ q: s.query.trim().toLowerCase(), f: s.filters, side });
    if (!groups.has(sig)) {
      groups.set(sig, { query: s.query, filters: s.filters, side, searches: [] });
    }
    groups.get(sig)!.searches.push(s);
  }
  return groups;
}

// Call the existing Next.js search endpoint so we don't duplicate eBay logic.
async function callAppSearch(query: string, filters: Record<string, unknown>): Promise<Listing[]> {
  const url = `${APP_BASE_URL}/api/search`;
  const body = {
    keywords: query,
    autoCards: filters.autoCards ?? false,
    numberedCards: filters.numberedCards ?? false,
    selectedPrintRuns: [
      ...((filters.selectedPrintRuns as string[]) ?? []),
      ...((filters.customPrintRuns as string[]) ?? []),
    ],
    rookieCards: filters.rookieCards ?? false,
    listingType: filters.listingType ?? "any",
    condition: filters.condition ?? "any",
    priceMin: filters.priceMin ?? 0,
    priceMax: filters.priceMax === 5000 ? null : (filters.priceMax ?? 1000),
    sortBy: filters.sortBy ?? "printrun-rarest",
    // Card company filter (lib/cardBrands.js). Empty = off.
    brands: (filters.brands as string[]) ?? [],
    brandLines: (filters.brandLines as string[]) ?? [],
    // Team filter (lib/teams.js). Empty = off.
    teams: (filters.teams as string[]) ?? [],
    // Shipping and offers (More filters): eBay's own filters.
    freeShip: filters.freeShip === true,
    offers: filters.offers === true,
    shipFrom: typeof filters.shipFrom === "string" ? filters.shipFrom : "",
    returns: filters.returns === true,
  };

  // Signed so the site lets the checker past the per-visitor rate limit
  // (lib/pollerAuth.js). If the site doesn't recognise the signature and
  // rate-limits us anyway, wait as told and retry once rather than silently
  // skipping this search.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await pollerSignature()) },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(60, Number(res.headers.get("Retry-After")) || 10);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Search API returned ${res.status}`);
    }
    const data = await res.json();
    return data.items ?? [];
  }
  throw new Error("Search API rate-limited the alert checker twice");
}

// Foils & Fables saved searches: GET /api/tcg-search with the saved filters
// (same names as its query string). Mirrors savedSearchParams in
// lib/tcg/search.js: newest listings, the whole filtered pool.
// More filters (2026-11-01): finish, art, promos, cond, and shipping and offers.
const TCG_FILTER_KEYS = ["game", "set", "rarity", "lang", "graded", "grader", "grade", "firstEd", "serialOnly", "priceMin", "priceMax", "listing", "finish", "art", "promos", "cond", "freeShip", "offers", "shipFrom", "returns"];
// Saved searches with a `card` are card-family searches: GET
// /api/tcg-family-search. Mirrors familySavedParams in lib/tcg/familySearch.js.
const FAMILY_FILTER_KEYS = ["game", "card", "cards", "versions", "set", "rarity", "lang", "graded", "priceMin", "priceMax", "listing", "freeShip", "offers", "shipFrom", "returns"];
function familyCardKeys(filters: Record<string, unknown>): string[] {
  const list = Array.isArray(filters?.cards) ? (filters.cards as unknown[]).map(String) : [];
  if (filters?.card) list.push(String(filters.card));
  return [...new Set(list.filter(Boolean))].slice(0, 100);
}
function tcgSearchUrl(query: string, filters: Record<string, unknown>): string {
  if (familyCardKeys(filters).length) {
    const params = new URLSearchParams({ sort: "newest", limit: "1000" });
    if (query) params.set("q", query);
    for (const k of FAMILY_FILTER_KEYS) {
      const v = filters[k];
      if (v == null || v === "" || v === false || (Array.isArray(v) && !v.length)) continue;
      params.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    params.set("unsure", Array.isArray(filters.versions) && filters.versions.length ? "hide" : "show");
    return `${APP_BASE_URL}/api/tcg-family-search?${params}`;
  }
  const params = new URLSearchParams({ q: query || "", sort: "newest", limit: "1000" });
  for (const k of TCG_FILTER_KEYS) {
    const v = filters?.[k];
    if (v == null || v === "" || v === false || (Array.isArray(v) && !v.length) || (k === "promos" && v === "show")) continue;
    params.set(k, Array.isArray(v) ? v.join(",") : v === true ? "1" : String(v));
  }
  return `${APP_BASE_URL}/api/tcg-search?${params}`;
}

async function callTcgSearch(query: string, filters: Record<string, unknown>): Promise<Listing[]> {
  const url = tcgSearchUrl(query, filters);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: await pollerSignature() });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(60, Number(res.headers.get("Retry-After")) || 10);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`TCG search API returned ${res.status}`);
    const data = await res.json();
    return (data.items ?? []).map((it: Listing) => ({
      ...it,
      side: "fables" as const,
      isAuction: it.buyingOptions?.includes("AUCTION") ?? false,
      isBuyItNow: it.buyingOptions?.includes("FIXED_PRICE") ?? false,
    }));
  }
  throw new Error("TCG search API rate-limited the alert checker twice");
}

// The versions of a card-family search's cards that the alert's owner has
// marked as owned (table owned_cards). Only that member's rows for those
// cards are read. (Version keys are set:number:finish, so they don't collide
// across cards.) Returns null (no filtering) when the search isn't a need-only
// family search, or when the table is missing or the read fails. Nothing
// about the member or the card is logged.
async function ownedVersionsFor(search: SavedSearch): Promise<Set<string> | null> {
  const f = (search.filters ?? {}) as Record<string, unknown>;
  const cards = familyCardKeys(f);
  if (!f.needOnly || !cards.length || !f.game) return null;
  try {
    const { data, error } = await supabase
      .from("owned_cards")
      .select("version_key")
      .eq("user_id", search.user_id)
      .eq("side", "fables")
      .eq("game", String(f.game))
      .in("card_key", cards);
    if (error || !data) return null;
    return new Set(data.map((row: { version_key: string }) => row.version_key));
  } catch {
    return null;
  }
}

// True when every version a listing could be is one the member owns.
function onlyOwned(listing: Listing, owned: Set<string> | null): boolean {
  const versions = listing.match?.versions;
  if (!owned || !owned.size || !versions?.length) return false;
  return versions.every((v) => owned.has(v));
}

// "poller:<unix seconds>" signed with POLLER_SECRET (or the service role key),
// matching lib/pollerAuth.js on the site.
async function pollerSignature(): Promise<Record<string, string>> {
  const secret = Deno.env.get("POLLER_SECRET") || SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return {};
  const ts = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`poller:${ts}`)));
  const sig = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { "x-ff-poller-ts": ts, "x-ff-poller-sig": sig };
}

// Fetch a user's email from Supabase auth.
async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

// Send a single digest email for one user, listing all their new matches.
async function sendDigestEmail(digest: UserDigest) {
  const totalMatches = [...digest.bySearch.values()].reduce((sum, arr) => sum + arr.length, 0);
  const subject = buildSubject(digest);
  const html = buildEmailHtml(digest);

  const result = await resend.emails.send({
    from: senderFor(digest.side),
    to: digest.email,
    subject,
    html,
  });

  // Resend's SDK returns { data, error } instead of throwing. Surface either.
  if (result.error) {
    console.error(`Resend error for ${digest.email}:`, JSON.stringify(result.error));
    throw new Error(`Resend rejected: ${JSON.stringify(result.error)}`);
  }

  console.log(`Sent digest to ${digest.email}: ${totalMatches} matches, id=${result.data?.id}`);
}

// Send a single "auction ending soon" reminder email.
async function sendBidReminderEmail(
  email: string,
  row: Record<string, any>,
  currentPrice: number | null,
  msLeft: number,
) {
  const { subject, html } = buildBidReminderEmail(row, currentPrice, msLeft);

  const result = await resend.emails.send({
    from: senderFor(row.side),
    to: email,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend rejected: ${JSON.stringify(result.error)}`);
  }
  console.log(`Sent bid reminder to ${email} for ${row.listing_id}, id=${result.data?.id}`);
}

// Push version of the digest: same headline as the email subject; tapping
// opens the card itself for a single match, otherwise the saved searches.
function buildDigestPush(digest: UserDigest) {
  const all = [...digest.bySearch.values()].flat();
  const single = all.length === 1 ? all[0] : null;
  return {
    title: buildSubject(digest),
    body: single ? single.title : all.slice(0, 2).map((l) => l.title).join(" · "),
    url: digest.side === "fables"
      ? (single ? `/fables?card=${encodeURIComponent(single.id)}&utm_source=push` : "/fables")
      : (single ? `/?card=${encodeURIComponent(single.id)}&utm_source=push` : "/watchlist"),
  };
}

/* Is this user due for a digest email right now?
 *
 * The poller runs hourly, so "hourly" and "15min" are always due — 15-minute
 * cadence is a higher-tier promise that needs the cron interval tightened
 * (and an eBay quota increase) before it means anything different. It's
 * treated as hourly until then rather than silently under-delivering.
 *
 * Daily and weekly measure from the last time we actually sent this user
 * something. A null last_notified_at means they've never been emailed, so
 * they're due immediately.
 */
function isDueForDigest(frequency?: string, lastNotifiedAt?: string | null): boolean {
  const freq = frequency || "hourly";
  if (freq === "hourly" || freq === "15min") return true;

  const intervals: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
  };
  const interval = intervals[freq];
  if (!interval) return true; // unknown value — fail open rather than mute someone

  if (!lastNotifiedAt) return true;
  const last = new Date(lastNotifiedAt).getTime();
  if (!Number.isFinite(last)) return true;

  // Small slack so an hourly cron that drifts by a few seconds doesn't push
  // a daily digest to the following day.
  const SLACK_MS = 5 * 60 * 1000;
  return Date.now() - last >= interval - SLACK_MS;
}

