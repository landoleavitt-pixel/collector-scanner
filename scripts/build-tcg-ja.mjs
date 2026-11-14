// scripts/build-tcg-ja.mjs
//
// Japanese Pokémon card list for naming Japanese versions (research/japanese-
// pokemon-plan.md, state 1). Writes lib/tcg/catalog/pokemon-ja.json from
// TCGdex's Japanese data (MIT licence), for the sets data/tcg/ja-coverage.json
// marks complete ("full") only. We never fill gaps ourselves.
//
//   node scripts/build-tcg-ja.mjs
//
// What it keeps, per Japanese card: set code, card number, rarity name, and
// the Pokédex numbers (or, for Trainers, the Japanese name), so a listing's
// set code + number can be checked against the card searched. Also the
// English cards' Pokédex numbers (one GraphQL request), keyed like
// lib/tcg/catalog/pokemon.json. Text only, no images.
//
// About 1,200 requests (TCGdex lists come 100 at a time), 3 at once with a
// short pause; about ten minutes. Run it monthly, after scripts/build-tcg-catalog.mjs.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Same keys as scripts/build-tcg-catalog.mjs ("Sheoldred, the Apocalypse" →
// "sheoldred-the-apocalypse"). Copied, because importing that script runs it.
const slug = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.tcgdex.net/v2';
const HEADERS = { 'User-Agent': 'FieldsAndFloors/1.0 (catalog import)', Accept: 'application/json' };

async function getJson(url, init = {}, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i + 1 >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Every page of a filtered Japanese list.
async function allPages(query) {
  const out = [];
  for (let page = 1; page < 200; page++) {
    const batch = await getJson(`${API}/ja/cards?${query}&pagination:page=${page}&pagination:itemsPerPage=100`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

// A polite pace for a free, volunteer-run API: a few requests at a time, with
// a short pause after each.
async function pool(items, n, fn) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      results[k] = await fn(items[k]);
      await new Promise((r) => setTimeout(r, 150));
    }
  }));
  return results;
}

const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/tcg/ja-coverage.json'), 'utf8'));
const full = new Map(coverage.sets.filter((s) => s.language === 'ja' && s.full).map((s) => [s.setCode, s]));

// English cards → Pokédex numbers, keyed as in pokemon.json.
const en = (await getJson(`${API}/graphql`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ cards { name dexId set { id } } }' }),
})).data.cards;
const enDex = {};
for (const c of en) {
  if (!c.dexId?.length || c.set?.id?.startsWith('tcgp')) continue;
  const key = slug(c.name) + (/\bEX\b/.test(c.name) ? '-xy' : '');
  enDex[key] = [...new Set([...(enDex[key] || []), ...c.dexId])];
}
const maxDex = Math.max(...Object.values(enDex).flat());

// Japanese cards: every card once (id, number, Japanese name), then rarity and
// Pokédex number by filtered lists.
const all = await getJson(`${API}/ja/cards`);
const cards = {};
for (const c of all) {
  const set = c.id.slice(0, c.id.length - c.localId.length - 1);
  if (!full.has(set)) continue;
  cards[`${set}:${c.localId}`] = { n: c.name };
}
const rarities = (await getJson(`${API}/ja/rarities`)).filter((r) => r !== 'None');
await pool(rarities, 3, async (r) => {
  for (const c of await allPages(`rarity=eq:${encodeURIComponent(r)}`)) {
    const set = c.id.slice(0, c.id.length - c.localId.length - 1);
    const row = cards[`${set}:${c.localId}`];
    if (row) row.r = r;
  }
});
await pool(Array.from({ length: maxDex }, (_, i) => i + 1), 3, async (dex) => {
  for (const c of await allPages(`dexId=eq:${dex}`)) {
    const set = c.id.slice(0, c.id.length - c.localId.length - 1);
    const row = cards[`${set}:${c.localId}`];
    if (row) (row.d ||= []).push(dex);
  }
});

// Compact rows: "SET:number" → [rarity index, Japanese name, Pokédex numbers…]
// (no numbers for Trainers and Energy).
const rIdx = [];
const ix = (r) => { const v = r || 'None'; let i = rIdx.indexOf(v); if (i < 0) i = rIdx.push(v) - 1; return i; };
const out = {};
for (const [k, c] of Object.entries(cards)) out[k] = [ix(c.r), c.n, ...(c.d || [])];
const today = new Date().toISOString().slice(0, 10);
const file = path.join(root, 'lib/tcg/catalog/pokemon-ja.json');
fs.writeFileSync(file, JSON.stringify({
  v: 1,
  built: today,
  source: { name: 'TCGdex', url: 'https://tcgdex.dev', note: 'Japanese card data from TCGdex (MIT licence). Complete sets only.' },
  sets: Object.fromEntries([...full.values()].map((s) => [s.setCode, [s.nameJa, s.releaseDate || null]])),
  rarities: rIdx,
  cards: out,
  enDex,
}));
console.log(`pokemon-ja.json: ${Object.keys(out).length} cards in ${full.size} sets, ${Object.keys(enDex).length} English cards with Pokédex numbers, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
