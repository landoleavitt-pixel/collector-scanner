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

/**
 * If the user's input looks like a multi-word name, expand to an OR query
 * that catches both standard and comma-flipped formats.
 *
 *   "Chase Roberts"   → ("Chase Roberts", "Roberts, Chase")
 *   "Mahomes"          → "Mahomes"  (single word, no expansion)
 *   "rookie auto"      → "rookie auto"  (looks like keywords not a name)
 *
 * Heuristic: treat as a name if input is exactly 2 alphabetic words.
 * This catches "Chase Roberts", "Patrick Mahomes", "AJ Dybantsa" while
 * leaving keyword searches like "rookie auto" alone.
 */
function expandNameQuery(input) {
  if (!input) return '';
  const trimmed = input.trim();
  // Match exactly two words containing only letters / apostrophes / hyphens
  const nameMatch = trimmed.match(/^([A-Za-z][A-Za-z'\-]+)\s+([A-Za-z][A-Za-z'\-]+)$/);
  if (!nameMatch) {
    // Not a 2-word name — return as-is but quoted if multi-word to keep eBay strict.
    if (/\s/.test(trimmed)) {
      return `"${trimmed}"`;
    }
    return trimmed;
  }
  const first = nameMatch[1];
  const last = nameMatch[2];
  // Only expand as a name if at least one word starts with a capital letter
  // (signaling a proper noun). This avoids treating generic terms like
  // "rookie auto" or "prizm refractor" as names.
  const looksLikeName = /^[A-Z]/.test(first) || /^[A-Z]/.test(last);
  if (!looksLikeName) {
    return `"${trimmed}"`;
  }
  return `("${first} ${last}", "${last}, ${first}")`;
}

// Build a keyword string and Browse-API filter string from our criteria.
function buildSearchParams(criteria) {
  const expandedKeywords = expandNameQuery(criteria.keywords);
  const parts = [expandedKeywords];

  if (criteria.autoCards) parts.push('auto');
  if (criteria.rookieCards) {
    // eBay's Browse API supports OR via parentheses with comma separators.
    // Matches listings with "Rookie" OR "RC" OR "1st Bowman" in the title.
    parts.push('(Rookie, RC, "1st Bowman")');
  }
  if (criteria.numberedCards && Array.isArray(criteria.selectedPrintRuns) && criteria.selectedPrintRuns.length > 0) {
    // Multi-select: send all selected print runs as an eBay OR query.
    // e.g. ["/25", "/99"] → ("/25", "/99")
    // If only one run, send it directly (no parens needed).
    const runs = criteria.selectedPrintRuns;
    if (runs.length === 1) {
      parts.push(runs[0]);
    } else {
      parts.push('(' + runs.map((r) => `"${r}"`).join(', ') + ')');
    }
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
/**
 * Check if a title contains ANY valid print run pattern.
 * Used when "Numbered" toggle is on but no specific runs are selected.
 * Returns true if the title has a real print run (not a year/date/inventory).
 */
function hasAnyPrintRun(title) {
  if (!title) return false;
  const t = title.toLowerCase();

  // Same false-positive patterns as verifyPrintRun, but matched generically
  const seasonAround = /(19|20)\d{2}[-/\s]\d{1,4}/;
  const dateAround = /\b\d{1,2}\/\d{1,4}\/\d{2,4}\b/;
  const inventoryAround = /\bnew\s+\d{1,2}\/\d{1,2}\b/;

  const patterns = [
    /(?:^|[^0-9a-z])\/\s*(\d{1,4})\b/g,        // /N
    /#\s*\d+\s*\/\s*(\d{1,4})\b/g,             // #5/25
    /\b\d+\s+of\s+(\d{1,4})\b/g,                // 5 of 25
    /\b(?:numbered|limited|serial)\s+to\s+(\d{1,4})\b/g,
    /\b(?:numbered|limited|serial|ssp|sp)\s+(\d{1,4})\b/g,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      const idx = m.index;
      const window = t.slice(Math.max(0, idx - 14), idx + m[0].length + 4);
      if (seasonAround.test(window)) continue;
      if (dateAround.test(window)) continue;
      if (inventoryAround.test(window)) continue;
      return true;
    }
  }
  return false;
}

function verifyPrintRun(title, numberedLimit) {
  if (!title || !numberedLimit) return false;
  const num = numberedLimit.replace('/', '').trim(); // "25"
  if (!num) return false;

  const t = title.toLowerCase();
  const n = num;

  // Strategy: find every occurrence of the number in the title, then check
  // its context. If at least one occurrence is "print run" context, accept.

  // 1) False-positive contexts we want to reject.
  // Season years: "2024-25", "2024/25", "2024 25"
  const seasonPattern = new RegExp(`(19|20)\\d{2}[-/\\s]${n}\\b`, 'g');
  // Dates: "5/25/2024", "25/05/24"
  const datePattern = new RegExp(`\\b\\d{1,2}/${n}/\\d{2,4}\\b|\\b${n}/\\d{1,2}/\\d{2,4}\\b`, 'g');
  // Inventory counts: "+New 12/12", "+NEW 2/02", "(+New 02/11)" — sellers
  // signal "X of Y items remaining". Strong indicator: "new" precedes the slash pair.
  // Also: 2-digit zero-padded numbers (02, 03, 09) are almost never print runs.
  const inventoryPattern = new RegExp(`\\bnew\\s+\\d{1,2}/${n}\\b|\\bnew\\s+${n}/\\d{1,2}\\b`, 'g');
  // Zero-padded reject: if the user filter is /25 but the title has /02 or /09,
  // those leading zeros mean this is sequential numbering, not print run.
  // Catch /0N (where N is 1 digit) explicitly.
  const isZeroPadded = /^0\d$/.test(n); // user filter looks like "02" — unusual, won't try to match

  // 2) Patterns that strongly indicate a real print run.
  // Note: we REJECT matches where the preceding char suggests "X/Y" inventory
  // by requiring the slash isn't immediately preceded by a small number
  // unless that number+slash form a "#5/25" hash-prefixed pattern.
  const printRunPatterns = [
    // "/25" or "/ 25" — but NOT preceded by digits (which would be inventory like "12/25")
    new RegExp(`(?:^|[^0-9a-z-])/\\s*${n}(?![0-9])`),
    // "#5/25" — explicit hash-prefixed serial number
    new RegExp(`#\\s*\\d+\\s*/\\s*${n}(?![0-9])`),
    // "5 of 25" — number space "of" space number
    new RegExp(`\\b\\d+\\s+of\\s+${n}(?![0-9])`),
    // "numbered to 25" / "limited to 25" / "serial to 25"
    new RegExp(`\\b(?:numbered|limited|serial)\\s+to\\s+${n}(?![0-9])`),
    // "numbered 25", "ssp 25", "sp 25"
    new RegExp(`\\b(?:numbered|limited|serial|ssp|sp)\\s+${n}(?![0-9])`),
    // "/d/25" — eBay seller shorthand for "numbered /25"
    new RegExp(`\\bd/\\s*${n}(?![0-9])`),
  ];

  // 3) Find all matches of patterns and confirm at least one is NOT inside a
  //    season/date/inventory context.
  for (const re of printRunPatterns) {
    const m = t.match(re);
    if (!m) continue;
    const idx = t.search(re);
    const window = t.slice(Math.max(0, idx - 12), idx + m[0].length + 4);

    // Reject if the match is inside any false-positive context window.
    if (seasonPattern.test(window)) { seasonPattern.lastIndex = 0; continue; }
    if (datePattern.test(window)) { datePattern.lastIndex = 0; continue; }
    if (inventoryPattern.test(window)) { inventoryPattern.lastIndex = 0; continue; }

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

    // If a print run filter is active with specific runs selected, verify each
    // title contains at least one of them (false-positive protection against
    // years like "2024-25", inventory counts, dates).
    if (criteria.numberedCards && Array.isArray(criteria.selectedPrintRuns) && criteria.selectedPrintRuns.length > 0) {
      const before = items.length;
      const runs = criteria.selectedPrintRuns;
      items = items.filter((it) => runs.some((run) => verifyPrintRun(it.title, run)));
      console.log(
        `Print run verify: ${before} → ${items.length} (${runs.length} runs selected)`,
      );
    } else if (criteria.numberedCards) {
      // "Numbered" toggle is on but no specific runs selected — accept any title
      // that contains a valid print run pattern at all.
      const before = items.length;
      items = items.filter((it) => hasAnyPrintRun(it.title));
      console.log(`Any print run verify: ${before} → ${items.length}`);
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
