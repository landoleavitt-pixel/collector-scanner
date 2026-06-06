import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// eBay endpoints (same as the search route)
const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_ITEM_URL = 'https://api.ebay.com/buy/browse/v1/item';
// getItem: GET {EBAY_ITEM_URL}?item_id=v1|123|0

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
async function checkItemStatus(listingId, token) {
  const url = `${EBAY_ITEM_URL}?item_id=${encodeURIComponent(listingId)}`;

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
    return { status: 'active', price: null }; // network error → leave as-is
  }

  // 404 = listing gone (ended or sold). This is eBay's normal signal for it.
  if (res.status === 404) {
    return { status: 'ended', price: null };
  }
  // Other non-OK (5xx, 429, auth) → transient; don't assume ended.
  if (!res.ok) {
    return { status: 'active', price: null };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { status: 'active', price: null };
  }

  const avail = data?.estimatedAvailabilities?.[0]?.estimatedAvailabilityStatus;
  // Auctions carry the live high bid in currentBidPrice; fixed-price in price.
  const rawPrice = data?.currentBidPrice?.value ?? data?.price?.value;
  const price = rawPrice != null ? Number(rawPrice) : null;

  // Explicit out-of-stock is also an "ended" signal.
  if (avail === 'OUT_OF_STOCK') {
    return { status: 'ended', price };
  }
  return { status: 'active', price };
}

// POST — re-check all of the user's ACTIVE watched listings against eBay,
// update any that have ended/sold, and return the updated set.
// Called when the user opens the Watchlist page (no scheduled job).
export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: active, error } = await supabase
    .from('watched_listings')
    .select('id, listing_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!active || active.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0 });
  }

  let token;
  try {
    token = await getAppToken();
  } catch (e) {
    // If eBay is unreachable, don't fail the page — just report nothing updated.
    return NextResponse.json({ checked: 0, updated: 0, error: e.message });
  }

  let updated = 0;
  const now = new Date().toISOString();

  // Check sequentially-ish but cap concurrency to be gentle on the API.
  // Watchlists are small, so a simple loop is fine.
  for (const row of active) {
    try {
      const { status, price } = await checkItemStatus(row.listing_id, token);

      const patch = { last_checked: now };
      if (status === 'ended') {
        patch.status = 'ended';
        patch.sold_at = now;
        updated++;
      } else if (status === 'active' && price != null) {
        patch.price = price; // keep price fresh
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

  return NextResponse.json({ checked: active.length, updated });
}
