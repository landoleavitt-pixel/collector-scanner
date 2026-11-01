// scripts/build-tcg-catalog.mjs
//
// Builds the card catalogs behind "every version of a card" (Foils & Fables):
//   lib/tcg/catalog/mtg.json      every paper Magic printing, from Scryfall
//   lib/tcg/catalog/pokemon.json  every English Pokémon card, from TCGdex
//
//   node scripts/build-tcg-catalog.mjs            both games
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
// About 5 requests in all. Re-run once a month, or when a new set comes out.

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
    setRows[s.code] = [s.name, s.released_at || null, s.set_type, s.parent_set_code || null];
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

if (which === 'all' || which === 'mtg') await buildMtg();
if (which === 'all' || which === 'pokemon') await buildPokemon();
