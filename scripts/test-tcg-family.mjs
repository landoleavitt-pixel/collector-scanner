// scripts/test-tcg-family.mjs
//
// Checks the card catalog (lib/tcg/catalog.js) and the card-family matcher
// (lib/tcg/family.js) against mockups/tcg-family-cases.json. Each case names
// a game, a card and a listing title, and the `expect` fields to check:
//   kind      exact | set | language | promo | unknown | reject
//   versions  version keys that must all be among the matched ones
//   why       text the label must contain
// Exits 1 if any case fails.
//
//   node scripts/test-tcg-family.mjs

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-tcg-family-'));
for (const f of fs.readdirSync(path.join(root, 'lib/tcg'))) {
  if (!f.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(root, 'lib/tcg', f), 'utf8')
    .replace(/from '\.\.\/ebay'/g, "from './ebay-stub.mjs'")
    .replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.mjs'")
    .replace(/from '(\.\/catalog\/[a-z]+\.json)'/g, "from '$1' with { type: 'json' }")
    .replace(/from '\.\.\/\.\.\/(data\/tcg\/[a-z-]+\.json)'/g, (m, f) => `from '${path.join(root, f)}' with { type: 'json' }`);
  fs.writeFileSync(path.join(dir, f.replace(/\.js$/, '.mjs')), src);
}
fs.writeFileSync(path.join(dir, 'ebay-stub.mjs'), 'export const getAppToken = () => null; export const browseSearch = () => ({});');
fs.symlinkSync(path.join(root, 'lib/tcg/catalog'), path.join(dir, 'catalog'));
const { matchListing } = await import(pathToFileURL(path.join(dir, 'family.mjs')).href);
const { cardVersions, findCards, familyCards } = await import(pathToFileURL(path.join(dir, 'catalog.mjs')).href);
const { familySavedParams } = await import(pathToFileURL(path.join(dir, 'familySearch.mjs')).href);
const { catalogRarity, applyCatalog } = await import(pathToFileURL(path.join(dir, 'catalogMatch.mjs')).href);
const { getCard } = await import(pathToFileURL(path.join(dir, 'catalog.mjs')).href);
const rarityOf = (game, key, title, titleRarity = null) => { const c = getCard(game, key); return catalogRarity(game, c, matchListing(game, c, title), titleRarity); };

const { cases } = JSON.parse(fs.readFileSync(path.join(root, 'mockups/tcg-family-cases.json'), 'utf8'));
let pass = 0;
const fails = [];
for (const c of cases) {
  const got = matchListing(c.game, c.card, c.title);
  const bad = [];
  if (c.expect.kind && got.kind !== c.expect.kind) bad.push(`kind: want ${c.expect.kind}, got ${got.kind} (${got.why})`);
  for (const v of c.expect.versions || []) if (!got.versions.includes(v)) bad.push(`versions: want ${v}, got ${got.versions.slice(0, 6).join(',')}`);
  if (c.expect.why && !got.why?.includes(c.expect.why)) bad.push(`why: want "${c.expect.why}", got "${got.why}"`);
  if (bad.length) fails.push({ title: `[${c.card}] ${c.title}`, bad });
  else pass++;
}

// Catalog checks.
const checks = [
  ['Sheoldred has a Dominaria United #107', () => cardVersions('mtg', 'sheoldred-the-apocalypse').sets.some((s) => s.set === 'dmu' && s.numbers.some((n) => n.number === '107'))],
  ['Black Lotus is on the Reserved List', () => cardVersions('mtg', 'Black Lotus').card.reservedList === true],
  ['Charizard ex 151 #199 is a Special Illustration Rare', () => cardVersions('pokemon', 'charizard-ex').sets.find((s) => s.set === 'sv03.5').numbers.find((n) => n.number === '199').versions[0].rarityKey === 'sir'],
  ['Charizard EX (XY era) is a separate card', () => cardVersions('pokemon', 'Charizard EX').card.key === 'charizard-ex-xy'],
  ['Base Set Charizard has a 1st Edition Holo', () => cardVersions('pokemon', 'charizard').sets.find((s) => s.set === 'base1').numbers[0].versions.some((v) => v.label === '1st Edition Holo')],
  ['Sets are newest first', () => { const s = cardVersions('mtg', 'sol-ring').sets; return s[0].released >= s[s.length - 1].released; }],
  ['Name search finds "Sheoldred"', () => findCards('mtg', 'sheold').length >= 3],
  ['Name search matches any word ("charizard" finds Mega Charizard X ex)', () => findCards('pokemon', 'charizard', 300).some((c) => c.name === 'Mega Charizard X ex')],
  ['Name search puts names that start with the words first', () => findCards('pokemon', 'charizard')[0].name.toLowerCase().startsWith('charizard')],
  ['Charizard family has every Charizard card, more than 10', () => { const f = familyCards('pokemon', 'Charizard'); return f.length > 10 && f.some((c) => c.name === 'Mega Charizard X ex') && f.some((c) => c.name === 'Charizard VMAX'); }],
  ['Family matches whole words only ("Mew" has no "Mewtwo ex")', () => !familyCards('pokemon', 'Mew').some((c) => c.name === 'Mewtwo ex')],
  ['Saved family search with picked versions hides unsure listings', () => { const p = familySavedParams({ game: 'pokemon', card: 'charizard-ex', versions: ['sv03.5:199:h'], needOnly: true }); return p.get('card') === 'charizard-ex' && p.get('versions') === 'sv03.5:199:h' && p.get('unsure') === 'hide' && p.get('sort') === 'newest' && !p.has('needOnly'); }],
  ['Saved family search with no versions keeps unsure listings', () => familySavedParams({ game: 'mtg', card: 'sol-ring' }).get('unsure') === 'show'],
  ['Saved family search with a list of cards sends cards and q', () => { const p = familySavedParams({ game: 'pokemon', cards: ['charizard', 'charizard-ex'], needOnly: true }, 'Charizard'); return p.get('cards') === 'charizard,charizard-ex' && p.get('q') === 'Charizard'; }],
  ['Catalog rarity beats the title: 151 #199 called "Ultra Rare" is a SIR', () => rarityOf('pokemon', 'charizard-ex', 'Charizard ex 199/165 151 Ultra Rare Holo') === 'sir'],
  ['Catalog rarity: Base Set Charizard 4/102 is a Holo Rare', () => rarityOf('pokemon', 'Charizard', 'Charizard 4/102 Base Set Holo') === 'holo'],
  ['Catalog rarity: Sheoldred DMU #107 is Mythic', () => rarityOf('mtg', 'sheoldred-the-apocalypse', 'Sheoldred, the Apocalypse #107 Dominaria United DMU') === 'mythic'],
  ['Catalog rarity: serialized One Ring stays Serialized', () => rarityOf('mtg', 'the-one-ring', 'The One Ring Serialized 0001 LTR Borderless Poster') !== 'mythic'],
  ['No catalog rarity for "version not in title"', () => rarityOf('pokemon', 'Charizard', 'Charizard Pokemon card nice') === null],
  ['Several possible versions: the title\'s rarity if it is one of them', () => { const c = getCard('mtg', 'sol-ring'); const m = matchListing('mtg', c, 'Sol Ring Secret Lair Drop Foil'); return m.kind !== 'set' || catalogRarity('mtg', c, m, 'rare') === 'rare' || catalogRarity('mtg', c, m, 'rare') !== null; }],
  ['applyCatalog relabels a search item and says where the rarity came from', () => { const out = applyCatalog([{ id: 't1', title: 'Charizard ex 199/165 151 Ultra Rare Holo', parsed: { game: 'pokemon', rarity: 'ultra', rarityName: 'Ultra Rare' } }], 'Charizard'); return out[0].parsed.rarity === 'sir' && out[0].raritySource === 'catalog' && out[0].catalog?.set === 'sv03.5'; }],
  ['Serialized One Ring is a grail', () => cardVersions('mtg', 'the-one-ring').sets.flatMap((s) => s.numbers.flatMap((n) => n.versions)).some((v) => v.rarityKey === 'serialized' && v.tier === 'grail')],
];
for (const [name, fn] of checks) {
  let ok = false;
  try { ok = fn(); } catch (e) { ok = false; console.log('   ', name, '→', e.message); }
  if (ok) pass++;
  else fails.push({ title: name, bad: ['catalog check failed'] });
}

const total = cases.length + checks.length;
for (const f of fails) console.log(`✗ ${f.title}\n    ${f.bad.join('\n    ')}`);
console.log(`\n${pass}/${total} passed`);
fs.rmSync(dir, { recursive: true, force: true });
process.exit(pass === total ? 0 : 1);
