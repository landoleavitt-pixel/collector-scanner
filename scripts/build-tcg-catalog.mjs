// scripts/build-tcg-catalog.mjs
//
// Builds the card catalogs behind "every version of a card" (Foils & Fables):
//   lib/tcg/catalog/mtg.json      every paper Magic printing, from Scryfall
//   lib/tcg/catalog/pokemon.json  every English Pokémon card, from TCGdex
//   lib/tcg/catalog/yugioh.json   every Yu-Gi-Oh! TCG printing, from YGOPRODeck
//   lib/tcg/catalog/lorcana.json  every Disney Lorcana card, from Lorcast
//
//   node scripts/build-tcg-catalog.mjs            all games
//   node scripts/build-tcg-catalog.mjs mtg        one game
//
// Text only: names, sets, numbers, rarities, finishes and treatments. No card
// images are stored or linked (research/non-sports-filters.md section 0).
//
// Sources and their rules:
// - Scryfall bulk data (https://scryfall.com/docs/api/bulk-data). One download
//   a day at most; their API asks for a User-Agent and Accept header. Their
//   rule: "You may not 'paywall' access to Scryfall data", so the version list
//   must stay free to everyone, and we credit Scryfall wherever it's shown.
// - TCGdex (https://tcgdex.dev), MIT licence. One GraphQL request returns
//   every English card; TCG Pocket (the phone game) is left out.
//
// - YGOPRODeck (https://ygoprodeck.com/api-guide/). 20 requests a second; they
//   ask us to store the data locally, which is what this does. Free, but the
//   guide doesn't cover paid apps: get written OK before alerts become paid
//   (research/catalogs-phase-2.md). Two requests.
// - Lorcast (https://lorcast.com/docs/api). 50-100 ms between requests, cache
//   encouraged. Lorcana content can't be charged for, so version lists stay
//   free (DECISIONS.md). One request per set, about 30.
//
// About 40 requests in all. Re-run once a month, or when a new set comes out.

import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'lib/tcg/catalog');
const HEADERS = { 'User-Agent': 'FieldsAndFloors/1.0 (catalog import)', Accept: 'application/json' };
const today = new Date().toISOString().slice(0, 10);
const which = process.argv[2] || 'all';

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// "Sheoldred, the Apocalypse" → "sheoldred-the-apocalypse"
export function slug(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function write(name, data) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, name);
  const text = JSON.stringify(data);
  fs.writeFileSync(file, text);
  const gz = zlib.gzipSync(text).length;
  console.log(`${name}: ${(text.length / 1e6).toFixed(1)} MB (${(gz / 1e6).toFixed(1)} MB gzipped)`);
}

// ── Magic (Scryfall) ────────────────────────────────────────────────────────
// Layouts that aren't cards a collector would own as a single.
const SKIP_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem', 'art_series']);
// Promo types that say nothing about which version it is.
const SKIP_PROMO = /^(?:universesbeyond|boosterfun|setpromo|ff[a-z]+|alchemy|rebalanced|sourcematerial)$/;

async function buildMtg() {
  const bulk = await getJson('https://api.scryfall.com/bulk-data/default-cards');
  const url = bulk.jsonl_download_uri || bulk.download_uri;
  const sets = (await getJson('https://api.scryfall.com/sets')).data;

  const setRows = {};
  for (const s of sets) {
    if (s.digital) continue;
    // printed_size: the total printed on the cards ("022/259"), for titles with no set name.
    setRows[s.code] = [s.name, s.released_at || null, s.set_type, s.parent_set_code || null, s.printed_size || null];
  }

  const tmp = path.join(os.tmpdir(), `scryfall-${Date.now()}.jsonl.gz`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await fs.promises.writeFile(tmp, Buffer.from(await res.arrayBuffer()));

  const cards = {};
  const lines = readline.createInterface({ input: fs.createReadStream(tmp).pipe(zlib.createGunzip()) });
  for await (let line of lines) {
    line = line.trim().replace(/,$/, '');
    if (!line.startsWith('{')) continue;
    const c = JSON.parse(line);
    if (c.digital || !c.games?.includes('paper') || SKIP_LAYOUTS.has(c.layout) || c.set_type === 'token') continue;
    if (!setRows[c.set]) continue;
    const key = slug(c.name);
    const card = (cards[key] ||= { n: c.name, p: [] });
    if (c.reserved) card.rl = 1;

    const tags = [];
    if (c.border_color === 'borderless') tags.push('borderless');
    if (c.border_color === 'gold') tags.push('goldborder');
    for (const f of c.frame_effects || []) if (['showcase', 'extendedart', 'fullart'].includes(f)) tags.push(f);
    if (c.full_art && !tags.includes('fullart')) tags.push('fullart');
    // An old-style frame on a modern set is the "retro frame" treatment.
    if ((c.frame === '1993' || c.frame === '1997') && (c.released_at || '') >= '2004') tags.push('retro');
    for (const p of c.promo_types || []) if (!SKIP_PROMO.test(p)) tags.push(p);

    // Optional tail, only as long as needed: tags, language, flavor name
    // (the alternate name some printings carry, e.g. "Zidane Tribal").
    const row = [c.set, c.collector_number, c.rarity[0], (c.finishes || []).map((f) => f[0]).join('')];
    const flavor = c.flavor_name || c.card_faces?.find((f) => f.flavor_name)?.flavor_name || null;
    if (tags.length || c.lang !== 'en' || flavor) row.push([...new Set(tags)].join(' '));
    if (c.lang !== 'en' || flavor) row.push(c.lang);
    if (flavor) row.push(flavor);
    card.p.push(row);
  }
  fs.unlinkSync(tmp);

  const used = new Set(Object.values(cards).flatMap((c) => c.p.map((p) => p[0])));
  write('mtg.json', {
    v: 1,
    game: 'mtg',
    built: today,
    source: { name: 'Scryfall', url: 'https://scryfall.com', note: 'Card data from Scryfall. Free to everyone; not paywalled.' },
    // rarity letters: c common, u uncommon, r rare, m mythic, s special, b bonus
    // finish letters: n nonfoil, f foil, e etched
    sets: Object.fromEntries(Object.entries(setRows).filter(([k]) => used.has(k))),
    cards,
  });
}

// ── Pokémon (TCGdex) ────────────────────────────────────────────────────────
async function buildPokemon() {
  const gql = (query) => getJson('https://api.tcgdex.net/v2/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  });
  const setsRes = await gql('{ sets { id name releaseDate serie { id } cardCount { official } } }');
  const cardsRes = await gql('{ cards { id localId name rarity set { id } variants { normal reverse holo firstEdition } } }');
  if (!cardsRes.data?.cards) throw new Error('TCGdex returned no cards');

  const sets = {};
  for (const s of setsRes.data.sets) {
    if (s.serie?.id === 'tcgp') continue; // TCG Pocket, the phone game
    sets[s.id] = [s.name, s.releaseDate || null, s.cardCount?.official || null, s.serie?.id || null];
  }
  const rarities = [];
  const rIdx = (r) => {
    const v = r || 'None';
    let i = rarities.indexOf(v);
    if (i < 0) i = rarities.push(v) - 1;
    return i;
  };
  const cards = {};
  for (const c of cardsRes.data.cards) {
    const setId = c.set?.id;
    if (!sets[setId]) continue;
    // "Charizard EX" (Black & White and XY eras) is a different card from
    // "Charizard ex" (EX and Scarlet & Violet eras).
    const key = slug(c.name) + (/\bEX\b/.test(c.name) ? '-xy' : '');
    const card = (cards[key] ||= { n: c.name, p: [] });
    const v = c.variants || {};
    const variants = [v.normal && 'n', v.holo && 'h', v.reverse && 'r', v.firstEdition && '1'].filter(Boolean).join('');
    card.p.push([setId, c.localId, rIdx(c.rarity), variants]);
  }
  const used = new Set(Object.values(cards).flatMap((c) => c.p.map((p) => p[0])));
  write('pokemon.json', {
    v: 1,
    game: 'pokemon',
    built: today,
    source: { name: 'TCGdex', url: 'https://tcgdex.dev', note: 'Card data from TCGdex (MIT licence). English cards only.' },
    rarities,
    // variant letters: n normal, h holo, r reverse holo, 1 1st Edition
    sets: Object.fromEntries(Object.entries(sets).filter(([k]) => used.has(k))),
    cards,
  });
}

// ── Yu-Gi-Oh! (YGOPRODeck) ──────────────────────────────────────────────────
// Rarity names as the source writes them → one spelling. Anything else is a
// data-entry slip ("2", "New", "Reprint", "European debut"), not a rarity.
const YGO_SPELLING = {
  'PLatinum Secret Rare': 'Platinum Secret Rare', Starfoil: 'Starfoil Rare', 'Extra Secret': 'Extra Secret Rare',
  'Duel Terminal Normal Rare Parallel Rare': 'Duel Terminal Rare Parallel Rare',
};
const YGO_NOT_RARITY = /^(?:\d+|new|new artwork|reprint|cr|force-smw|.*debut)$/i;
// "LOB-EN001" → set LOB, number EN001. Codes with no card number ("DB49",
// "SR03-ENTKN", "MF03-EN0??") can't be matched to a listing, so they're left out.
const YGO_CODE = /^([A-Z0-9]+)-([A-Z]{0,4}\d+[A-Za-z]?)$/;

async function buildYugioh() {
  const { data } = await getJson('https://db.ygoprodeck.com/api/v7/cardinfo.php');
  const setList = await getJson('https://db.ygoprodeck.com/api/v7/cardsets.php');
  // A code prefix can be shared (ETCO is Eternity Code and its Premiere! promo),
  // so a prefix takes the name most of its cards were printed under.
  const dates = Object.fromEntries(setList.map((s) => [s.set_name, s]));
  const prefixNames = {};
  for (const c of data) {
    for (const p of c.card_sets || []) {
      const m = String(p.set_code || '').match(YGO_CODE);
      if (m) (prefixNames[m[1]] ||= {})[p.set_name] = (prefixNames[m[1]][p.set_name] || 0) + 1;
    }
  }
  const sets = {};
  for (const [prefix, counts] of Object.entries(prefixNames)) {
    const name = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    sets[prefix] = [name, dates[name]?.tcg_date || null, dates[name]?.num_of_cards || null, null];
  }
  const rarities = [];
  const rIdx = (raw) => {
    const name = YGO_NOT_RARITY.test(raw || '') || !raw ? 'None' : YGO_SPELLING[raw] || raw;
    let i = rarities.indexOf(name);
    if (i < 0) i = rarities.push(name) - 1;
    return i;
  };
  const cards = {};
  for (const c of data) {
    if (!c.card_sets?.length || c.frameType === 'token') continue;
    // One row per printed code; a code can come in several rarities.
    const rows = new Map();
    for (const p of c.card_sets) {
      const m = String(p.set_code || '').match(YGO_CODE);
      if (!m) continue;
      const row = rows.get(p.set_code) || [m[1], m[2], []];
      const i = rIdx(p.set_rarity);
      if (!row[2].includes(i)) row[2].push(i);
      rows.set(p.set_code, row);
    }
    if (rows.size) cards[slug(c.name)] = { n: c.name, p: [...rows.values()] };
  }
  const used = new Set(Object.values(cards).flatMap((c) => c.p.map((p) => p[0])));
  write('yugioh.json', {
    v: 1,
    game: 'yugioh',
    built: today,
    source: { name: 'YGOPRODeck', url: 'https://ygoprodeck.com', note: 'Card data from YGOPRODeck. Not affiliated with Konami. Japanese-only printings aren\'t listed.' },
    rarities,
    sets: Object.fromEntries(Object.entries(sets).filter(([k]) => used.has(k))),
    cards,
  });
}

// ── Lorcana (Lorcast) ───────────────────────────────────────────────────────
// Lorcast has no finish field. Its foil-only rarities (from its own prices:
// these never have a non-foil price) get one version, promos one version with
// no finish named, and the rest come non-foil and cold foil.
const LORCANA_FINISH = { Enchanted: 'f', Epic: 'f', Iconic: 'f', Promo: 'p' };

async function buildLorcana() {
  const { results } = await getJson('https://api.lorcast.com/v0/sets');
  const sets = {};
  const cards = {};
  const rarities = [];
  for (const s of results) {
    await new Promise((r) => setTimeout(r, 120));
    const list = await getJson(`https://api.lorcast.com/v0/sets/${encodeURIComponent(s.code)}/cards`);
    const rows = Array.isArray(list) ? list : list.results || [];
    if (!rows.length) continue;
    sets[s.code] = [s.name, s.released_at || null, rows.length, null];
    for (const c of rows) {
      if (c.lang && c.lang !== 'en') continue;
      const name = c.version ? `${c.name} - ${c.version}` : c.name;
      const rarity = String(c.rarity || 'None').replace(/_/g, ' ').replace(/\brare\b/, 'Rare');
      let i = rarities.indexOf(rarity);
      if (i < 0) i = rarities.push(rarity) - 1;
      const card = (cards[slug(name)] ||= { n: name, p: [] });
      card.p.push([s.code, String(c.collector_number), i, LORCANA_FINISH[rarity] || 'nf']);
    }
  }
  write('lorcana.json', {
    v: 1,
    game: 'lorcana',
    built: today,
    source: { name: 'Lorcast', url: 'https://lorcast.com', note: 'Card data from Lorcast. Not published or endorsed by Disney or Ravensburger. Free to everyone.' },
    rarities,
    // finish letters: n non-foil, f cold foil, p promo (finish not stated)
    sets,
    cards,
  });
}

if (which === 'all' || which === 'yugioh') await buildYugioh();
if (which === 'all' || which === 'lorcana') await buildLorcana();
if (which === 'all' || which === 'mtg') await buildMtg();
if (which === 'all' || which === 'pokemon') await buildPokemon();
