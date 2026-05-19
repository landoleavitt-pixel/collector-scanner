// app/api/search/route.js
//
// eBay Browse API integration.
// Uses the OAuth2 client-credentials flow to get an app token,
// then calls /buy/browse/v1/item_summary/search.
//
// Docs:
//   https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
//   https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html

import { NextResponse } from 'next/server';

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

// Cache the app token in memory across requests on the same serverless instance.
// Vercel spins down instances regularly, so this is a soft cache — we always
// re-fetch when it's missing or near expiry.
let cachedToken = null;
let cachedExpiry = 0;

async function getAppToken() {
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

// Build a keyword string and Browse-API filter string from our criteria.
function buildSearchParams(criteria) {
  const parts = [criteria.keywords?.trim() || ''];

  if (criteria.autoCards) parts.push('auto');
  if (criteria.rookieCards) {
    // eBay's Browse API supports OR via parentheses with comma separators.
    // Matches listings with "Rookie" OR "RC" OR "1st Bowman" in the title.
    parts.push('(Rookie, RC, "1st Bowman")');
  }
  if (criteria.numberedCards && criteria.numberedLimit) {
    // numberedLimit is like "/25". eBay search is keyword-based so we just
    // add it as a token — eBay's matching will pick it up in titles.
    parts.push(criteria.numberedLimit);
  }

  const q = parts.filter(Boolean).join(' ');

  const filters = [];
  if (criteria.priceMin != null || criteria.priceMax != null) {
    const min = criteria.priceMin ?? 0;
    const max = criteria.priceMax ?? '';
    filters.push(`price:[${min}..${max}],priceCurrency:USD`);
  }

  // Listing type filter — Buy It Now vs Auction.
  // eBay's buyingOptions values: FIXED_PRICE, AUCTION.
  if (criteria.listingType === 'buyItNow') {
    filters.push('buyingOptions:{FIXED_PRICE}');
  } else if (criteria.listingType === 'auction') {
    filters.push('buyingOptions:{AUCTION}');
  }

  // Trading cards category. 212 = Sports Mem, Cards & Fan Shop > Sports Trading Cards.
  // Leaving broad on purpose; users can narrow with keywords.
  const params = new URLSearchParams({
    q,
    limit: '50', // Fetch more so we have headroom after print-run verification
    category_ids: '212',
  });

  if (filters.length) params.set('filter', filters.join(','));

  const sortMap = {
    'price-low': 'price',
    'price-high': '-price',
    'newest': 'newlyListed',
  };
  if (sortMap[criteria.sortBy]) {
    params.set('sort', sortMap[criteria.sortBy]);
  }

  return params;
}

function normalizeItem(item) {
  return {
    id: item.itemId,
    title: item.title,
    price: parseFloat(item.price?.value ?? 0),
    currency: item.price?.currency ?? 'USD',
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
    url: item.itemWebUrl,
    condition: item.condition ?? 'Unknown',
    seller: item.seller?.username ?? null,
    sellerFeedback: item.seller?.feedbackPercentage ?? null,
    isAuction: item.buyingOptions?.includes('AUCTION') ?? false,
    isBuyItNow: item.buyingOptions?.includes('FIXED_PRICE') ?? false,
    bidCount: item.bidCount ?? null,
    endTime: item.itemEndDate ?? null,
  };
}

/**
 * Verify that a listing title actually indicates a rookie card.
 *
 * Matches:
 *   - "Rookie" (case-insensitive word)
 *   - "RC" as a standalone token (not inside other words like "arc" or "recreation")
 *   - "1st Bowman" — Bowman's rookie designation (very common in baseball)
 *
 * We use word-boundary regex so "arc" doesn't match "RC" and "rookies" still does.
 */
function verifyRookie(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  // "rookie" / "rookies"
  if (/\brookie/.test(t)) return true;
  // "RC" as a standalone token — surrounded by word boundaries and not part of other words
  if (/\brc\b/.test(t)) return true;
  // "1st Bowman" — common shorthand for a rookie's first Bowman appearance
  if (/\b1st\s+bowman\b/.test(t)) return true;
  return false;
}

/**
 * Verify that a listing title actually contains the given print run as a
 * print run — not as a season year, date, or card number.
 *
 * numberedLimit comes in as "/25" (with the slash).
 *
 * Returns true if the title contains a verified print run matching that value.
 *
 * False-positive patterns we must reject:
 *   - Season years: "2024-25", "2024/25", "2024 25"
 *   - Dates: "5/25/2024", "/25/24"
 *   - Card numbers: "Card #25", "Card 25 of 100"
 *   - Quantities: "lot of 25", "25 ct", "25 cards"
 *
 * Real print run patterns we must accept:
 *   - "/25" standalone (most common): "Mahomes Auto /25"
 *   - "# 5/25", "#5/25": "Mahomes Auto #5/25"
 *   - "5 of 25", "5/25": when preceded by no year context
 *   - "numbered to 25", "serial #d /25", "limited to 25"
 */
function verifyPrintRun(title, numberedLimit) {
  if (!title || !numberedLimit) return false;
  const num = numberedLimit.replace('/', '').trim(); // "25"
  if (!num) return false;

  const t = title.toLowerCase();
  const n = num;

  // Strategy: find every occurrence of the number in the title, then check
  // its context. If at least one occurrence is "print run" context, accept.

  // 1) Reject quickly if the only matches are clearly seasons or dates.
  // A "season year" is 4-digit year followed by "-NN" or "/NN" or " NN"
  // where NN is the number we're looking for as a 2-digit suffix.
  const seasonPattern = new RegExp(`(19|20)\\d{2}[-/\\s]${n}\\b`, 'g');
  const datePattern = new RegExp(`\\b\\d{1,2}/${n}/\\d{2,4}\\b|\\b${n}/\\d{1,2}/\\d{2,4}\\b`, 'g');

  // 2) Patterns that strongly indicate a real print run:
  //    "/25" standalone (with optional space), "# 5/25", "to 25", "of 25"
  //    "numbered 25", "limited 25", "ssp /25"
  const printRunPatterns = [
    new RegExp(`(?:^|[^0-9-/])/\\s*${n}(?![0-9])`),         // "/25" or "/ 25", not preceded by year
    new RegExp(`#\\s*\\d+\\s*/\\s*${n}(?![0-9])`),          // "#5/25"
    new RegExp(`\\b\\d+\\s+of\\s+${n}(?![0-9])`),           // "5 of 25" — require number before "of"
    new RegExp(`\\b(?:numbered|limited|serial)\\s+to\\s+${n}(?![0-9])`),  // "numbered to 25"
    new RegExp(`\\b(?:numbered|limited|serial|ssp|sp)\\s+${n}(?![0-9])`),
    new RegExp(`\\bd/\\s*${n}(?![0-9])`),                   // "/d/25" (eBay seller shorthand for "numbered /25")
  ];

  // 3) Find all matches of patterns and confirm at least one is NOT inside a season/date context.
  for (const re of printRunPatterns) {
    const m = t.match(re);
    if (!m) continue;
    // Check that this match isn't sitting inside a season-year pattern.
    // We re-scan around the match index.
    const idx = t.search(re);
    const window = t.slice(Math.max(0, idx - 5), idx + m[0].length + 3);
    // If the window contains a year-NN pattern that includes our match, skip.
    if (seasonPattern.test(window)) {
      seasonPattern.lastIndex = 0; // reset
      continue;
    }
    if (datePattern.test(window)) {
      datePattern.lastIndex = 0;
      continue;
    }
    return true;
  }
  return false;
}

export async function POST(req) {
  try {
    const criteria = await req.json();

    if (!criteria.keywords || !criteria.keywords.trim()) {
      return NextResponse.json(
        { error: 'Please enter a search term.' },
        { status: 400 },
      );
    }

    const token = await getAppToken();
    const params = buildSearchParams(criteria);

    const url = `${EBAY_SEARCH_URL}?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `eBay search failed (${res.status}).`, details: text },
        { status: res.status },
      );
    }

    const data = await res.json();
    let items = (data.itemSummaries ?? []).map(normalizeItem);

    // If a print run filter is active, verify each title to remove false
    // positives (years like "2024-25", card numbers, dates, quantities).
    if (criteria.numberedCards && criteria.numberedLimit) {
      const before = items.length;
      items = items.filter((it) => verifyPrintRun(it.title, criteria.numberedLimit));
      console.log(
        `Print run verify: ${before} → ${items.length} (filter: ${criteria.numberedLimit})`,
      );
    }

    // If rookie filter is active, verify each title contains rookie/RC/1st Bowman.
    // This protects against eBay's broader keyword matching returning non-rookie cards.
    if (criteria.rookieCards) {
      const before = items.length;
      items = items.filter((it) => verifyRookie(it.title));
      console.log(`Rookie verify: ${before} → ${items.length}`);
    }

    return NextResponse.json({
      items,
      total: data.total ?? items.length,
    });
  } catch (err) {
    console.error('Search route error:', err);
    return NextResponse.json(
      { error: err.message || 'Unexpected server error.' },
      { status: 500 },
    );
  }
}
