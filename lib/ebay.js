// lib/ebay.js
//
// Shared eBay Browse API helpers: the app token (OAuth2 client-credentials
// flow) and one item_summary/search call. Used by /api/search and
// /api/tcg-search.
//
// Docs:
//   https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
//   https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
export const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

// Cache the app token in memory across requests on the same serverless instance.
// Vercel spins down instances regularly, so this is a soft cache — we always
// re-fetch when it's missing or near expiry.
let cachedToken = null;
let cachedExpiry = 0;

export async function getAppToken() {
  const now = Date.now();
  // 60-second safety buffer
  if (cachedToken && now < cachedExpiry - 60_000) {
    return cachedToken;
  }

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

// One page of item_summary/search. `params` is a URLSearchParams. Returns
// eBay's JSON; throws on a non-OK response.
export async function browseSearch(params, token) {
  const res = await fetch(`${EBAY_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay search failed (${res.status}): ${text}`);
  }

  return res.json();
}
