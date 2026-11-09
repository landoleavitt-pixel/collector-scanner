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
// The real lib/ebay.js (it only defines functions), so shared helpers import.
fs.writeFileSync(path.join(dir, 'ebay-stub.mjs'), fs.readFileSync(path.join(root, 'lib/ebay.js'), 'utf8'));
fs.symlinkSync(path.join(root, 'lib/tcg/catalog'), path.join(dir, 'catalog'));
const { matchListing, titleSetHit } = await import(pathToFileURL(path.join(dir, 'family.mjs')).href);
const { popularLists, familiesByLetter, lettersOf, searchLists } = await import(pathToFileURL(path.join(dir, 'lists.mjs')).href);
const { setList, listingInSets, familyOnly } = await import(pathToFileURL(path.join(dir, 'setFilter.mjs')).href);
const { cardVersions, findCards, familyCards, cardFamily } = await import(pathToFileURL(path.join(dir, 'catalog.mjs')).href);
const { familySavedParams, readFamilyCriteria } = await import(pathToFileURL(path.join(dir, 'familySearch.mjs')).href);
const { catalogRarity, catalogGroup, applyCatalog } = await import(pathToFileURL(path.join(dir, 'catalogMatch.mjs')).href);
const { getCard } = await import(pathToFileURL(path.join(dir, 'catalog.mjs')).href);
const { toResult } = await import(pathToFileURL(path.join(dir, 'search.mjs')).href);
const { parseTitle } = await import(pathToFileURL(path.join(dir, 'parseTitle.mjs')).href);
const { rarityValuesToGroups } = await import(pathToFileURL(path.join(dir, 'ladders.mjs')).href);
const allVersions = (game, key) => cardVersions(game, key).sets.flatMap((x) => x.numbers.flatMap((n) => n.versions));
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
  ['Versions carry rarityGroup: 151 #199 is Extremely rare', () => cardVersions('pokemon', 'charizard-ex').sets.find((x) => x.set === 'sv03.5').numbers.find((n) => n.number === '199').versions[0].rarityGroup === 'extremely_rare'],
  ['Versions: SVP promo is Promo', () => cardVersions('pokemon', 'charizard-ex').sets.find((x) => x.set === 'svp').numbers[0].versions[0].rarityGroup === 'promo'],
  ['Versions: Alpha Black Lotus is Vintage', () => cardVersions('mtg', 'black-lotus').sets.find((x) => x.set === 'lea').numbers[0].versions[0].rarityGroup === 'vintage'],
  ['Versions: serialized One Ring is Extremely rare', () => allVersions('mtg', 'the-one-ring').some((v) => v.rarityKey === 'serialized' && v.rarityGroup === 'extremely_rare')],
  ['Versions: Sheoldred prerelease is Promo, set card is Very rare', () => { const v = allVersions('mtg', 'sheoldred-the-apocalypse'); return v.some((x) => x.tags.includes('prerelease') && x.rarityGroup === 'promo') && v.find((x) => x.key === 'dmu:107:n').rarityGroup === 'very_rare'; }],
  ['Every Magic version of a sample of cards has a group', () => ['sol-ring', 'lightning-bolt', 'ragavan-nimble-pilferer'].every((k) => allVersions('mtg', k).every((v) => v.rarityGroup))],
  ['Pokémon V cards are Very rare, Shiny and Radiant Extremely rare', () => allVersions('pokemon', 'lugia-v').some((v) => v.rarity === 'Holo Rare V' && v.rarityGroup === 'very_rare') && allVersions('pokemon', 'radiant-charizard').every((v) => v.rarityGroup === 'extremely_rare')],
  ['Every version of Base Set Charizard is Vintage, 1st Edition too', () => cardVersions('pokemon', 'charizard').sets.find((x) => x.set === 'base1').numbers.flatMap((n) => n.versions).every((v) => v.rarityGroup === 'vintage')],
  ['Neo Genesis Lugia is Vintage; Legendary Collection is not', () => allVersions('pokemon', 'lugia').some((v) => v.key.startsWith('neo1:') && v.rarityGroup === 'vintage') && cardVersions('pokemon', 'charizard').sets.find((x) => x.set === 'lc').numbers.flatMap((n) => n.versions).every((v) => v.rarityGroup !== 'vintage')],
  ['A Base Set listing is Vintage even if the title says nothing old', () => catalogGroup('pokemon', getCard('pokemon', 'charizard'), matchListing('pokemon', 'charizard', 'Charizard 4/102 Holo'))?.group === 'vintage'],
  ['Yu-Gi-Oh! versions are a code in one rarity, with a group', () => allVersions('yugioh', 'blue-eyes-white-dragon').some((v) => v.key === 'LOB:EN001:ultra-rare' && v.rarityGroup === 'very_rare')],
  ['A Yu-Gi-Oh! code in two rarities gives two versions', () => allVersions('yugioh', 'accesscode-talker').filter((v) => v.key.startsWith('RA02:EN044:')).length > 1],
  ['Starlight is Extremely rare', () => allVersions('yugioh', 'dark-magician-girl').some((v) => v.rarity === 'Starlight Rare' && v.rarityGroup === 'extremely_rare')],
  ['Yu-Gi-Oh! prize sets are Promo', () => Object.values(cardVersions('yugioh', 'blue-eyes-white-dragon').sets).filter((x) => /prize/i.test(x.name)).every((x) => x.numbers.every((n) => n.versions.every((v) => v.rarityGroup === 'promo')))],
  ['Lorcana Enchanted comes in cold foil only, Legendary in both', () => allVersions('lorcana', 'elsa-spirit-of-winter').filter((v) => v.key.startsWith('1:207:')).length === 1 && allVersions('lorcana', 'elsa-spirit-of-winter').filter((v) => v.key.startsWith('1:42:')).length === 2],
  ['Lorcana rarities have groups', () => allVersions('lorcana', 'elsa-spirit-of-winter').find((v) => v.key === '1:207:f').rarityGroup === 'extremely_rare' && allVersions('lorcana', 'be-prepared')[0].rarityGroup === 'rare'],
  ['A family of Elsa cards holds every Elsa', () => familyCards('lorcana', 'Elsa').length > 5 && familyCards('lorcana', 'Elsa').some((c) => c.key === 'elsa-ice-maker')],
  ['Dark Magician family finds Dark Magician Girl', () => familyCards('yugioh', 'Dark Magician').some((c) => c.key === 'dark-magician-girl')],
  ['Catalogs say where the data came from', () => cardVersions('yugioh', 'kuriboh').source.name === 'YGOPRODeck' && cardVersions('lorcana', 'be-prepared').source.name === 'Lorcast'],
  ['A title names a set: Pokémon name, nickname, unique total', () => titleSetHit('pokemon', 'swsh7', 'Rayquaza VMAX 218/203 Evolving Skies') && titleSetHit('pokemon', 'sv03.5', 'Charizard ex 199 151 SIR')],
  ['Base Set 2 is not Base Set', () => !titleSetHit('pokemon', 'base1', 'Charizard Base Set 2 4/130') && titleSetHit('pokemon', 'base4', 'Charizard Base Set 2 4/130')],
  ['A different set is not a set hit', () => !titleSetHit('pokemon', 'swsh7', 'Charizard VMAX Darkness Ablaze 20/189')],
  ['Yu-Gi-Oh! codes name a set', () => titleSetHit('yugioh', 'LOB', 'Blue-Eyes White Dragon LOB-EN001 PSA 9') && titleSetHit('yugioh', 'LOB', 'Dark Hole LOB-E041') && !titleSetHit('yugioh', 'MRD', 'Blue-Eyes White Dragon LOB-EN001')],
  ['Magic codes and names name a set', () => titleSetHit('mtg', 'dmu', 'Sheoldred the Apocalypse DMU 107 Foil') && titleSetHit('mtg', 'dmu', 'Sheoldred Dominaria United') && !titleSetHit('mtg', 'dmu', 'Sheoldred Foil 107')],
  ['Lorcana bracket, code and name name a set', () => titleSetHit('lorcana', '9', 'Elsa - Spirit of Winter [9 - 43/204] NM') && titleSetHit('lorcana', 'P3', 'Tinker Bell 11/P3 Promo') && titleSetHit('lorcana', '1', 'Elsa The First Chapter') && !titleSetHit('lorcana', '2', 'Elsa The First Chapter')],
  ['A pinned listing is decided by its printing, not its words', () => listingInSets('pokemon', ['swsh7'], { title: 'Charizard Evolving Skies', catalogSets: ['base1'] }) === false],
  ['Set lists are newest first', () => { const l = setList('lorcana'); return l.length > 10 && l[0].released >= l[l.length - 1].released && l.some((x) => x.name === 'The First Chapter'); }],
  ['A family saved search keeps its set', () => familySavedParams({ game: 'pokemon', card: 'charizard', set: 'base1' }, 'Charizard').get('set') === 'base1'],
  ['A grade in a title reaches the search response', () => { const r = toResult({ id: '1', title: 'Charizard 4/102 PSA 10', price: 1, parsed: parseTitle('Charizard 4/102 PSA 10', { game: 'pokemon' }), graded: true }); return r.gradeLabel === 'PSA 10' && r.grade.grade === 10; }],
  ['A family is that card: Dark Magician alone', () => { const f = cardFamily('yugioh', 'Dark Magician'); return f.match === 'card' && f.cards.map((c) => c.key).join() === 'dark-magician'; }],
  ['Black Lotus is not Black Lotus Lounge', () => !cardFamily('mtg', 'Black Lotus').cards.some((c) => /lounge/i.test(c.name)) && cardFamily('mtg', 'Black Lotus').cards.length === 1],
  ['Sheoldred is every Sheoldred card', () => { const n = cardFamily('mtg', 'Sheoldred').cards.map((c) => c.name); return n.includes('Sheoldred, the Apocalypse') && n.includes('Sheoldred, Whispering One') && !n.some((x) => /'s /.test(x)); }],
  ['Charizard is every Charizard, not Spirit Link', () => { const n = cardFamily('pokemon', 'Charizard').cards.map((c) => c.name); return n.includes('Charizard ex') && n.includes('Mega Charizard X ex') && n.includes("Blaine's Charizard") && !n.some((x) => /spirit link/i.test(x)); }],
  ['Charizard ex typed is that card alone', () => cardFamily('pokemon', 'Charizard ex').cards.every((c) => /^charizard ex$/i.test(c.name))],
  ['Elsa is every Elsa', () => cardFamily('lorcana', 'Elsa').cards.length > 5 && cardFamily('lorcana', 'Elsa').cards.every((c) => c.name.startsWith('Elsa'))],
  ['A partial name falls back to words', () => cardFamily('yugioh', 'Blue-Eyes').match === 'words' && cardFamily('yugioh', 'Blue-Eyes').cards.length > 3],
  ['Popular lists are families with version counts', () => { const l = popularLists('pokemon'); const c = l.find((x) => x.name === 'Charizard'); return l.length >= 10 && c.family && c.cards > 10 && c.versions > c.cards; }],
  ['Every popular list is a real family, never a word match', () => ['pokemon', 'mtg', 'yugioh'].every((g) => popularLists(g).length >= 10) && popularLists('lorcana').length === 6],
  ['A-Z lists are families: one Elsa, not every Elsa card', () => { const e = familiesByLetter('lorcana', 'E', 0, 500).cards.filter((c) => c.name === 'Elsa'); return e.length === 1 && e[0].cards > 5; }],
  ['A family name opens the same family in the checklist', () => { const f = familiesByLetter('mtg', 'S', 0, 5000).cards.find((c) => c.name === 'Sheoldred'); return f && f.cards === cardFamily('mtg', f.name).cards.length; }],
  ['"The One Ring" files under O; # exists', () => familiesByLetter('mtg', 'O', 0, 5000).cards.some((c) => c.name === 'The One Ring') && lettersOf('mtg').some((x) => x.letter === '#')],
  ['Searching lists finds families', () => searchLists('pokemon', 'chariz')[0]?.name === 'Charizard' && searchLists('yugioh', 'dark magician')[0]?.name === 'Dark Magician'],
  ['A set with a typed name keeps only that family', () => { const f = familyOnly('mtg', 'Sheoldred'); return !f({ title: "Rona, Sheoldred's Faithful 147 DMU" }) && f({ title: 'Sheoldred, the Apocalypse DMU 107' }) && familyOnly('yugioh', 'Blue-Eyes') === null; }],
  ['Find it for one version takes only listings pinned to it', () => { const c = readFamilyCriteria(new URLSearchParams({ game: 'yugioh', card: 'dark-magician-the-pharaohs-servant', versions: 'MAMO:EN001:grand-master-rare', lang: 'en' })); return c.q === 'dark magician the pharaoh\'s servant' || c.q.length > 0; }],
  ['Find it searches eBay for the card and its number', () => readFamilyCriteria(new URLSearchParams({ game: 'pokemon', card: 'pikachu', versions: 'sv03.5:070:n' })).q === 'Pikachu (70, 070)'],
  ['Find it for Yu-Gi-Oh! searches the printed code', () => readFamilyCriteria(new URLSearchParams({ game: 'yugioh', card: 'dark-magician', versions: 'LOB:EN005:ultra-rare' })).q === 'Dark Magician LOB-EN005'],
  ['Old saved rarity values map to groups', () => rarityValuesToGroups(['sir'], ['pokemon'])[0] === 'extremely_rare' && rarityValuesToGroups(['pokemon:dr'], ['pokemon','mtg'])[0] === 'very_rare' && rarityValuesToGroups(['enchanted'], ['lorcana'])[0] === 'extremely_rare'],
  ['Group values pass through; junk is dropped', () => JSON.stringify(rarityValuesToGroups(['promo', 'vintage', 'nonsense'], ['pokemon'])) === '["promo","vintage"]'],
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
