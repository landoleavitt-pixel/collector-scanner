// app/api/tcg-family-search/route.js
//
// GET /api/tcg-family-search: live eBay listings for every version of one
// card, each with a "why it matched" label (lib/tcg/familySearch.js).
//
// Query string:
//   game        mtg | pokemon (required)
//   card        card key or exact name, as from /api/tcg-versions; or
//   cards       a family: card keys, comma-separated (up to 100), each listing
//               matched to the card it fits best (items then carry cardKey)
//   q           what to search eBay for (the family name); default: the first card's name
//   versions    version keys to keep, comma-separated (empty = every version)
//   lang        all | en,ja,other
//   unsure      show | hide: listings we can't pin to a version (version not
//               in title, non-English copies, unconfirmed promos). Default:
//               show when no versions are picked, hide when some are.
//   graded      any | graded | raw     priceMin, priceMax (100000 = no max)
//   listing     any | auction | bin
//   sort        rarest | newest | ending | price_asc | price_desc
//   offset, limit (default 48, max 1000)    proxies=show
//
// Returns { card, query, items, total, offset, nextOffset, kinds, counts,
//   printingCounts, ebayTotal, capped }. Items are /api/tcg-search items plus
//   match: { kind: exact|set|language|promo|unknown, why, versions }.
//   counts: listings per version key (only listings that are exactly one
//   version); printingCounts: per "set:number".
//
// One eBay call per search, cached 15 minutes; same rate limit as
// /api/tcg-search, which the signed alert checker skips.

import { NextResponse } from 'next/server';
import { isTrustedPoller } from '../../../lib/pollerAuth';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';
import { readFamilyCriteria, searchFamily } from '../../../lib/tcg/familySearch';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(req) {
  const rate = isTrustedPoller(req)
    ? { allowed: true }
    : rateLimit({ bucket: 'tcg-search', key: getClientIp(req), limit: 20, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Please slow down and try again in a moment.', retryAfter: rate.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), ...noStore } },
    );
  }

  const criteria = readFamilyCriteria(new URL(req.url).searchParams);
  if (!criteria.game) return NextResponse.json({ error: 'game must be mtg or pokemon' }, { status: 400, headers: noStore });
  if (!criteria.card) return NextResponse.json({ error: 'Card not found' }, { status: 404, headers: noStore });

  try {
    const body = await searchFamily(criteria);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' } });
  } catch (err) {
    console.error('TCG family search route error:', err);
    return NextResponse.json({ error: 'Search is temporarily unavailable. Please try again.' }, { status: 500, headers: noStore });
  }
}
