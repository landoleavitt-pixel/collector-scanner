// app/api/listing/[id]/route.js
//
// GET /api/listing/<itemId>
//
// Returns the full image set + extended metadata for a single eBay
// listing. Used by CardModal to populate the image carousel when a card
// is opened — the search endpoint only returns the primary thumbnail,
// so we hit eBay's item detail endpoint for the rest.
//
// Response shape:
//   { ok: true, images: [string, ...], title, price, currency }
//   { ok: false, expired: true }  — listing not found / 404 from eBay
//   { ok: false, error: '...' }   — other error
//
// Rate limiting: same in-memory bucket as /api/search would be ideal,
// but keeping it simple for now — relying on the upstream search
// rate limit since users have to search before opening a modal.
//
// Caching: eBay item detail rarely changes mid-listing; cache 5 min
// at the edge so refreshing the modal doesn't re-hit eBay.

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_ITEM_URL  = 'https://api.ebay.com/buy/browse/v1/item';

// Small module-scoped token cache — same pattern as /api/featured.
// Tokens last 2 hours; we refresh slightly early to avoid the cliff.
let cachedToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry - 60_000) return cachedToken;

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) throw new Error('eBay credentials missing.');

  const basic = Buffer.from(`${appId}:${certId}`).toString('base64');
  const res = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`eBay OAuth failed (${res.status})`);
  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = now + data.expires_in * 1000;
  return cachedToken;
}

/**
 * Upscale an eBay image URL to /s-l1600 so the magnifier reveals real
 * detail. Safe no-op for non-eBay URLs.
 */
function upscaleImage(url) {
  if (!url) return url;
  return url.replace(/\/s-l\d+\.(\w+)/, '/s-l1600.$1');
}

export async function GET(_request, { params }) {
  const { id } = params;
  if (!id) {
    return Response.json({ ok: false, error: 'Missing listing id' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();

    const res = await fetch(`${EBAY_ITEM_URL}/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
      // 5 minute edge cache — listings rarely change mid-flight, and the
      // user already searched recently so freshness isn't critical.
      next: { revalidate: 300 },
    });

    // eBay returns 404 when a listing has ended or been removed. The
    // modal renders a graceful "this listing has ended" state in that case.
    if (res.status === 404) {
      return Response.json({ ok: false, expired: true }, { status: 200 });
    }
    if (!res.ok) {
      return Response.json({ ok: false, error: `eBay ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    // Build the image array. Primary image first, then any additional
    // images. Filter out duplicates (eBay sometimes repeats the primary
    // in additionalImages) and any null/empty entries.
    const seen = new Set();
    const images = [];
    const push = (u) => {
      if (!u) return;
      const big = upscaleImage(u);
      if (seen.has(big)) return;
      seen.add(big);
      images.push(big);
    };
    push(data.image?.imageUrl);
    (data.additionalImages || []).forEach((im) => push(im?.imageUrl));

    return Response.json({
      ok: true,
      images,
      title: data.title,
      price: data.price?.value ? parseFloat(data.price.value) : null,
      currency: data.price?.currency || 'USD',
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
