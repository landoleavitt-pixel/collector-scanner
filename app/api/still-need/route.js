// app/api/still-need/route.js
//
// GET /api/still-need: the signed-in member's started card families and the
// versions they still need, with for-sale counts and photos (lib/tcg/stillNeed.js).
//
//   ?limit=4 (up to 8 families per call)  &offset=0
//   → { families: [{ game, name, versions, owned, missing, missingForSale,
//         rows: [{ card, cardName, set, setName, number, version, label,
//                  rarity, rarityGroup, forSale, photo }], capped, searchFailed }],
//       total, offset, nextOffset, more: [{ game, name }] }
//
// Private: reads only the member's own owned_cards and saved_searches rows
// (row-level security). Each family costs one family search, shared with the
// card list's 15-minute cache. Rate limited per account.

import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { rateLimit } from '../../../lib/rateLimit';
import { stillNeed, STILL_NEED_DEFAULT } from '../../../lib/tcg/stillNeed';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(req) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  const rate = rateLimit({ bucket: 'still-need', key: user.id, limit: 10, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a moment.' }, { status: 429, headers: { ...noStore, 'Retry-After': String(rate.retryAfterSec) } });

  const p = new URL(req.url).searchParams;
  const [owned, searches] = await Promise.all([
    supabase.from('owned_cards').select('game, card_key, version_key, updated_at').eq('side', 'fables').limit(5000),
    supabase.from('saved_searches').select('filters, query, created_at').eq('side', 'fables').limit(200),
  ]);
  // No owned_cards table yet (migration not run): treat as nothing owned.
  const body = await stillNeed({
    owned: owned.error ? [] : owned.data || [],
    searches: searches.error ? [] : searches.data || [],
    offset: Math.max(0, parseInt(p.get('offset'), 10) || 0),
    limit: parseInt(p.get('limit'), 10) || STILL_NEED_DEFAULT,
  });
  return NextResponse.json(body, { headers: noStore });
}
