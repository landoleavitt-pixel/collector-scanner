// app/api/tcg-versions/route.js
//
// GET /api/tcg-versions: every version of one card, for the checklist view.
// Magic (Scryfall), English Pokémon (TCGdex), Yu-Gi-Oh! (YGOPRODeck) and Lorcana
// (Lorcast). No eBay calls.
//
//   ?game=mtg|pokemon|yugioh|lorcana&card=<card key or exact name>
//     → { game, card: { key, name, reservedList? }, sets: [
//         { set, name, released, total? | type?, numbers: [
//           { number, rarity, versions: [
//             { key, label, rarity, finish, language, tags, rarityKey, tier, firstEdition? } ] } ] } ],
//         versionCount, source: { name, url, note }, built }
//     Sets newest first; numbers in card order. Show `source.note` with the
//     list (Scryfall's terms: the data stays free to everyone and is credited).
//
//   ?game=mtg|pokemon|yugioh|lorcana&sets=1
//     → { sets: [{ code, name, released }], source }: every set, newest first,
//     for the Set filter.
//
//   ?game=mtg|pokemon&q=<typed name>[&limit=N]
//     → { cards: [{ key, name, printings }] }, up to 10 (or N, max 300), for
//     the card picker. Matches the start of any word of the name.
//   ?game=mtg|pokemon&q=<name>&family=1
//     → { cards, total }: every card whose name holds the name as whole words
//     (a whole family, e.g. every Charizard card), up to 300.

import { NextResponse } from 'next/server';
import { cardVersions, findCards, familyCards, catalogData, CATALOG_GAMES } from '../../../lib/tcg/catalog';
import { setList } from '../../../lib/tcg/setFilter';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const game = p.get('game');
  if (!CATALOG_GAMES.includes(game)) {
    return NextResponse.json({ error: `game must be one of ${CATALOG_GAMES.join(', ')}` }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  // The catalog only changes when it's rebuilt and redeployed.
  const cache = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' };
  if (p.get('sets') === '1') {
    return NextResponse.json({ sets: setList(game), source: catalogData(game).source }, { headers: cache });
  }
  if (p.get('q') != null && !p.get('card')) {
    const q = String(p.get('q')).slice(0, 80);
    if (p.get('family') === '1') {
      const cards = familyCards(game, q);
      return NextResponse.json({ cards, total: cards.length }, { headers: cache });
    }
    return NextResponse.json({ cards: findCards(game, q, parseInt(p.get('limit'), 10) || 10) }, { headers: cache });
  }
  const body = cardVersions(game, String(p.get('card') || '').slice(0, 120));
  if (!body) {
    return NextResponse.json({ error: 'Card not found', cards: findCards(game, String(p.get('card') || '').slice(0, 80), 5) }, { status: 404, headers: cache });
  }
  return NextResponse.json(body, { headers: cache });
}
