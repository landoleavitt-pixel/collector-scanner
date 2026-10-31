// lib/checklistColours.js
//
// Which colours a checklist card can have. Used with lib/checklists/<set-key>.json
// (written by scripts/import-checklists.mjs) and PARALLEL_DATA from parallelData.js.
//
//   coloursForCard(set, card)  set: a PARALLEL_DATA entry, card: { rookie: 0|1 }
//   returns { colours, variations }
//     colours     the colours this card can have. Rookie-only colours are left
//                 off veteran cards, veteran-only colours off rookie cards.
//     variations  colours that exist only as a variation card (never a plain card).
//   Box-only colours stay in the list; boxOnly tells the UI which box.
//
// Facts only come from the checklist data. A colour with no flag is on every
// card of the base set.

export function coloursForCard(set, card) {
  const rookie = !!(card && card.rookie);
  const colours = [];
  const variations = [];
  for (const p of [...set.parallels.numbered, ...set.parallels.unnumbered]) {
    if (p.variation) { variations.push(p); continue; }
    if (p.cards === 'rookies' && !rookie) continue;
    if (p.cards === 'veterans' && rookie) continue;
    colours.push(p);
  }
  return { colours, variations };
}
