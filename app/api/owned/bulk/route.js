// app/api/owned/bulk/route.js
//
// POST /api/owned/bulk   "I have all of these" (and its undo), in one call.
//   { side: 'fables', game, on: true|false, marks: [{ card, version }] }
//   or { side, game, on, card }   every version of a card
//   or { side, game, on, set }    every version printed in a set
//   → { changed, marks: [{ card, version }] }
// on:true marks them owned (a count of 1, or kept if already higher);
// on:false is the undo: send the same body. At most 2,000 versions a call.
//
// Private: owned_cards row-level security limits every write to the
// signed-in member's own rows.

import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { rateLimit } from '../../../../lib/rateLimit';
import { bulkMarks } from '../../../../lib/tcg/bulkOwned';

const noStore = { 'Cache-Control': 'no-store' };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: noStore });

export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  if (!rateLimit({ bucket: 'owned-bulk', key: user.id, limit: 20, windowMs: 60_000 }).allowed) return json({ error: 'Too many requests. Try again in a moment.' }, 429);

  const body = await request.json().catch(() => ({}));
  const side = body.side ?? 'fables';
  if (side !== 'fables') return json({ error: 'side must be fables' }, 400);
  if (typeof body.on !== 'boolean') return json({ error: 'on must be true or false' }, 400);
  const r = bulkMarks(body);
  if (r.error) return json({ error: r.error }, 400);

  if (body.on) {
    // Keep higher counts: only add the versions not marked yet.
    const { data: have, error: readErr } = await supabase.from('owned_cards').select('card_key, version_key')
      .eq('side', side).eq('game', r.game).in('card_key', [...new Set(r.marks.map((m) => m.card))]);
    if (readErr) return json({ error: readErr.message }, 500);
    const already = new Set((have || []).map((x) => `${x.card_key}|${x.version_key}`));
    const rows = r.marks.filter((m) => !already.has(`${m.card}|${m.version}`))
      .map((m) => ({ user_id: user.id, side, game: r.game, card_key: m.card, version_key: m.version, qty: 1, updated_at: new Date().toISOString() }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('owned_cards').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,side,game,card_key,version_key', ignoreDuplicates: true });
      if (error) return json({ error: error.message }, 500);
    }
    return json({ changed: rows.length, marks: r.marks });
  }

  let changed = 0;
  const byCard = new Map();
  for (const m of r.marks) (byCard.get(m.card) || byCard.set(m.card, []).get(m.card)).push(m.version);
  for (const [card, versions] of byCard) {
    for (let i = 0; i < versions.length; i += 500) {
      const { data, error } = await supabase.from('owned_cards').delete()
        .eq('side', side).eq('game', r.game).eq('card_key', card).in('version_key', versions.slice(i, i + 500)).select('id');
      if (error) return json({ error: error.message }, 500);
      changed += data?.length || 0;
    }
  }
  return json({ changed, marks: r.marks });
}
