// app/api/owned/sets/route.js
//
// GET /api/owned/sets?game=pokemon   the signed-in member's owned versions per
// set, for the set list's "You have 40 of 102" (the total is `versions` from
// /api/tcg-lists?game=…&sets=1).
//   → { game, sets: { <set code>: <versions owned> } }
// Private: owned_cards row-level security limits the read to the member's own
// rows. Version keys start with the set code ("swsh7:215:h", "LOB:EN001:…").

import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { CATALOG_GAMES } from '../../../../lib/tcg/catalog';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  const game = new URL(request.url).searchParams.get('game');
  if (!CATALOG_GAMES.includes(game)) return NextResponse.json({ error: `game must be one of ${CATALOG_GAMES.join(', ')}` }, { status: 400, headers: noStore });
  const { data, error } = await supabase.from('owned_cards').select('version_key').eq('side', 'fables').eq('game', game).limit(20000);
  if (error) return NextResponse.json({ game, sets: {} }, { headers: noStore }); // table not there yet
  const sets = {};
  for (const { version_key: v } of data || []) {
    const code = String(v).split(':')[0];
    sets[code] = (sets[code] || 0) + 1;
  }
  return NextResponse.json({ game, sets }, { headers: noStore });
}
