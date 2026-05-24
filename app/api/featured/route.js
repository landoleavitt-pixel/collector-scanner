/**
 * GET /api/featured
 *
 * Returns one Grail-tier (print run ≤ 25) trading card from eBay's Browse API
 * to display in the homepage's "Featured Find" panel.
 *
 * Caching: results are cached server-side for 1 hour via Next.js fetch revalidation.
 * Every hour-or-so the featured card refreshes; in between, we serve cached.
 * This prevents hammering eBay's API on every page load while still showing
 * real, current listings.
 *
 * Athlete rotation: each cache window picks a different star athlete's name,
 * so even within the cache window users see variety across sessions.
 * Selection uses the current hour as a deterministic index — keeps cache stable
 * within the hour and rotates predictably across hours.
 */

// Athletes whose Grail-tier cards are likely to surface real, photogenic
// listings. Order doesn't matter — selection is by hour-of-day mod length.
const FEATURED_ATHLETES = [
  'Patrick Mahomes auto',
  'LeBron James auto',
  'Cooper Flagg auto',
  'Caitlin Clark auto',
  'Shohei Ohtani auto',
  'Victor Wembanyama auto',
  'Connor Bedard auto',
  'Mike Trout auto',
];

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

let cachedToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry - 60_000) {
    return cachedToken;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error('eBay credentials missing.');
  }

  const basic = Buffer.from(`${appId}:${certId}`).toString('base64');
  const res = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    // Don't cache the OAuth call — token has its own lifecycle.
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`eBay OAuth failed (${res.status})`);
  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = now + data.expires_in * 1000;
  return cachedToken;
}

/**
 * Detect a real print run in a card title. Mirrors the logic in page.js —
 * catches /N, #N/M, "numbered to N", etc., rejects season years and dates.
 *
 * Returns the numerator (the "total printed" number, e.g. 25 for /25), or
 * null if no real print run found.
 */
function detectPrintRun(title) {
  if (!title) return null;
  const t = title;

  // Pattern: "numbered to N" or "no. N"
  const numTo = t.match(/\bnumbered\s+to\s+(\d{1,4})\b/i);
  if (numTo) {
    const n = parseInt(numTo[1], 10);
    if (n >= 1 && n <= 9999) return n;
  }

  // Pattern: /N where N is the total (e.g. "/25", "/10", "/1")
  // Avoid year fragments like "/2024" by capping at 4 digits and rejecting
  // values that look like years (>= 1900).
  const slashMatches = [...t.matchAll(/(?:^|[^\d])\/(\d{1,4})(?!\d)/g)];
  for (const m of slashMatches) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 999) return n;
  }

  // Pattern: #N/M — return M
  const hashMatch = t.match(/#\s*\d{1,4}\s*\/\s*(\d{1,4})\b/);
  if (hashMatch) {
    const n = parseInt(hashMatch[1], 10);
    if (n >= 1 && n <= 999) return n;
  }

  return null;
}

export async function GET() {
  try {
    // Pick this hour's athlete deterministically. Hour-based rotation gives
    // ~24 distinct hourly windows across the rotation list. Combined with the
    // 1-hour cache below, this means: within any given hour, every request
    // gets the same featured card; the hour after, a different one.
    const hourIndex = Math.floor(Date.now() / (60 * 60 * 1000));
    const athlete = FEATURED_ATHLETES[hourIndex % FEATURED_ATHLETES.length];

    const token = await getAccessToken();

    // Search for the athlete with a generous price floor — Grail cards aren't
    // cheap, so anchoring price >= $200 helps surface high-value real listings.
    const params = new URLSearchParams({
      q: athlete,
      filter: 'price:[200..],priceCurrency:USD',
      sort: 'price desc',
      limit: '50',
    });

    const res = await fetch(`${EBAY_SEARCH_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
      // Server-side cache for 1 hour. Next.js handles the cache transparently.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return Response.json({ error: 'eBay request failed' }, { status: 502 });
    }

    const data = await res.json();
    const items = data.itemSummaries || [];

    // Find the first item whose title parses as Grail-tier (≤ 25)
    // and has a real image. We iterate in price-desc order, so the first
    // match is also the most expensive Grail card — the best showcase.
    let featured = null;
    for (const it of items) {
      const printRun = detectPrintRun(it.title);
      if (!printRun || printRun > 25) continue;
      if (!it.image?.imageUrl) continue;

      featured = {
        id: it.itemId,
        title: it.title,
        url: it.itemWebUrl,
        image: it.image.imageUrl,
        price: parseFloat(it.price?.value || '0'),
        currency: it.price?.currency || 'USD',
        printRun,
        // Detect auto + grade from title for badge display
        hasAuto: /\bauto\b|autograph|signed/i.test(it.title),
        psaGrade: it.title.match(/PSA\s*(\d{1,2})/i)?.[1] || null,
        bgsGrade: it.title.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || null,
        sgcGrade: it.title.match(/SGC\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || null,
        cgcGrade: it.title.match(/CGC\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || null,
      };
      break;
    }

    if (!featured) {
      // No Grail match found this hour — return null and let the frontend
      // render a graceful fallback.
      return Response.json({ featured: null });
    }

    return Response.json({ featured });
  } catch (err) {
    console.error('Featured fetch failed:', err);
    return Response.json({ error: 'Featured fetch failed' }, { status: 500 });
  }
}
