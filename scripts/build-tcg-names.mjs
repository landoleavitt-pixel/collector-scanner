// scripts/build-tcg-names.mjs
//
// Builds lib/tcg-names.json: the card and character names behind Foils &
// Fables search suggestions ("Did you mean Charizard?"). Run by hand when a
// big set comes out:
//
//   node scripts/build-tcg-names.mjs
//
// Names only (facts), no card text, no images. Each source's rules:
//   Pokémon     TCGdex (api.tcgdex.net). Free, open source (MIT).
//   Magic       Scryfall (api.scryfall.com). Their rules: send a User-Agent
//               and Accept header, wait 50–100 ms between requests, and keep
//               anything built on their data free to use. Suggestions are
//               free for everyone, signed in or not.
//   Yu-Gi-Oh!   YGOPRODeck (db.ygoprodeck.com). Max 20 requests a second, and
//               download once rather than calling per user. One request.
//   Lorcana     Lorcast (api.lorcast.com). About 10 requests a second;
//               we wait 100 ms between requests.
//   One Piece   No free catalog we may use (Bandai's card list can't be
//               scraped), so a short hand list of main character names.
//
// Kept small: popular names only for the games with huge catalogs. The page
// loads this file lazily after first paint, like the sports player list.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tcg-names.json');
const HEADERS = { 'User-Agent': 'FieldsAndFloors/1.0 (fieldsandfloors.com)', Accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await sleep(1000 * (attempt + 1));
  }
  throw new Error(`Failed: ${url}`);
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// Most-printed first, then A–Z.
const rank = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

// ── Pokémon (TCGdex) ────────────────────────────────────────────────────
// "Charizard ex", "Charizard VMAX" and "Charizard" are one name to search.
const POKEMON_SUFFIX = /(?:[\s-]+(?:ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|Prime|LEGEND|δ|☆|Star|Radiant))+$/;
async function pokemon() {
  const cards = await get('https://api.tcgdex.net/v2/en/cards');
  await sleep(100);
  const sets = await get('https://api.tcgdex.net/v2/en/sets');
  const counts = new Map();
  for (const c of cards || []) {
    const name = String(c.name || '').replace(POKEMON_SUFFIX, '').trim();
    // Basic Energy cards aren't something anyone hunts by name.
    if (!name || name.length > 40 || name.includes('&') || / Energy$/.test(name)) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const ranked = rank(counts).filter(([, n]) => n >= 2).slice(0, 2200);
  return {
    label: 'Pokémon',
    names: ranked.map(([n]) => n),
    popular: ranked.slice(0, 150).map(([n]) => n),
    setNames: (sets || []).map((s) => s.name),
  };
}

// ── Magic (Scryfall) ────────────────────────────────────────────────────
// The most-played cards (Scryfall's EDHREC order) plus the Reserved List,
// which holds the old high-value cards that aren't ranked by play.
async function scryfallSearch(q, maxPages) {
  const names = [];
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=edhrec&unique=cards`;
  for (let page = 0; url && page < maxPages; page++) {
    const d = await get(url);
    await sleep(120);
    if (!d) break;
    for (const c of d.data || []) names.push(c.name.split(' // ')[0]);
    url = d.has_more ? d.next_page : null;
  }
  return names;
}
async function magic() {
  const played = await scryfallSearch('game:paper -is:funny -t:basic', 14);
  const reserved = await scryfallSearch('is:reserved', 5);
  const sets = await get('https://api.scryfall.com/sets');
  const keepSet = new Set(['core', 'expansion', 'masters', 'draft_innovation', 'commander', 'starter', 'eternal']);
  const names = [...new Set([...played, ...reserved])];
  return {
    label: 'Magic',
    names,
    popular: [...new Set([...played.slice(0, 250), ...reserved.slice(0, 50)])],
    setNames: (sets?.data || []).filter((s) => keepSet.has(s.set_type)).map((s) => s.name),
  };
}

// ── Yu-Gi-Oh! (YGOPRODeck) ──────────────────────────────────────────────
async function yugioh() {
  const d = await get('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes');
  await sleep(100);
  const sets = await get('https://db.ygoprodeck.com/api/v7/cardsets.php');
  const cards = (d?.data || [])
    .filter((c) => !/token|skill/i.test(c.type || ''))
    .map((c) => ({ name: c.name, views: c.misc_info?.[0]?.views || 0 }))
    .sort((a, b) => b.views - a.views);
  const names = [...new Set(cards.map((c) => c.name))].filter((n) => n.length <= 40).slice(0, 2500);
  return {
    label: 'Yu-Gi-Oh!',
    names,
    popular: names.slice(0, 200),
    setNames: (sets || []).map((s) => s.set_name),
  };
}

// ── Lorcana (Lorcast) ───────────────────────────────────────────────────
// Character names ("Elsa"), not versions ("Snow Queen"), since that's what
// listing titles lead with.
async function lorcana() {
  const sets = (await get('https://api.lorcast.com/v0/sets'))?.results || [];
  const counts = new Map();
  for (const s of sets) {
    await sleep(120);
    const cards = await get(`https://api.lorcast.com/v0/sets/${encodeURIComponent(s.id)}/cards`);
    for (const c of cards || []) if (c.name) counts.set(c.name, (counts.get(c.name) || 0) + 1);
  }
  const ranked = rank(counts);
  return {
    label: 'Lorcana',
    names: ranked.map(([n]) => n),
    popular: ranked.filter(([, n]) => n >= 4).map(([n]) => n),
    setNames: sets.map((s) => s.name),
  };
}

// ── One Piece (hand list of main characters) ────────────────────────────
const ONE_PIECE = [
  'Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Usopp', 'Sanji', 'Tony Tony Chopper', 'Nico Robin', 'Franky', 'Brook', 'Jinbe',
  'Portgas D. Ace', 'Sabo', 'Shanks', 'Trafalgar Law', 'Eustass Kid', 'Boa Hancock', 'Yamato', 'Kaido', 'Charlotte Linlin',
  'Edward Newgate', 'Marshall D. Teach', 'Dracule Mihawk', 'Crocodile', 'Donquixote Doflamingo', 'Kozuki Oden', 'Gol D. Roger',
  'Silvers Rayleigh', 'Monkey D. Garp', 'Sakazuki', 'Borsalino', 'Kuzan', 'Smoker', 'Koby', 'Enel', 'Rob Lucci', 'Buggy',
  'Uta', 'Vivi', 'Nefeltari Vivi', 'Perona', 'Bartolomeo', 'Cavendish', 'Kalifa', 'Marco', 'Katakuri', 'Charlotte Katakuri',
  'Big Mom', 'Whitebeard', 'Blackbeard', 'King', 'Queen', 'Jewelry Bonney', 'Kouzuki Hiyori', 'Carrot', 'Rebecca', 'Kid',
  'Killer', 'Basil Hawkins', 'X Drake', 'Capone Bege', 'Urouge', 'Scratchmen Apoo', 'Emporio Ivankov', 'Bon Clay', 'Arlong',
  'Kuro', 'Don Krieg', 'Wapol', 'Gecko Moria', 'Bartholomew Kuma', 'Vegapunk', 'Sengoku', 'Fujitora', 'Ryokugyu', 'Kizaru',
  'Aokiji', 'Akainu', 'Lucy', 'Sugar', 'Hody Jones', 'Shirahoshi', 'Otama', 'Kinemon', 'Momonosuke', 'Kozuki Momonosuke',
];
function onePiece() {
  const names = [...new Set(ONE_PIECE)];
  return { label: 'One Piece', names, popular: names.slice(0, 20), setNames: [] };
}

// ── Build ───────────────────────────────────────────────────────────────
const games = {};
for (const [key, fn] of [['pokemon', pokemon], ['mtg', magic], ['yugioh', yugioh], ['lorcana', lorcana], ['onepiece', onePiece]]) {
  process.stdout.write(`${key}… `);
  games[key] = await fn();
  console.log(`${games[key].names.length} names`);
}

// Set-name words are card words: never "corrected" ("charizard obsidian
// flames" is fine). Words that are also in card names stay out, so a typo
// near a real name still gets help.
const nameTokens = new Set(Object.values(games).flatMap((g) => g.names.flatMap((n) => norm(n).split(' '))));
const setWords = [...new Set(Object.values(games).flatMap((g) => g.setNames.flatMap((n) => norm(n).split(' '))))]
  .filter((t) => t.length > 2 && !/\d/.test(t) && !nameTokens.has(t))
  .sort();

const out = {
  built: new Date().toISOString().slice(0, 10),
  sources: 'Pokémon: TCGdex. Magic: Scryfall. Yu-Gi-Oh!: YGOPRODeck. Lorcana: Lorcast. One Piece: hand list.',
  games: Object.fromEntries(Object.entries(games).map(([k, g]) => {
    const popular = new Set(g.popular);
    return [k, { label: g.label, popular: g.names.filter((n) => popular.has(n)), names: g.names.filter((n) => !popular.has(n)) }];
  })),
  setWords,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${OUT} (${Math.round(JSON.stringify(out).length / 1024)} KB, ${setWords.length} set words)`);
