// scripts/test-tcg-parser.mjs
//
// Runs the card-game title parser (lib/tcg/parseTitle.js) over
// mockups/tcg-test-cases.json and prints any failures. Each case's `expect`
// lists only the fields it checks. Exits 1 if any case fails.
//
//   node scripts/test-tcg-parser.mjs
//
// The lib files import without file extensions (Next.js style), so they're
// copied to a temp folder as .mjs with the extensions added, as in
// scripts/test-parser.mjs.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-tcg-parser-'));
for (const f of fs.readdirSync(path.join(root, 'lib/tcg'))) {
  if (!f.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(root, 'lib/tcg', f), 'utf8');
  fs.writeFileSync(path.join(dir, f.replace(/\.js$/, '.mjs')), src.replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.mjs'"));
}
const { parseTitle } = await import(pathToFileURL(path.join(dir, 'parseTitle.mjs')).href);
const { compareRarity } = await import(pathToFileURL(path.join(dir, 'score.mjs')).href);

const { cases } = JSON.parse(fs.readFileSync(path.join(root, 'mockups/tcg-test-cases.json'), 'utf8'));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
let pass = 0;
const fails = [];
const byGroup = {};
for (const c of cases) {
  const got = parseTitle(c.title, { game: c.hint || null });
  const bad = Object.keys(c.expect).filter((k) => !same(got[k], c.expect[k]));
  byGroup[c.group] = byGroup[c.group] || { pass: 0, total: 0 };
  byGroup[c.group].total++;
  if (bad.length) fails.push({ title: c.title, bad: bad.map((k) => `${k}: want ${JSON.stringify(c.expect[k])}, got ${JSON.stringify(got[k])}`) });
  else { pass++; byGroup[c.group].pass++; }
}

// Ordering checks for the rarest-first sort.
const order = [
  ['MTG The One Ring Serialized 0001/0001', 'MTG Edgar Markov Serialized 123/500', 'serial /1 above /500'],
  ['MTG Edgar Markov Serialized 123/500', 'MTG Black Lotus Alpha', 'serial above ladder'],
  ['Pokemon Charizard ex 199/165 SIR', 'Pokemon Gardevoir 245/198 Illustration Rare', 'SIR above IR'],
  ['PSA 10 Pokemon Charizard ex SIR', 'PSA 9 Pokemon Charizard ex SIR', 'PSA 10 above PSA 9'],
  ['PSA 9 Pokemon Charizard ex SIR', 'Pokemon Charizard ex SIR', 'graded above raw'],
  ['Pokemon Charizard 4/102 Base Set 1st Edition Holo', 'Pokemon Charizard 4/102 Base Set Shadowless Holo', '1st Edition above Shadowless'],
  ['Disney Lorcana Iconic Mickey', 'Disney Lorcana Enchanted Elsa', 'Iconic above Enchanted'],
  ['One Piece Championship Luffy Promo', 'One Piece Luffy OP05-119 SEC Manga Rare', 'prize above manga'],
  ['Yu-Gi-Oh Starlight Rare Accesscode', 'Yu-Gi-Oh Ghost Rare Stardust', 'Starlight above Ghost'],
  ['Pokemon Pikachu Double Rare', 'Yugioh Pot of Greed Common', 'tiered card above common (cross-game)'],
];
for (const [a, b, why] of order) {
  if (compareRarity(parseTitle(a), parseTitle(b)) < 0) pass++;
  else fails.push({ title: `${a}  vs  ${b}`, bad: [`order: ${why}`] });
}

const total = cases.length + order.length;
for (const [g, r] of Object.entries(byGroup)) console.log(`${g.padEnd(12)} ${r.pass}/${r.total}`);
console.log(`Ordering     ${order.length - fails.filter((f) => f.bad[0].startsWith('order')).length}/${order.length}`);
for (const f of fails) console.log(`\nFAIL ${f.title}\n  ${f.bad.join('\n  ')}`);
console.log(`\n${pass}/${total} passed`);
process.exit(fails.length ? 1 : 0);
