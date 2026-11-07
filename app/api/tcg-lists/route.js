// app/api/tcg-lists/route.js
//
// GET /api/tcg-lists: card lists to browse, for the "Card lists" page and the
// popular lists under the home search (lib/tcg/lists.js). No eBay calls.
//
//   ?game=pokemon|mtg|yugioh|lorcana&popular=1
//     → { game, cards: [{ key, name, versions, cards, family: true }], source }
//       Hand-picked families for now. Open one with
//       /api/tcg-versions?game=…&q=<name>&family=1 (or the checklist).
//   ?game=…&letter=A   ('#' for names starting with a digit or symbol)
//     → { game, letter, cards: [{ key, name, versions }], total, offset, nextOffset, letters, source }
//       A–Z, 200 at a time (&offset=, &limit= up to 500). letters: [{ letter, cards }].
//   ?game=…&q=<typed name>
//     → { game, cards: [{ key, name, versions }], source }, up to 50.
//   ?game=…   → { game, letters, source }
//
// Show `source.note` with any list (the card data's credit; lists stay free).

import { NextResponse } from 'next/server';
import { CATALOG_GAMES, catalogData } from '../../../lib/tcg/catalog';
import { popularLists, lettersOf, cardsByLetter, searchLists } from '../../../lib/tcg/lists';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const game = p.get('game');
  if (!CATALOG_GAMES.includes(game)) {
    return NextResponse.json({ error: `game must be one of ${CATALOG_GAMES.join(', ')}` }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  // The lists only change when the catalogs are rebuilt and redeployed.
  const cache = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' };
  const source = catalogData(game).source;
  if (p.get('popular') === '1') return NextResponse.json({ game, cards: popularLists(game), source }, { headers: cache });
  if (p.get('q')) return NextResponse.json({ game, cards: searchLists(game, String(p.get('q')).slice(0, 80)), source }, { headers: cache });
  const letter = p.get('letter');
  if (letter && /^[A-Za-z#]$/.test(letter)) {
    const offset = Math.max(0, parseInt(p.get('offset'), 10) || 0);
    const limit = Math.max(1, Math.min(500, parseInt(p.get('limit'), 10) || 200));
    const { cards, total } = cardsByLetter(game, letter, offset, limit);
    return NextResponse.json({
      game, letter: letter.toUpperCase(), cards, total, offset,
      nextOffset: offset + limit < total ? offset + limit : null,
      letters: lettersOf(game), source,
    }, { headers: cache });
  }
  return NextResponse.json({ game, letters: lettersOf(game), source }, { headers: cache });
}
