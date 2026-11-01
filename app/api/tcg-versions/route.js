// app/api/tcg-versions/route.js
//
// GET /api/tcg-versions: every version of one card, for the checklist view.
// Magic (Scryfall) and English Pokémon (TCGdex). No eBay calls.
//
//   ?game=mtg|pokemon&card=<card key or exact name>
//     → { game, card: { key, name, reservedList? }, sets: [
//         { set, name, released, total? | type?, numbers: [
//           { number, rarity, versions: [
//             { key, label, rarity, finish, language, tags, rarityKey, tier, firstEdition? } ] } ] } ],
//         versionCount, source: { name, url, note }, built }
//     Sets newest first; numbers in card order. Show `source.note` with the
//     list (Scryfall's terms: the data stays free to everyone and is credited).
//
//   ?game=mtg|pokemon&q=<typed name>
//     → { cards: [{ key, name, printings }] }, up to 10, for the card picker.

import { NextResponse } from 'next/server';
import { cardVersions, findCards, CATALOG_GAMES } from '../../../lib/tcg/catalog';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const game = p.get('game');
  if (!CATALOG_GAMES.includes(game)) {
    return NextResponse.json({ error: 'game must be mtg or pokemon' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  // The catalog only changes when it's rebuilt and redeployed.
  const cache = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' };
  if (p.get('q') != null && !p.get('card')) {
    return NextResponse.json({ cards: findCards(game, String(p.get('q')).slice(0, 80)) }, { headers: cache });
  }
  const body = cardVersions(game, String(p.get('card') || '').slice(0, 120));
  if (!body) {
    return NextResponse.json({ error: 'Card not found', cards: findCards(game, String(p.get('card') || '').slice(0, 80), 5) }, { status: 404, headers: cache });
  }
  return NextResponse.json(body, { headers: cache });
}
