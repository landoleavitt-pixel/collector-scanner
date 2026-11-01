// lib/playerSuggest.js
//
// Player-name help for the search box. Runs entirely in the browser: no
// network, no API, no cost. page.js loads this module lazily after first
// paint, so the ~40 KB player list never slows the landing page. The matching
// itself is lib/nameMatcher.js, shared with Foils & Fables (lib/cardNameSuggest.js).
//
//   suggestPlayers('wemb')            → [{ name: 'Victor Wembanyama', sport: 'NBA' }, ...]
//   didYouMean('wembenyama prizm')    → { query: 'Wembanyama prizm', name: 'Victor Wembanyama' }
//
// didYouMean only ever suggests. Sellers misspell names too, and some buyers
// hunt those listings on purpose, so the search always runs as typed.

import rosters from './athletes-rosters.json';
import { STARS, LEGENDS, PROSPECTS, NICKNAMES } from './athletes';
import { CARD_COMPANIES } from './cardBrands';
import { normalizeName, createNameMatcher } from './nameMatcher';

export { normalizeName };

// ── Player index ──────────────────────────────────────────────────────
// Popular = hand-picked stars, legends and prospects. They sort first and
// win "Did you mean" ties against a same-distance depth-chart name.

const players = [];
const byName = new Map(); // normalized full name → entries
function add(name, sport, popular) {
  const n = normalizeName(name);
  if (!n) return;
  const existing = byName.get(n) || [];
  const same = existing.find((p) => p.sport === sport);
  if (same) { same.popular = same.popular || popular; return; }
  // A prospect or college player who's also on a pro roster: keep the pro
  // entry (a hand-picked prospect still marks it popular).
  if ((sport === 'Prospect' || sport === 'College') && existing.length) {
    if (popular) existing.forEach((p) => { p.popular = true; });
    return;
  }
  const entry = { name, sport, n, tokens: n.split(' '), popular };
  players.push(entry);
  byName.set(n, [...existing, entry]);
}
const split = (s) => s.split('|');
// Curated first so their display spelling wins.
[...STARS, ...LEGENDS, ...PROSPECTS].forEach((s) => add(...split(s), true));
// Pro rosters before college, so a name on both shows as the pro.
rosters.players.filter(([, sp]) => sp !== 'College').forEach(([name, sport]) => add(name, sport, false));
rosters.players.filter(([, sp]) => sp === 'College').forEach(([name, sport]) => add(name, sport, false));

// Words that belong to the card, not the player. Never "corrected".
const CARD_WORDS = new Set([
  ...CARD_COMPANIES.flatMap((c) => [c.label, ...c.lines.map((l) => l.label)]).flatMap((s) => normalizeName(s).split(' ')),
  'auto', 'autos', 'autograph', 'autographed', 'signed', 'rookie', 'rookies', 'rc', 'rpa', 'patch', 'jersey', 'relic',
  'refractor', 'refractors', 'xfractor', 'superfractor', 'parallel', 'insert', 'base', 'card', 'cards', 'lot', 'sp', 'ssp',
  'psa', 'bgs', 'sgc', 'cgc', 'graded', 'raw', 'gem', 'mint', 'slab', 'numbered', 'first', '1st', 'draft', 'prospect',
  'prospects', 'chrome', 'sapphire', 'holo', 'silver', 'gold', 'red', 'blue', 'green', 'orange', 'purple', 'black',
  'pink', 'white', 'yellow', 'aqua', 'teal', 'bronze', 'platinum', 'ruby', 'emerald', 'shimmer', 'wave', 'mojo', 'lava',
  'speckle', 'cracked', 'ice', 'disco', 'camo', 'tiger', 'zebra', 'snakeskin', 'scope', 'hyper', 'pulsar', 'velocity',
  'color', 'blast', 'kaboom', 'downtown', 'case', 'hit', 'variation', 'image', 'short', 'print', 'die', 'cut', 'logoman',
  'shield', 'dual', 'triple', 'quad', 'booklet', 'one', 'of', 'only', 'the', 'and', 'by', 'basketball', 'football',
  'baseball', 'hockey', 'nba', 'wnba', 'nfl', 'mlb', 'nhl', 'ncaa', 'college', 'university', 'chronicles', 'hoops',
  'score', 'leaf', 'metal', 'cup', 'young', 'guns', 'canvas', 'dynasty', 'tribute', 'museum', 'triple', 'threads',
  'sterling', 'inception', 'tier', 'jumbo', 'mega', 'hobby', 'retail', 'blaster', 'box', 'pack', 'sealed', 'graded',
]);

// Card words collectors write in capitals.
const UPPER_WORDS = new Set(['psa', 'bgs', 'sgc', 'cgc', 'rc', 'rpa', 'sp', 'ssp', 'ud', 'opc', 'bcp', 'yg', 'nba', 'wnba', 'nfl', 'mlb', 'nhl']);

const matcher = createNameMatcher({ players, nicknames: NICKNAMES, cardWords: CARD_WORDS, upperWords: UPPER_WORDS });
export const { suggestPlayers, didYouMean, tidySearchTerm } = matcher;

// The sport of an exact player name, as the card-set parser names sports
// ('football', 'baseball', 'basketball', 'hockey'), 'college' for a college
// player (the roster doesn't say which sport, but it rules out MLB/NHL
// sets), or null when unknown or ambiguous (two players with that name in
// different sports).
const LEAGUE_SPORT = { NFL: 'football', MLB: 'baseball', Prospect: 'baseball', NBA: 'basketball', WNBA: 'basketball', NHL: 'hockey', College: 'college' };
export function sportOfPlayer(name) {
  const entries = byName.get(normalizeName(name || '')) || [];
  const sports = [...new Set(entries.map((e) => LEAGUE_SPORT[e.sport]).filter(Boolean))];
  return sports.length === 1 ? sports[0] : null;
}
