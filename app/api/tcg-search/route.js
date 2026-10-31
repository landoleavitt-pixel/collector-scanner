// app/api/tcg-search/route.js
//
// GET /api/tcg-search: the Foils & Fables card-game search (lib/tcg/search.js).
//
// Query string (all optional):
//   q           card or character name
//   game        pokemon,mtg,yugioh,onepiece,lorcana (one, several, or all/empty)
//   rarity      ladder keys, "sir" or "pokemon:sir", comma-separated
//   lang        all | en,ja,other (comma-separated; default all)
//   graded      any | graded | raw
//   grader      PSA,CGC,BGS,TAG,SGC        grade  10,9.5,…
//   firstEd=1   serialOnly=1
//   priceMin, priceMax (100000 = no max)
//   listing     any | auction | bin
//   sort        rarest | ending | newest | price_asc (price-low) | price_desc (price-high)
//   offset      paging start; limit  page size (default 48, max 1000)
//   proxies=show, lots=show   (both hidden by default)
//
// Returns { items, total, offset, nextOffset, ebayTotal, capped }.
//
// Same per-visitor limit as /api/search (20 a minute), which the signed
// alert checker skips (lib/pollerAuth.js).

import { NextResponse } from 'next/server';
import { isTrustedPoller } from '../../../lib/pollerAuth';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';
import { readCriteria, searchTcg } from '../../../lib/tcg/search';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const rate = isTrustedPoller(req)
    ? { allowed: true }
    : rateLimit({ bucket: 'tcg-search', key: getClientIp(req), limit: 20, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Please slow down and try again in a moment.', retryAfter: rate.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const criteria = readCriteria(new URL(req.url).searchParams);
    const body = await searchTcg(criteria);
    return NextResponse.json(body, {
      // Same query within 5 minutes is served by the CDN without touching eBay.
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('TCG search route error:', err);
    return NextResponse.json(
      { error: 'Search is temporarily unavailable. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
