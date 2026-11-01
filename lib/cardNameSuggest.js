// lib/cardNameSuggest.js
//
// Card and character name help for the Foils & Fables search box: the same
// autocomplete and "Did you mean" as the sports side (lib/nameMatcher.js),
// fed by lib/tcg-names.json (built by scripts/build-tcg-names.mjs from
// TCGdex, Scryfall, YGOPRODeck and Lorcast).
//
//   suggestPlayers('chariz')       → [{ name: 'Charizard', sport: 'Pokémon' }, ...]
//   didYouMean('charzard ex sir')  → { query: 'Charizard ex sir', name: 'Charizard' }
//
// Loaded lazily after first paint. Only ever suggests; the search runs as typed.

import data from './tcg-names.json';
import { normalizeName, createNameMatcher, editDistance, allowedEdits } from './nameMatcher';

export { normalizeName };

const players = [];
const seen = new Set();
function add(name, sport, popular) {
  const n = normalizeName(name);
  if (!n || seen.has(`${n}|${sport}`)) return;
  seen.add(`${n}|${sport}`);
  players.push({ name, sport, n, tokens: n.split(' '), popular });
}
// Popular names from every game first, so their spelling wins ties.
for (const g of Object.values(data.games)) g.popular.forEach((name) => add(name, g.label, true));
for (const g of Object.values(data.games)) g.names.forEach((name) => add(name, g.label, false));

// Words that belong to the card or listing, not the name. Never "corrected".
const CARD_WORDS = new Set([
  ...data.setWords,
  'pokemon', 'magic', 'mtg', 'yugioh', 'yu', 'gi', 'oh', 'lorcana', 'disney', 'one', 'piece', 'tcg', 'ccg', 'card', 'cards',
  'ex', 'gx', 'v', 'vmax', 'vstar', 'break', 'prime', 'legend', 'radiant', 'shiny', 'mega', 'tera', 'delta', 'star',
  'holo', 'reverse', 'foil', 'nonfoil', 'etched', 'textured', 'borderless', 'showcase', 'extended', 'art', 'alt', 'full',
  'illustration', 'special', 'secret', 'rare', 'ultra', 'hyper', 'double', 'super', 'common', 'uncommon', 'mythic',
  'promo', 'promos', 'prerelease', 'stamped', 'staff', 'judge', 'serialized', 'serial', 'numbered', 'signed', 'artist',
  'sir', 'ir', 'sar', 'ar', 'ur', 'sr', 'hr', 'chr', 'csr', 'tg', 'gg', 'rr', 'rrr', 'qcsr', 'starlight', 'ghost',
  'collectors', 'quarter', 'century', 'prismatic', 'platinum', 'gold', 'rainbow', 'manga', 'treasure', 'enchanted',
  'iconic', 'epic', 'legendary', 'parallel', 'alternate', 'leader', 'don', 'first', '1st', 'edition', 'unlimited',
  'shadowless', 'japanese', 'english', 'chinese', 'korean', 'jp', 'en', 'psa', 'bgs', 'cgc', 'sgc', 'tag', 'beckett',
  'graded', 'raw', 'gem', 'mint', 'nm', 'lp', 'slab', 'lot', 'sealed', 'pack', 'box', 'booster', 'etb', 'set', 'base',
  'and', 'the', 'of',
]);

const UPPER_WORDS = new Set(['psa', 'bgs', 'cgc', 'sgc', 'tag', 'ex', 'gx', 'vmax', 'vstar', 'sir', 'ir', 'sar', 'ur', 'sr', 'hr', 'tg', 'gg', 'qcsr', 'mtg', 'tcg', 'etb', 'nm']);

const matcher = createNameMatcher({ players, cardWords: CARD_WORDS, upperWords: UPPER_WORDS });
export const { suggestPlayers } = matcher;

// One word ("chariz", "umbere"): pick the closest of the names the search
// box suggests, comparing the whole name, the name cut to the typed length
// and its last word; popular names and the same first letter win ties. Card games are full of one-word names,
// and matching only the last word of a longer name ("Bear Umbra") guessed
// badly.
export function didYouMean(input) {
  const q = normalizeName(input);
  if (q.length >= 4 && !q.includes(' ') && !matcher.byName.has(q)) {
    const cands = suggestPlayers(input, 6);
    // A whole word of a real name ("luffy", "zoro") is a fine search.
    if (cands.some((c) => normalizeName(c.name).split(' ').includes(q))) return null;
    let best = null;
    for (const c of cands) {
      const n = normalizeName(c.name);
      const flat = n.replace(/ /g, '');
      const max = allowedEdits(q.length);
      const last = n.split(' ').pop();
      const d = flat.startsWith(q) ? 0 : Math.min(
        editDistance(q, flat, max), editDistance(q, flat.slice(0, q.length), max), editDistance(q, last, max),
      );
      if (d > max) continue;
      const popular = matcher.byName.get(n)?.some((e) => e.popular);
      // Typos rarely change the first letter.
      const sameStart = flat[0] === q[0] || last[0] === q[0];
      const score = d - (popular ? 0.5 : 0) - (sameStart ? 0.25 : 0);
      if (!best || score < best.score) best = { score, c };
    }
    if (best) return { query: best.c.name, name: best.c.name, sport: best.c.sport };
  }
  return matcher.didYouMean(input);
}

export const tidySearchTerm = matcher.tidySearchTerm;

// Recent searches: same rule as the sports chips (lib/recentSearches.js).
// Each chip shows and re-runs exactly what was searched, with tidy capitals;
// nothing is rewritten to a guessed spelling. A misspelled entry only merges
// into a correctly spelled one that's also in the list.
export function tidyRecentSearches(list, max = 5) {
  const groups = new Map();
  for (const raw of list || []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const fix = didYouMean(raw);
    const key = normalizeName(fix ? fix.query : raw);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ raw, ok: !fix });
  }
  return [...groups.values()]
    .map((g) => tidySearchTerm((g.find((t) => t.ok) || g[0]).raw))
    .slice(0, max);
}

// No sport hint on this side; kept so callers can treat both modules alike.
export function sportOfPlayer() { return null; }
