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

// --- Environment ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://fieldsandfloors.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

// One-time startup log to verify env vars are loaded. Shows only the
// prefix and length of the key — never the full secret.
console.log(`Boot: RESEND_API_KEY prefix=${RESEND_API_KEY?.slice(0, 6)}, length=${RESEND_API_KEY?.length}, APP_BASE_URL=${APP_BASE_URL}`);

// --- Types ---
interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  notify_enabled: boolean;
}

interface Listing {
  id: string;
  title: string;
  price: string | number | null;
  currency: string;
  image: string | null;
  url: string;
  condition?: string;
  isAuction?: boolean;
  isBuyItNow?: boolean;
}

interface UserDigest {
  userId: string;
  email: string;
  bySearch: Map<SavedSearch, Listing[]>;
}

// --- Main handler ---
Deno.serve(async (_req) => {
  const startedAt = new Date().toISOString();
  let searchesChecked = 0;
  let notificationsSent = 0;
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
      .select("id, tier, is_founding_member")
      .in("id", allUserIds);

    if (profileError) throw profileError;

    const entitled = new Set(
      (profiles ?? [])
        .filter((p) => p.tier === "base" || p.is_founding_member === true)
        .map((p) => p.id)
    );

    const gatedSearches = (searches as SavedSearch[]).filter((s) =>
      entitled.has(s.user_id)
    );

    if (gatedSearches.length === 0) {
      return jsonResponse({ ok: true, message: "No entitled active searches", searchesChecked: 0 });
    }

    // 2. Group by query+filter signature so identical searches share one eBay call
    const groups = groupBySignature(gatedSearches);

    // Build a per-user digest as we process each group
    const userDigests = new Map<string, UserDigest>();

    for (const [_signature, group] of groups) {
      try {
        const { query, filters, searches: searchesInGroup } = group;

        // 3. Hit our own /api/search endpoint so verification pipeline stays in one place
        const results = await callAppSearch(query, filters);
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
          const newMatches = results.filter(
            (r) => !sentSet.has(`${search.user_id}::${r.id}`)
          );
          if (newMatches.length === 0) continue;

          const email = await getUserEmail(search.user_id);
          if (!email) continue;

          if (!userDigests.has(search.user_id)) {
            userDigests.set(search.user_id, {
              userId: search.user_id,
              email,
              bySearch: new Map(),
            });
          }
          userDigests.get(search.user_id)!.bySearch.set(search, newMatches);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Group ${group.query}: ${msg}`);
      }
    }

    // 5. Send one email per user with all their new matches
    for (const digest of userDigests.values()) {
      try {
        await sendDigestEmail(digest);

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
          await supabase.from("sent_notifications").insert(rows);
        }
        notificationsSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Send to ${digest.email}: ${msg}`);
      }
    }

    return jsonResponse({
      ok: true,
      startedAt,
      searchesChecked,
      notificationsSent,
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
const REMINDER_WINDOW_HOURS = 3;

async function processBidReminders(errors: string[]): Promise<number> {
  let sent = 0;
  try {
    const nowMs = Date.now();
    const windowMs = REMINDER_WINDOW_HOURS * 60 * 60 * 1000;

    // Armed reminders on active auctions that haven't been reminded yet.
    const { data: rows, error } = await supabase
      .from("watched_listings")
      .select("*")
      .eq("bid_reminder", true)
      .eq("reminder_sent", false)
      .eq("status", "active")
      .eq("is_auction", true);

    if (error) throw error;
    if (!rows || rows.length === 0) return 0;

    for (const row of rows) {
      try {
        if (!row.end_time) continue;
        const endMs = new Date(row.end_time).getTime();
        if (isNaN(endMs)) continue;

        const msLeft = endMs - nowMs;
        // Skip if already ended, or not yet within the final window.
        if (msLeft <= 0 || msLeft > windowMs) continue;

        // Optional price gate: only remind if the current bid is at/below max.
        let currentPrice = row.price;
        if (row.reminder_max_price != null) {
          const live = await fetchLiveItemPrice(row.listing_id);
          if (live != null) currentPrice = live;
          if (currentPrice != null && Number(currentPrice) > Number(row.reminder_max_price)) {
            continue; // bid has exceeded their max — don't remind
          }
        }

        const email = await getUserEmail(row.user_id);
        if (!email) continue;

        await sendBidReminderEmail(email, row, currentPrice, msLeft);

        await supabase
          .from("watched_listings")
          .update({ reminder_sent: true })
          .eq("id", row.id);

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
async function fetchLiveItemPrice(listingId: string): Promise<number | null> {
  try {
    const token = await getEbayToken();
    if (!token) return null;
    const url = `https://api.ebay.com/buy/browse/v1/item?item_id=${encodeURIComponent(listingId)}`;
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
    { query: string; filters: Record<string, unknown>; searches: SavedSearch[] }
  >();
  for (const s of searches) {
    const sig = JSON.stringify({ q: s.query.trim().toLowerCase(), f: s.filters });
    if (!groups.has(sig)) {
      groups.set(sig, { query: s.query, filters: s.filters, searches: [] });
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
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Search API returned ${res.status}`);
  }
  const data = await res.json();
  return data.items ?? [];
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
    from: "Fields & Floors <alerts@fieldsandfloors.com>",
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
  const priceStr = currentPrice != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(currentPrice))
    : "—";
  const hoursLeft = Math.max(1, Math.round(msLeft / (60 * 60 * 1000)));
  const title = row.title || "Your watched auction";
  const url = row.listing_url || "https://fieldsandfloors.com/watchlist-cards";

  const subject = `Ending soon — ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0907;font-family:Georgia,serif;color:#f7f1e1;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c9954a;margin-bottom:14px;">
      Fields &amp; Floors · Auction ending soon
    </div>
    <div style="font-style:italic;font-size:26px;line-height:1.2;color:#f7f1e1;margin-bottom:18px;">
      An auction you're watching ends in about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.
    </div>
    <div style="border:0.5px solid #2a251c;border-radius:12px;background:#14110c;padding:18px;margin-bottom:22px;">
      <div style="font-size:14px;line-height:1.4;color:#f7f1e1;margin-bottom:10px;">${title}</div>
      <div style="font-style:italic;font-size:24px;color:#c9954a;">${priceStr}<span style="font-size:12px;color:#a99e85;font-style:normal;"> current bid</span></div>
    </div>
    <a href="${url}" style="display:inline-block;background:#c9954a;color:#1a1612;text-decoration:none;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:13px 26px;border-radius:999px;">
      View &amp; bid on eBay
    </a>
    <p style="font-size:12px;color:#6b6354;margin-top:24px;line-height:1.6;">
      Bidding happens on eBay — we just remind you before time runs out. Prices and
      availability can change; confirm on the listing.
    </p>
  </div>
</body>
</html>`;

  const result = await resend.emails.send({
    from: "Fields & Floors <alerts@fieldsandfloors.com>",
    to: email,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend rejected: ${JSON.stringify(result.error)}`);
  }
  console.log(`Sent bid reminder to ${email} for ${row.listing_id}, id=${result.data?.id}`);
}

function buildSubject(digest: UserDigest): string {
  const searches = [...digest.bySearch.entries()];
  const totalMatches = searches.reduce((sum, [, listings]) => sum + listings.length, 0);

  if (searches.length === 1) {
    const [search, listings] = searches[0];
    if (listings.length === 1) {
      const l = listings[0];
      const price = l.price != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(l.price))
        : "";
      return `A new match for ${search.name}${price ? ` — ${price}` : ""}`;
    }
    return `${listings.length} new matches for ${search.name}`;
  }

  return `${totalMatches} new matches across your watchlist`;
}

function buildEmailHtml(digest: UserDigest): string {
  const sections = [...digest.bySearch.entries()]
    .map(([search, listings]) => renderSearchSection(search, listings))
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0c0a;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0c0a;padding:40px 20px;">
    <tr><td align="center">

      <!-- Brand header -->
      <table width="100%" style="max-width:560px;margin-bottom:24px;">
        <tr><td>
          <div style="font-family:Georgia,serif;font-size:20px;color:#d4af5c;font-style:italic;letter-spacing:0.02em;text-align:center;">
            Fields &amp; Floors
          </div>
          <div style="font-size:10px;color:#6e675b;letter-spacing:0.22em;text-transform:uppercase;text-align:center;margin-top:6px;">
            New on the hunt
          </div>
        </td></tr>
      </table>

      ${sections}

      <!-- Footer -->
      <table width="100%" style="max-width:560px;margin-top:32px;">
        <tr><td style="text-align:center;font-size:11px;color:#6e675b;line-height:1.6;">
          You're receiving this because you saved a search on Fields &amp; Floors.<br>
          <a href="${APP_BASE_URL}/watchlist" style="color:#8a8275;text-decoration:underline;">Manage your watchlist</a>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function renderSearchSection(search: SavedSearch, listings: Listing[]): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-bottom:28px;">
      <tr><td style="padding-bottom:14px;border-bottom:0.5px solid rgba(232,226,213,0.1);">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#e8e2d5;">${escapeHtml(search.name)}</div>
        <div style="font-size:11px;color:#8a8275;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">
          ${listings.length} new ${listings.length === 1 ? "match" : "matches"}
        </div>
      </td></tr>
      ${listings.map(renderListingCard).join("")}
    </table>
  `;
}

function renderListingCard(l: Listing): string {
  const price = l?.price != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(l.price))
    : "—";
  const img = (l?.image && typeof l.image === "string") ? l.image : "";
  // Upscale eBay's thumbnail using their s-l URL trick (only if we have an image)
  const upscaledImg = img ? img.replace(/\/s-l\d+\.(\w+)/, "/s-l500.$1") : "";
  const title = l?.title ?? "";
  const webUrl = l?.url ?? "#";

  // Derive chips from the listing — print run + tier, auto, rookie, grading, listing type
  const lowerTitle = title.toLowerCase();
  const hasAuto = /\bauto\b|autograph|signed/.test(lowerTitle);
  const hasRookie = /\brookie/.test(lowerTitle) || /\brc\b/.test(lowerTitle) || /\b1st\s+bowman\b/.test(lowerTitle);
  const printRun = detectPrintRun(title);
  const tier = printRun ? printRunTier(printRun) : null;
  const psaMatch = title.match(/PSA\s*(\d{1,2})/i);
  const bgsMatch = title.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i);
  const sgcMatch = title.match(/SGC\s*(\d{1,2}(?:\.\d)?)/i);
  const cgcMatch = title.match(/CGC\s*(\d{1,2}(?:\.\d)?)/i);

  // Row tier styling — left border + faint gradient wash, mirrors the search results page
  const TIER_ROW_STYLES: Record<string, { bg: string; border: string }> = {
    grail:  { bg: "linear-gradient(90deg, rgba(255,180,30,0.18) 0%, rgba(245,200,80,0.05) 30%, transparent 60%)", border: "#ffc14d" },
    ultra:  { bg: "linear-gradient(90deg, rgba(180,200,220,0.14) 0%, rgba(210,220,230,0.03) 25%, transparent 50%)", border: "#c8d4e0" },
    rare:   { bg: "linear-gradient(90deg, rgba(200,90,30,0.12) 0%, rgba(220,110,50,0.03) 22%, transparent 45%)", border: "#d6722d" },
    scarce: { bg: "linear-gradient(90deg, rgba(80,90,100,0.09) 0%, transparent 24%)", border: "#5a6470" },
  };
  const rowStyle = tier ? TIER_ROW_STYLES[tier] : null;
  const rowBg = rowStyle ? `background:#1a1614;background-image:${rowStyle.bg};border-left:2px solid ${rowStyle.border};` : `background:#1a1614;border-left:2px solid rgba(232,226,213,0.08);`;

  // Tier-gradient chips for print runs (matches the Badge component on the live site)
  const TIER_CHIP_STYLES: Record<string, string> = {
    grail:  "color:#1a1612;background-image:linear-gradient(180deg,#ffd97a 0%,#d99c14 100%);border:0.5px solid #ffc14d;font-weight:700;",
    ultra:  "color:#1a1612;background-image:linear-gradient(180deg,#e0e8f0 0%,#98a5b3 100%);border:0.5px solid #c8d4e0;font-weight:700;",
    rare:   "color:#1a1612;background-image:linear-gradient(180deg,#d6884a 0%,#8e4f1f 100%);border:0.5px solid #d6722d;font-weight:700;",
    scarce: "color:#1a1612;background-image:linear-gradient(180deg,#8a96a4 0%,#4a5360 100%);border:0.5px solid #5a6470;font-weight:600;",
  };
  const defaultChipStyle = "color:#ffd97a;background:rgba(212,175,92,0.06);border:0.5px solid #8a7548;";
  const auctionChipStyle = "color:#e6a86b;background:rgba(201,122,58,0.10);border:0.5px solid #c97a3a;";

  const chips: string[] = [];
  if (printRun && tier) {
    chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${TIER_CHIP_STYLES[tier]}margin-right:4px;">/${printRun}</span>`);
  }
  if (hasAuto) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">Auto</span>`);
  if (hasRookie) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">RC</span>`);
  if (psaMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">PSA ${psaMatch[1]}</span>`);
  if (bgsMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">BGS ${bgsMatch[1]}</span>`);
  if (sgcMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">SGC ${sgcMatch[1]}</span>`);
  if (cgcMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">CGC ${cgcMatch[1]}</span>`);
  if (l?.isAuction) {
    chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${auctionChipStyle}margin-right:4px;">Auction</span>`);
  } else if (l?.isBuyItNow) {
    chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">Buy It Now</span>`);
  }

  return `
    <tr><td style="padding-top:12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${rowBg}border-radius:0;">
        <tr>
          <td width="108" style="padding:16px 0 16px 18px;vertical-align:top;">
            ${upscaledImg
              ? `<img src="${escapeHtml(upscaledImg)}" width="96" height="128" style="border-radius:6px;display:block;background:#221d1a;object-fit:cover;" alt="">`
              : `<div style="width:96px;height:128px;border-radius:6px;background:#221d1a;"></div>`}
          </td>
          <td style="padding:16px 8px 16px 14px;vertical-align:top;">
            <div style="font-size:13px;color:#e8e2d5;line-height:1.4;margin-bottom:10px;">${escapeHtml(title)}</div>
            <div>${chips.join("")}</div>
          </td>
          <td width="110" style="padding:16px 18px 16px 8px;vertical-align:middle;text-align:right;">
            <div style="font-family:Georgia,serif;font-style:italic;font-size:30px;color:#d4af5c;line-height:1;margin-bottom:12px;">${escapeHtml(price)}</div>
            <a href="${escapeHtml(webUrl)}" style="display:inline-block;padding:7px 14px;background:transparent;border:0.5px solid rgba(212,175,92,0.5);color:#d4af5c;text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;border-radius:999px;">View</a>
          </td>
        </tr>
      </table>
    </td></tr>
  `;
}

// Detect print run from a listing title — looks for /N patterns, rejects
// years, dates, inventory counts, and two-digit seasons. Mirrors the logic on
// the home page (kept in sync manually — see backlog: consolidate the three
// copies of this logic once a shared module spanning Next.js + Deno exists).
function detectPrintRun(title: string): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  const titleLen = t.length || 1;

  const seasonAround = /(19|20)\d{2}[-/\s]\d{1,4}/;   // 4-digit season: 2023-24
  const dateAround = /\b\d{1,2}\/\d{1,4}\/\d{2,4}\b/;
  const inventoryAround = /\bnew\s+\d{1,2}\/\d{1,2}\b/;

  // Explicit forms where the captured group is the run.
  const explicit = [
    /#\s*\d*\s*\/\s*(\d{1,4})\b/g,                      // #/25, #5/25
    /(?:^|[^0-9a-z])\/\s*(\d{1,4})\b/g,                 // /25
    /\b\d+\s+of\s+(\d{1,4})\b/g,                        // 5 of 25
    /\b(?:numbered|limited|serial)\s+to\s+(\d{1,4})\b/g,
  ];
  for (const re of explicit) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const idx = m.index;
      const window = t.slice(Math.max(0, idx - 14), idx + m[0].length + 4);
      if (seasonAround.test(window) || dateAround.test(window) || inventoryAround.test(window)) continue;
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 999) return String(n);
    }
  }

  // Bare N/M — only count when N < M (real run), and reject two-digit seasons
  // (consecutive, 15–31, in the first 30% of the title).
  const reBare = /(?:^|[^0-9a-z])(?!0)(\d{1,4})\s*\/\s*(\d{1,4})\b/g;
  reBare.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = reBare.exec(t)) !== null) {
    const firstNum = parseInt(m[1], 10);
    const secondNum = parseInt(m[2], 10);
    const isOneOfOne = firstNum === 1 && secondNum === 1;
    if (firstNum >= secondNum && !isOneOfOne) continue;
    const idx = m.index;
    const window = t.slice(Math.max(0, idx - 14), idx + m[0].length + 4);
    if (seasonAround.test(window) || dateAround.test(window) || inventoryAround.test(window)) continue;
    const consecutive = secondNum === firstNum + 1;
    const inSeasonRange = firstNum >= 15 && firstNum <= 30 && secondNum >= 15 && secondNum <= 31;
    if (consecutive && inSeasonRange && idx / titleLen < 0.30) continue;
    if (secondNum >= 1 && secondNum <= 999) return String(secondNum);
  }
  return null;
}

function printRunTier(runValue: string): string {
  const n = parseInt(String(runValue).replace("/", ""), 10);
  if (isNaN(n)) return "scarce";
  if (n <= 25) return "grail";
  if (n <= 99) return "ultra";
  if (n <= 249) return "rare";
  return "scarce";
}

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
