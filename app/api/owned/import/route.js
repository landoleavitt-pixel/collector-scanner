// app/api/owned/import/route.js
//
// POST /api/owned/import   "Import a CSV file"
//   { csv: "<the file's text>", game?: 'pokemon'|'mtg'|'yugioh'|'lorcana', save: false|true }
//   save:false → { matched: [{ game, card, cardName, version, label, qty }], unmatched:
//                  [{ line, name, set, number, reason }], total, cut }   a preview, nothing saved
//   save:true  → the same, plus { saved }: the matched rows become "I own this" marks
//                (counts are raised to the file's count, never lowered)
//
// Privacy: the file's text is read in memory, matched and dropped. It's never
// stored, and rows, names and counts are never logged. The marks are private
// (owned_cards row-level security). We never ask for another app's password.
// Limits: 5 MB and 1,000 rows per file; 10 imports a minute per account.

import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { rateLimit } from '../../../../lib/rateLimit';
import { importRows, IMPORT_MAX_BYTES } from '../../../../lib/tcg/csvImport';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: noStore });

export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  if (!rateLimit({ bucket: 'owned-import', key: user.id, limit: 10, windowMs: 60_000 }).allowed) return json({ error: 'Too many imports. Try again in a minute.' }, 429);
  if (Number(request.headers.get('content-length') || 0) > IMPORT_MAX_BYTES + 10_000) return json({ error: 'The file is larger than 5 MB' }, 413);

  const body = await request.json().catch(() => null);
  if (!body || typeof body.csv !== 'string') return json({ error: 'csv (the file\'s text) is required' }, 400);
  const result = importRows(body.csv, body.game || null);
  body.csv = null; // drop the file's text
  if (result.error) return json({ error: result.error }, 400);
  if (!body.save) return json(result);

  // Raise counts to the file's, never lower: read what's there first.
  let saved = 0;
  const byGame = new Map();
  for (const m of result.matched) (byGame.get(m.game) || byGame.set(m.game, []).get(m.game)).push(m);
  for (const [game, marks] of byGame) {
    const { data: have, error: readErr } = await supabase.from('owned_cards').select('card_key, version_key, qty')
      .eq('side', 'fables').eq('game', game).in('card_key', [...new Set(marks.map((m) => m.card))]);
    if (readErr) return json({ error: 'Your card list isn\'t set up yet' }, 503);
    const qtyNow = new Map((have || []).map((x) => [`${x.card_key}|${x.version_key}`, x.qty]));
    const rows = marks.filter((m) => (qtyNow.get(`${m.card}|${m.version}`) || 0) < m.qty)
      .map((m) => ({ user_id: user.id, side: 'fables', game, card_key: m.card, version_key: m.version, qty: m.qty, updated_at: new Date().toISOString() }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('owned_cards').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,side,game,card_key,version_key' });
      if (error) return json({ error: 'Saving failed. Nothing after this point was saved.', saved }, 500);
      saved += rows.slice(i, i + 500).length;
    }
  }
  return json({ ...result, saved });
}
