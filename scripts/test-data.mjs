// scripts/test-data.mjs
//
// Checks the generated rarity data (lib/parallelDataExtra.js) for the scope
// and box flags. Run with the parser tests:  node scripts/test-data.mjs
//
// Flags on each colour:
//   cards: 'rookies' | 'veterans'  only on the rookie or veteran base cards
//   variation: true                only exists as a variation card
//   boxes: [...]                   box types the odds list names
//   boxOnly: 'Breaker' etc.        the only box type with odds

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-data-'));
fs.writeFileSync(path.join(dir, 'x.mjs'), fs.readFileSync(path.join(root, 'lib/parallelDataExtra.js'), 'utf8'));
const { EXTRA_SETS } = await import(path.join(dir, 'x.mjs'));

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const find = (set, name) => [...set.parallels.numbered, ...set.parallels.unnumbered].find((p) => p.name === name);

for (const [key, set] of Object.entries(EXTRA_SETS)) {
  const all = [...set.parallels.numbered, ...set.parallels.unnumbered];
  for (const p of set.parallels.numbered) check(typeof p.run === 'number' && p.run > 0, `${key}: ${p.name} has no print run`);
  for (const p of set.parallels.unnumbered) check(p.run === null, `${key}: ${p.name} is unnumbered but has a run`);
  for (const p of all) {
    check(p.cards === undefined || ['rookies', 'veterans'].includes(p.cards), `${key}: ${p.name} bad cards flag`);
    if (p.boxOnly) check(Array.isArray(p.boxes) && p.boxes.length === 1 && p.boxes[0] === p.boxOnly, `${key}: ${p.name} boxOnly disagrees with boxes`);
    if (p.boxes) check(p.boxes.length === new Set(p.boxes).size, `${key}: ${p.name} repeats a box`);
  }
}

// Insert lists: kind 'insert', a product name, numbered colours only from the insert's own checklist.
const inserts = Object.entries(EXTRA_SETS).filter(([, s]) => s.kind === 'insert');
check(inserts.length >= 3, `expected at least 3 insert lists, got ${inserts.length}`);
for (const [key, s] of inserts) {
  check(typeof s.product === 'string' && s.product.length > 0, `${key}: insert needs a product name`);
  check(s.parallels.numbered.length >= 3, `${key}: insert should have numbered colours`);
  check(!s.parallels.numbered.some((p) => /auto/i.test(p.name)), `${key}: autograph colour in an insert list`);
}

// Football Leather Blue and Teal Wave are on the rookie list only.
const tc = EXTRA_SETS['2025-topps-chrome-football'];
check(find(tc, 'Football Leather Blue Refractor')?.cards === 'rookies', 'Football Leather Blue should be rookie-only');
check(find(tc, 'Teal Wave Refractor')?.cards === 'rookies', 'Teal Wave should be rookie-only');
// Base colours that also sit on the rookie list are on every card: no flag.
check(find(tc, 'Gold Refractor')?.cards === undefined, 'Gold Refractor is on both lists, should have no cards flag');
check(find(tc, 'Green Refractor')?.cards === undefined, 'Green Refractor is on both lists, should have no cards flag');
// Breaker geometric colours are packed in Breaker boxes only.
check(find(tc, 'Purple Geometric Refractor')?.boxOnly === 'Breaker', 'Purple Geometric should be Breaker-only');
check(find(tc, 'Green Refractor')?.boxOnly === undefined, 'Green Refractor is in several boxes, not boxOnly');

// Panini Select (tiered): a colour name appears only where it has the same run
// in every tier. Blue Prizm (249/175/99/99/75) and Pink Prizm (10/8/6/4/1) vary,
// so neither name may appear; their runs become "Colour depends on tier" rows.
const sf = EXTRA_SETS['2025-panini-select-football'];
const sb = EXTRA_SETS['2024-25-panini-select-basketball'];
for (const [key, t] of [['select football', sf], ['select basketball', sb]]) {
  check(t && t.kind === 'tiered' && t.tiers.length >= 4, `${key}: tiered list with its tiers`);
  const named = [...t.parallels.numbered, ...t.parallels.unnumbered].filter((p) => p.name !== 'Colour depends on tier');
  const rows = t.parallels.numbered.filter((p) => p.name === 'Colour depends on tier');
  check(rows.length > 0 && rows.every((p) => typeof p.run === 'number' && p.key === `tier-varies-${p.run}`), `${key}: depends rows carry a run`);
  check(!named.some((p) => p.key.startsWith('tier-varies')), `${key}: a depends row has a colour name`);
}
check(!find(sf, 'Blue Prizm') && !find(sf, 'Pink Prizm'), 'Select football: varying colour names must not appear');
check(find(sf, 'Silver Prizm') && find(sf, 'Zebra Prizm'), 'Select football: colours on every tier are named');
check(sf.parallels.numbered.some((p) => p.key === 'tier-varies-75'), 'Select football: Blue Prizm /75 is a depends row');
check(sf.parallels.numbered.some((p) => p.key === 'tier-varies-1'), 'Select football: Pink Prizm /1 is a depends row');

console.log(fail ? `${fail} data check(s) failed` : `data checks pass (${Object.keys(EXTRA_SETS).length} lists)`);
process.exit(fail ? 1 : 0);
