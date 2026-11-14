// lib/tcg/bulkOwned.js
//
// "I have all of these": the versions one bulk owned-marks call covers.
//   { game, card }            every version of that card
//   { game, set }             every version printed in that set
//   { game, marks: [{ card, version }] }   these exact versions
// Each version is checked against the catalog, so only real versions are
// marked. At most BULK_MAX versions per call.

import { getCard, versionsOf, setCards, CATALOG_GAMES } from './catalog';

export const BULK_MAX = 2000;

// → { marks: [{ card, version }] } or { error }
export function bulkMarks(body) {
  const game = String(body?.game || '');
  if (!CATALOG_GAMES.includes(game)) return { error: `game must be one of ${CATALOG_GAMES.join(', ')}` };
  const out = new Map();
  const add = (cardKey, version) => out.set(`${cardKey}|${version}`, { card: cardKey, version });
  if (Array.isArray(body.marks)) {
    if (body.marks.length > BULK_MAX) return { error: `at most ${BULK_MAX} marks per call` };
    for (const m of body.marks) {
      const c = getCard(game, String(m?.card || '').slice(0, 200));
      const v = String(m?.version || '');
      if (!c || !c.p.some((row) => versionsOf(game, row).some((x) => x.key === v))) return { error: `Not a version of this card: ${String(m?.card || '').slice(0, 60)} ${v.slice(0, 60)}` };
      add(c.key, v);
    }
  } else if (body.set) {
    const set = String(body.set);
    const cards = setCards(game, set);
    if (!cards.length) return { error: 'Set not found' };
    for (const c of cards) for (const row of c.p) if (row[0] === set) for (const v of versionsOf(game, row)) add(c.key, v.key);
  } else if (body.card) {
    const c = getCard(game, String(body.card).slice(0, 200));
    if (!c) return { error: 'Card not found' };
    for (const row of c.p) for (const v of versionsOf(game, row)) add(c.key, v.key);
  } else {
    return { error: 'marks, card or set is required' };
  }
  const marks = [...out.values()];
  if (marks.length > BULK_MAX) return { error: `That's ${marks.length} versions; at most ${BULK_MAX} per call` };
  return { game, marks };
}
