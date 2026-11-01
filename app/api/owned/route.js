// app/api/owned/route.js
//
// The signed-in member's "I own this" marks for the card checklist
// (table owned_cards, supabase/migrations/20261031000000_owned_cards.sql).
// Private: row-level security limits every query to the member's own rows.
//
// GET    ?side=fables&game=mtg&card=<card key>   (all optional filters)
//        → { owned: [{ id, side, game, card_key, version_key, qty, updated_at }] }
// POST   { side?, game, card, version, qty? }     add or set the count
//        qty 0 removes the mark. → { owned: row | null }
// DELETE ?id=<row id>   or   ?game=&card=&version=[&side=]   → { ok: true }
//
// On Foils & Fables, Magic and Pokémon versions are checked against the
// catalog, so only real versions of that card can be marked.

import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { getCard, versionsOf, CATALOG_GAMES } from '../../../lib/tcg/catalog';

const SIDES = ['sports', 'fables'];
const KEY = /^[\w.:★†-]{1,200}$/u;
const noStore = { 'Cache-Control': 'no-store' };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: noStore });

async function signedIn() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// → { side, game, card, version } or { error }
function readMark(src) {
  const side = src.side ?? 'fables';
  const game = String(src.game || '');
  let card = String(src.card || '');
  const version = String(src.version || '');
  if (!SIDES.includes(side)) return { error: 'side must be sports or fables' };
  if (!/^[a-z0-9-]{1,40}$/.test(game)) return { error: 'game is required' };
  if (side === 'fables' && CATALOG_GAMES.includes(game)) {
    const c = getCard(game, card);
    if (!c) return { error: 'Card not found' };
    if (version && !c.p.some((row) => versionsOf(game, row).some((v) => v.key === version))) return { error: 'Not a version of this card' };
    card = c.key;
  }
  if (!KEY.test(card)) return { error: 'card is required' };
  if (version && !KEY.test(version)) return { error: 'version is invalid' };
  return { side, game, card, version };
}

export async function GET(request) {
  const { supabase, user } = await signedIn();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  const p = new URL(request.url).searchParams;
  let q = supabase.from('owned_cards').select('id, side, game, card_key, version_key, qty, updated_at').order('card_key').order('version_key');
  if (SIDES.includes(p.get('side'))) q = q.eq('side', p.get('side'));
  if (p.get('game')) q = q.eq('game', p.get('game'));
  if (p.get('card')) {
    const game = p.get('game');
    const c = game && CATALOG_GAMES.includes(game) ? getCard(game, p.get('card')) : null;
    q = q.eq('card_key', c ? c.key : p.get('card'));
  }
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);
  return json({ owned: data ?? [] });
}

export async function POST(request) {
  const { supabase, user } = await signedIn();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  const body = await request.json().catch(() => ({}));
  const m = readMark(body);
  if (m.error) return json({ error: m.error }, 400);
  if (!m.version) return json({ error: 'version is required' }, 400);
  const qty = body.qty == null ? 1 : Number(body.qty);
  if (!Number.isInteger(qty) || qty < 0 || qty > 999) return json({ error: 'qty must be 0–999' }, 400);

  const match = { user_id: user.id, side: m.side, game: m.game, card_key: m.card, version_key: m.version };
  if (qty === 0) {
    const { error } = await supabase.from('owned_cards').delete().match(match);
    if (error) return json({ error: error.message }, 500);
    return json({ owned: null });
  }
  const { data, error } = await supabase
    .from('owned_cards')
    .upsert({ ...match, qty, updated_at: new Date().toISOString() }, { onConflict: 'user_id,side,game,card_key,version_key' })
    .select('id, side, game, card_key, version_key, qty, updated_at')
    .single();
  if (error) return json({ error: error.message }, 500);
  return json({ owned: data });
}

export async function DELETE(request) {
  const { supabase, user } = await signedIn();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  const p = new URL(request.url).searchParams;
  let q = supabase.from('owned_cards').delete().eq('user_id', user.id);
  if (p.get('id')) {
    const id = Number(p.get('id'));
    if (!Number.isInteger(id) || id < 1) return json({ error: 'id is invalid' }, 400);
    q = q.eq('id', id);
  } else {
    const m = readMark(Object.fromEntries(p));
    if (m.error) return json({ error: m.error }, 400);
    if (!m.version) return json({ error: 'version is required' }, 400);
    q = q.match({ side: m.side, game: m.game, card_key: m.card, version_key: m.version });
  }
  const { error } = await q;
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
