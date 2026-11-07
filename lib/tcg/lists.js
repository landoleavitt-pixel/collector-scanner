// lib/tcg/lists.js
//
// Card lists to browse (DECISIONS.md 2026-11-07, "card lists front and
// center"): popular lists, every card A–Z, and name search, for the games with
// a catalog. Cards only: no eBay calls, no card images (we don't store or link
// catalog images; research/non-sports-filters.md section 0).
//
//   popularLists(game)            the favourites from research/popular-card-lists.md
//   popularPhotos(game)           a live seller's photo for each (eBay, cached an hour)
//   lettersOf(game)               which letters have lists, with counts
//   familiesByLetter(game, letter) every list starting with a letter ('#' = digits and symbols)
//   searchLists(game, q)          lists for what was typed
//
// A list is a card family (lib/tcg/catalog.js cardFamily): { key, name,
// versions, cards, family: true }. name is what the checklist opens
// (/fables/checklist?game=…&name=<name>) and versions is the family's total,
// the same count the checklist shows. key is the family's own card, or its first.

import { catalogData, findCards, cardFamily, cardBase, versionsOf, getCard } from './catalog';
import { normalize } from './parseTitle';
import { bestMatch } from './catalogMatch';
import { gameByKey, TCG_SINGLES_CATEGORY } from './games';
import { normalizeItem } from './search';
import { getAppToken, browseSearch } from '../ebay';

// The favourites from research/popular-card-lists.md (2026-11-07), in its
// order. Pokémon: most-graded characters (GemRate, PSA data); Magic: collector
// favourites (TCGplayer sales reports); Yu-Gi-Oh!: icons by YGOPRODeck page
// views; Lorcana: characters on a most-valuable list (price, a weak ranking).
// Review yearly (section 6 there).
const POPULAR = {
  pokemon: ['Charizard', 'Pikachu', 'Mew', 'Mewtwo', 'Gengar', 'Umbreon', 'Eevee', 'Blastoise', 'Venusaur', 'Rayquaza', 'Gyarados'],
  mtg: ["Gaea's Cradle", 'Mox Amber', 'The One Ring', 'Sol Ring', 'Black Lotus', 'Underground Sea', 'Mana Crypt', 'Force of Will', 'Sheoldred', 'Ragavan', 'Orcish Bowmasters'],
  yugioh: ['Dark Magician', 'Blue-Eyes White Dragon', 'Mirror Force', 'Red-Eyes Dark Dragoon', 'Pot of Greed', 'Blue-Eyes Alternative White Dragon', 'Cyber Dragon', 'Red-Eyes Black Dragon', 'Black Luster Soldier - Envoy of the Beginning', 'Dark Magician Girl', 'Exodia the Forbidden One'],
  lorcana: ['Mickey Mouse', 'Elsa', 'Stitch', 'Minnie Mouse', 'Maleficent', 'Captain Hook'],
};
export const POPULAR_SOURCE = {
  pokemon: 'The most-graded Pokémon (GemRate, from PSA data).',
  mtg: 'Cards collectors hunt for, from TCGplayer sales reports.',
  yugioh: 'The most looked-up famous cards (YGOPRODeck page views).',
  lorcana: 'Characters on a most-valuable list (TCGplayer prices).',
};

const versionCounts = {};
function versionCount(game, key) {
  if (!versionCounts[game]) {
    const counts = {};
    for (const [k, c] of Object.entries(catalogData(game).cards)) counts[k] = c.p.reduce((n, row) => n + versionsOf(game, row).length, 0);
    versionCounts[game] = counts;
  }
  return versionCounts[game][key] || 0;
}

const card = (game, key, name) => ({ key, name, versions: versionCount(game, key) });

const popularCache = {};
// Only lists whose family really fits (match 'card'), so a favourite never
// stands for a loose word match.
export function popularLists(game) {
  if (!catalogData(game)) return [];
  if (!popularCache[game]) {
    popularCache[game] = (POPULAR[game] || []).map((name) => {
      const { cards, match } = cardFamily(game, name);
      if (!cards.length || match !== 'card') return null;
      // The family's own card if there is one ("Charizard"), else its first.
      const own = cards.find((c) => normalize(c.name) === normalize(name)) || cards[0];
      return { key: own.key, name, versions: cards.reduce((n, c) => n + versionCount(game, c.key), 0), cards: cards.length, family: true };
    }).filter(Boolean);
  }
  return popularCache[game];
}

// Every family in a game: one entry per base name (Charizard, Elsa, Sheoldred),
// named as its own card is ("Charizard"), or as the name's first part is
// written on its first card ("Sheoldred" from "Sheoldred, the Apocalypse").
const familyIndex = {};
function families(game) {
  if (!familyIndex[game]) {
    const byBase = new Map();
    for (const [key, c] of Object.entries(catalogData(game).cards)) {
      const parts = game === 'pokemon' ? c.n.split(/\s+&\s+/) : [c.n];
      for (const part of parts) {
        const base = cardBase(game, part);
        if (!base) continue;
        if (!byBase.has(base)) byBase.set(base, { base, keys: [], names: [] });
        const f = byBase.get(base);
        f.keys.push(key);
        f.names.push(c.n);
      }
    }
    familyIndex[game] = [...byBase.values()].map((f) => {
      const own = f.names.findIndex((n) => normalize(n) === f.base);
      const from = own >= 0 ? f.names[own] : f.names[0];
      const at = normalize(from).indexOf(f.base);
      const name = own >= 0 ? from : at >= 0 ? from.slice(at, at + f.base.length) : f.base;
      return { key: own >= 0 ? f.keys[own] : f.keys[0], name, versions: f.keys.reduce((n, k) => n + versionCount(game, k), 0), cards: f.keys.length, family: true };
    });
  }
  return familyIndex[game];
}

const firstChar = (name) => {
  const c = normalize(name).replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '')[0] || '#';
  return /[a-z]/.test(c) ? c.toUpperCase() : '#';
};

const byLetter = {};
function letterIndex(game) {
  if (!byLetter[game]) {
    const idx = {};
    for (const f of families(game)) (idx[firstChar(f.name)] ||= []).push(f);
    const sortKey = (name) => normalize(name).replace(/^the\s+/, '').replace(/[^a-z0-9 ]/g, '');
    for (const list of Object.values(idx)) list.sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));
    byLetter[game] = idx;
  }
  return byLetter[game];
}

export function lettersOf(game) {
  if (!catalogData(game)) return [];
  return Object.entries(letterIndex(game)).map(([letter, list]) => ({ letter, cards: list.length }))
    .sort((a, b) => (a.letter === '#') - (b.letter === '#') || a.letter.localeCompare(b.letter));
}

export function familiesByLetter(game, letter, offset = 0, limit = 200) {
  if (!catalogData(game)) return { cards: [], total: 0 };
  const list = letterIndex(game)[letter === '#' ? '#' : String(letter).toUpperCase()] || [];
  return { cards: list.slice(offset, offset + limit), total: list.length };
}

// Lists for what was typed: families whose name starts with it first, then
// those holding it at a word start; or the family of any card that matches.
export function searchLists(game, q, limit = 50) {
  if (!catalogData(game)) return [];
  const t = normalize(q).trim();
  if (t.length < 2) return [];
  const all = families(game);
  const starts = all.filter((f) => normalize(f.name).startsWith(t));
  const word = all.filter((f) => !normalize(f.name).startsWith(t) && new RegExp(`(?:^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(normalize(f.name)));
  const out = [...starts.sort((a, b) => a.name.length - b.name.length), ...word.sort((a, b) => b.versions - a.versions)];
  if (!out.length) {
    for (const c of findCards(game, q, limit)) {
      const base = cardBase(game, game === 'pokemon' ? c.name.split(/\s+&\s+/)[0] : c.name);
      const f = all.find((x) => normalize(x.name) === base || x.key === c.key);
      if (f && !out.includes(f)) out.push(f);
    }
  }
  return out.slice(0, limit);
}

// A live seller's photo for each popular list (DECISIONS.md 2026-11-07: seller
// photos only, never catalog art; cached about an hour; none → no image).
// One eBay call per list, at most once an hour per server; the route also
// asks the CDN to keep the answer an hour. The first listing that is really
// that card family (lib/tcg/family.js), not a lot, proxy or other card, wins.
const PHOTO_TTL_MS = 60 * 60 * 1000;
const photoCache = {};
export async function popularPhotos(game) {
  const hit = photoCache[game];
  if (hit && Date.now() - hit.at < PHOTO_TTL_MS) return hit.photos;
  const lists = popularLists(game);
  const token = await getAppToken();
  const photos = await Promise.all(lists.map(async (list) => {
    try {
      const cards = cardFamily(game, list.name).cards.map((c) => getCard(game, c.key)).filter(Boolean);
      const params = new URLSearchParams({
        q: list.name.replace(/[,:"]|\s-\s/g, ' ').replace(/\s+/g, ' ').trim(),
        limit: '25',
        category_ids: TCG_SINGLES_CATEGORY,
        aspect_filter: `categoryId:${TCG_SINGLES_CATEGORY},Game:{${gameByKey(game).aspect}}`,
      });
      const data = await browseSearch(params, token);
      for (const raw of data.itemSummaries || []) {
        const it = normalizeItem(raw);
        if (!it.image) continue;
        const { match } = bestMatch(game, cards, it.title);
        if (match.kind !== 'reject' && match.kind !== 'language') return it.image;
      }
    } catch { /* no photo; the tile shows the plain card shape */ }
    return null;
  }));
  const out = Object.fromEntries(lists.map((l, i) => [l.name, photos[i]]));
  photoCache[game] = { at: Date.now(), photos: out };
  return out;
}
