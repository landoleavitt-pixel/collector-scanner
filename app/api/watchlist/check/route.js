import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// eBay endpoints (same as the search route)
const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_ITEM_URL = 'https://api.ebay.com/buy/browse/v1/item';
// getItem: GET {EBAY_ITEM_URL}/{itemId}?fieldgroups=COMPACT — itemId is in
// the path (not a query param). COMPACT reliably returns bidCount,
// currentBidPrice, and itemEndDate for auctions.

let cachedToken = null;
let cachedExpiry = 0;

async function getAppToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry - 60_000) return cachedToken;

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error('eBay credentials missing. Set EBAY_APP_ID and EBAY_CERT_ID.');
  }

  const basic = Buffer.from(`${appId}:${certId}`).toString('base64');
  const res = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = now + data.expires_in * 1000;
  return cachedToken;
}

// Check a single eBay item's current status using the modern Browse API
// getItem endpoint (accepts the v1|...|0 item ID format that item_summary
// search returns).
//
// Sold/ended detection: eBay's getItem returns HTTP 404 when a listing is no
// longer available (ended or sold). We treat 404 as "ended". We still leave the
// card active on genuine transport failures (network error, 5xx, rate-limit) so
// a temporary eBay hiccup never marks a live card as sold.
// Hit eBay's getItem (COMPACT) and return a discriminated result.
//   { state: 'ended' }     — 404 or OUT_OF_STOCK; listing is gone.
//   { state: 'active', … } — eBay responded with usable data.
//   { state: 'transient' } — network blip, 5xx, rate-limit, or unparseable
//                            response. Caller MUST skip these rows entirely
//                            (don't even bump last_checked) so the next call
//                            retries instead of being locked out by the
//                            10-minute throttle.
async function checkItemStatus(listingId, token) {
  const url = `${EBAY_ITEM_URL}/${encodeURIComponent(listingId)}?fieldgroups=COMPACT`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return { state: 'transient' };
  }

  if (res.status === 404) return { state: 'ended' };
  if (!res.ok) return { state: 'transient' };

  let data;
  try {
    data = await res.json();
  } catch {
    return { state: 'transient' };
  }

  const avail = data?.estimatedAvailabilities?.[0]?.estimatedAvailabilityStatus;
  const rawPrice = data?.currentBidPrice?.value ?? data?.price?.value;
  const price = rawPrice != null ? Number(rawPrice) : null;
  const bidCount = data?.bidCount != null ? Number(data.bidCount) : null;
  const endTime = data?.itemEndDate ?? null;

  if (avail === 'OUT_OF_STOCK') return { state: 'ended' };
  return { state: 'active', price, bidCount, endTime };
}

// POST — re-check the user's ACTIVE watched listings against eBay, update
// any that have ended/sold, and refresh live price + bid count. Called when
// the user opens the Watchlist page.
//
// Per-row throttle (10 min): skip rows the background poller (or a recent
// page-load) already checked. Keeps a reload-spammer from draining quota,
// and avoids stepping on the hourly poller's work.
const PAGE_CHECK_THROTTLE_MS = 10 * 60 * 1000;

export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: active, error } = await supabase
    .from('watched_listings')
    .select('id, listing_id, last_checked')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!active || active.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0, skipped: 0 });
  }

  const nowMs = Date.now();
  const stale = active.filter((row) => {
    if (!row.last_checked) return true;
    const last = new Date(row.last_checked).getTime();
    if (isNaN(last)) return true;
    return nowMs - last >= PAGE_CHECK_THROTTLE_MS;
  });
  const skipped = active.length - stale.length;

  if (stale.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0, skipped });
  }

  let token;
  try {
    token = await getAppToken();
  } catch (e) {
    // If eBay is unreachable, don't fail the page — just report nothing updated.
    return NextResponse.json({ checked: 0, updated: 0, skipped, error: e.message });
  }

  let updated = 0;
  const now = new Date().toISOString();

  for (const row of stale) {
    try {
      const snap = await checkItemStatus(row.listing_id, token);
      // Transient failure: don't update anything (including last_checked) so
      // the next call retries this row instead of skipping it for 10 min.
      if (snap.state === 'transient') continue;

      const patch = { last_checked: now };
      if (snap.state === 'ended') {
        patch.status = 'ended';
        patch.sold_at = now;
        updated++;
        // keep last-known price / bid_count so the tile reads
        // "Ended · last bid $X · N bids"
      } else {
        // active — only write fields eBay actually returned
        if (snap.price != null) patch.price = snap.price;
        if (snap.bidCount != null) patch.bid_count = snap.bidCount;
        if (snap.endTime) patch.end_time = snap.endTime;
      }

      await supabase
        .from('watched_listings')
        .update(patch)
        .eq('id', row.id)
        .eq('user_id', user.id);
    } catch {
      // Ignore individual failures; leave that card as-is for next time.
    }
  }

  return NextResponse.json({ checked: stale.length, updated, skipped });
}
