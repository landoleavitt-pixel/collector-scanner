import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_RATE_LIMIT_URL = 'https://api.ebay.com/developer/analytics/v1_beta/rate_limit/';

// Module-scoped token cache — separate from the search route's cache because
// Next.js module instances don't share state across routes.
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

// Comma-separated list of admin Supabase user UUIDs in env. Only these can hit
// the route — everyone else gets a 403. Easier than building roles for one
// solo founder; trivially extensible later.
function isAdminUser(userId) {
  if (!userId) return false;
  const list = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!isAdminUser(user.id)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let token;
  try {
    token = await getAppToken();
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Filter to the buy context — that's where Browse API lives, which is the
  // only one Fields & Floors uses. Saves us parsing the dozens of sell/
  // commerce/identity entries we don't care about.
  const url = `${EBAY_RATE_LIMIT_URL}?api_context=buy`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `eBay request failed: ${e.message}` }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `eBay returned ${res.status}`, body: text.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    return NextResponse.json({ error: 'eBay returned non-JSON' }, { status: 502 });
  }

  // Flatten the response into something easy to render. eBay's shape is
  // nested: rateLimits[].resources[].rates[] — we surface only the daily
  // window (timeWindow === 86400) per resource because that's the cap.
  const summary = [];
  const rateLimits = Array.isArray(data.rateLimits) ? data.rateLimits : [];
  for (const block of rateLimits) {
    const apiName = block.apiName || 'unknown';
    const resources = Array.isArray(block.resources) ? block.resources : [];
    for (const resource of resources) {
      const rates = Array.isArray(resource.rates) ? resource.rates : [];
      for (const rate of rates) {
        if (rate.timeWindow === 86400) {
          summary.push({
            apiName,
            resource: resource.name,
            limit: rate.limit,
            remaining: rate.remaining,
            used: (rate.limit ?? 0) - (rate.remaining ?? 0),
            reset: rate.reset,
            timeWindow: rate.timeWindow,
          });
        }
      }
    }
  }

  // Sort by used descending so the highest-burn endpoints surface first.
  summary.sort((a, b) => (b.used ?? 0) - (a.used ?? 0));

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    summary,
    raw: data, // full response for debugging if needed
  });
}
