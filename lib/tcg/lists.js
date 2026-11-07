// lib/tcg/lists.js
//
// Card lists to browse (DECISIONS.md 2026-11-07, "card lists front and
// center"): popular lists, every card A–Z, and name search, for the games with
// a catalog. Cards only: no eBay calls, no card images (we don't store or link
// catalog images; research/non-sports-filters.md section 0).
//
//   popularLists(game)            a short hand-picked list of families
//   lettersOf(game)               which letters have cards, with counts
//   cardsByLetter(game, letter)   every card starting with a letter ('#' = digits and symbols)
//   searchLists(game, q)          cards for what was typed
//
// Each card: { key, name, versions } (versions = how many versions the card
// list has). A popular family: { key, name, versions, cards, family: true },
// opened with /api/tcg-versions?q=<name>&family=1 or the checklist.

import { catalogData, findCards, cardFamily, versionsOf } from './catalog';
import { normalize } from './parseTitle';

// Hand-picked until we have search data: the cards collectors ask about most
// often, by our judgement, not measured. Replace with real search counts.
const POPULAR = {
  pokemon: ['Charizard', 'Pikachu', 'Umbreon', 'Mewtwo', 'Gengar', 'Lugia', 'Rayquaza', 'Eevee', 'Mew', 'Blastoise', 'Gardevoir', 'Greninja'],
  mtg: ['Black Lotus', 'The One Ring', 'Sol Ring', 'Sheoldred', 'Ragavan', 'Lightning Bolt', 'Jace', 'Mana Crypt', 'Force of Will', 'Rhystic Study'],
  yugioh: ['Blue-Eyes White Dragon', 'Dark Magician', 'Dark Magician Girl', 'Exodia the Forbidden One', 'Red-Eyes Black Dragon', 'Ash Blossom & Joyous Spring', 'Pot of Greed', 'Slifer the Sky Dragon', 'Accesscode Talker', 'Kuriboh'],
  lorcana: ['Elsa', 'Mickey Mouse', 'Stitch', 'Maleficent', 'Belle', 'Ariel', 'Tinker Bell', 'Genie', 'Ursula', 'Aladdin'],
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
export function popularLists(game) {
  if (!catalogData(game)) return [];
  if (!popularCache[game]) {
    popularCache[game] = (POPULAR[game] || []).map((name) => {
      const { cards } = cardFamily(game, name);
      if (!cards.length) return null;
      // The family's own card if there is one ("Charizard"), else its first.
      const own = cards.find((c) => normalize(c.name) === normalize(name)) || cards[0];
      return { key: own.key, name, versions: cards.reduce((n, c) => n + versionCount(game, c.key), 0), cards: cards.length, family: true };
    }).filter(Boolean);
  }
  return popularCache[game];
}

const firstChar = (name) => {
  const c = normalize(name).replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '')[0] || '#';
  return /[a-z]/.test(c) ? c.toUpperCase() : '#';
};

const byLetter = {};
function letterIndex(game) {
  if (!byLetter[game]) {
    const idx = {};
    for (const [key, c] of Object.entries(catalogData(game).cards)) (idx[firstChar(c.n)] ||= []).push({ key, name: c.n });
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

export function cardsByLetter(game, letter, offset = 0, limit = 200) {
  if (!catalogData(game)) return { cards: [], total: 0 };
  const list = letterIndex(game)[letter === '#' ? '#' : String(letter).toUpperCase()] || [];
  return { cards: list.slice(offset, offset + limit).map((c) => card(game, c.key, c.name)), total: list.length };
}

export function searchLists(game, q, limit = 50) {
  if (!catalogData(game)) return [];
  return findCards(game, q, limit).map((c) => card(game, c.key, c.name));
}
