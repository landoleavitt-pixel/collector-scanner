// lib/playerSuggest.js
//
// Player-name help for the search box. Runs entirely in the browser: no
// network, no API, no cost. page.js loads this module lazily after first
// paint, so the ~40 KB player list never slows the landing page.
//
//   suggestPlayers('wemb')            → [{ name: 'Victor Wembanyama', sport: 'NBA' }, ...]
//   didYouMean('wembenyama prizm')    → { query: 'Wembanyama prizm', name: 'Victor Wembanyama' }
//
// didYouMean only ever suggests. Sellers misspell names too, and some buyers
// hunt those listings on purpose, so the search always runs as typed.

import rosters from './athletes-rosters.json';
import { STARS, LEGENDS, PROSPECTS, NICKNAMES } from './athletes';
import { CARD_COMPANIES } from './cardBrands';

export function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

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

// Every word that appears in some player's name. A query made only of these
// (plus card words) is treated as correctly spelled.
const NAME_TOKENS = new Set(players.flatMap((p) => p.tokens));
// Last names, for single-word typos ("wembenyama" → "Wembanyama").
const LAST_NAMES = new Map(); // normalized last token → best entry
for (const p of players) {
  const last = lastToken(p);
  const cur = LAST_NAMES.get(last);
  if (!cur || (p.popular && !cur.popular)) LAST_NAMES.set(last, p);
}

const NICK = new Map(Object.entries(NICKNAMES).map(([k, v]) => [normalizeName(k), v]));

function lastToken(p) {
  // "Ken Griffey Jr." → "griffey", not "jr".
  const t = p.tokens.filter((x) => !/^(jr|sr|ii|iii|iv)$/.test(x));
  return t[t.length - 1] || p.tokens[p.tokens.length - 1];
}

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

// ── Distance ──────────────────────────────────────────────────────────

/** Optimal-string-alignment distance (Levenshtein + adjacent swaps). */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// How many typos we forgive for a word of this length.
function allowedEdits(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 10) return 2;
  return 3;
}

// ── Autocomplete ──────────────────────────────────────────────────────

/**
 * Up to `limit` players for what's typed so far. Prefix matches on any part
 * of the name first ("wemb", "victor w"), then near-misses for longer input.
 */
export function suggestPlayers(input, limit = 6) {
  const q = normalizeName(input);
  if (q.length < 2) return [];
  const qTokens = q.split(' ');
  const scored = [];

  const nick = NICK.get(q);
  for (const p of players) {
    let score = 0;
    if (nick && normalizeName(nick) === p.n) score = 120;
    else if (p.n === q) score = 110;
    else if (p.n.startsWith(q)) score = 100;
    else if (prefixTokens(p.tokens, qTokens)) score = 85;
    else if (q.length >= 4) {
      // Near-miss: compare to the name (or last name) cut to the typed length.
      const max = allowedEdits(q.length);
      const d = Math.min(
        editDistance(q, p.n.slice(0, q.length), max),
        editDistance(q, lastToken(p).slice(0, q.length), max),
        editDistance(q, p.n, max),
      );
      if (d <= max && d > 0) score = 60 - d * 10;
    }
    if (!score) continue;
    scored.push({ p, score: score + (p.popular ? 15 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.p.n.length - b.p.n.length || a.p.n.localeCompare(b.p.n));
  return scored.slice(0, limit).map(({ p }) => ({ name: p.name, sport: p.sport }));
}

// Each typed word is the start of a different name word, in order:
// "vic wem" → Victor Wembanyama, "wem" → Victor Wembanyama.
function prefixTokens(nameTokens, qTokens) {
  let i = 0;
  for (const qt of qTokens) {
    while (i < nameTokens.length && !nameTokens[i].startsWith(qt)) i++;
    if (i === nameTokens.length) return false;
    i++;
  }
  return true;
}

// ── Did you mean ──────────────────────────────────────────────────────

const SUFFIX = /^(jr|sr|ii|iii|iv)$/;
const isCardWord = (t) => /\d/.test(t) || CARD_WORDS.has(t);
const isNoise = (t) => t.length <= 2 || isCardWord(t);

// Full names with and without a trailing "Jr.", for "is this a real player?"
const FULL_NAMES = new Set(players.flatMap((p) => {
  const t = p.tokens;
  return SUFFIX.test(t[t.length - 1]) ? [p.n, t.slice(0, -1).join(' ')] : [p.n];
}));

/**
 * If the query's player name looks misspelled, return the corrected query
 * (other words kept as typed) and the player it points at. Otherwise null.
 */
export function didYouMean(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const words = raw.split(/\s+/);
  const norm = words.map((w) => normalizeName(w));
  const qAll = norm.join(' ').trim();

  // Whole query is a nickname: "wemby" → Victor Wembanyama. Skipped when the
  // nickname is itself a real name ("Ohtani"), since that search is fine.
  const nick = NICK.get(qAll);
  if (nick && !qAll.split(' ').every((t) => NAME_TOKENS.has(t))) {
    return { query: nick, name: nick, sport: byName.get(normalizeName(nick))?.[0]?.sport || null };
  }

  // Spans worth checking, each with how many typos we'd forgive:
  //  - any 1–3 word span holding a word that's in no player's name
  //    ("wembenyama", "conor bedord")
  //  - a 2–3 word run of real name words that isn't a real player
  //    ("micheal jordan", "jackson holiday"). Stricter: one typo only.
  const spans = new Map(); // "start:end" → max edits
  const addSpan = (start, end, max) => {
    const k = `${start}:${end}`;
    spans.set(k, Math.max(spans.get(k) ?? 0, max));
  };
  const unknownAt = (i) => norm[i] && !isNoise(norm[i]) && !NAME_TOKENS.has(norm[i]);
  for (let i = 0; i < norm.length; i++) {
    if (!unknownAt(i)) continue;
    for (let len = 1; len <= 3; len++) {
      for (let start = Math.max(0, i - len + 1); start <= i; start++) {
        const end = start + len;
        if (end > norm.length || norm.slice(start, end).some((t) => !t || isCardWord(t))) continue;
        addSpan(start, end, allowedEdits(norm.slice(start, end).join('').length));
      }
    }
  }
  for (let start = 0; start < norm.length; start++) {
    for (let len = 2; len <= 3; len++) {
      const end = start + len;
      if (end > norm.length) continue;
      const span = norm.slice(start, end);
      if (span.some((t) => !t || isCardWord(t) || !NAME_TOKENS.has(t))) continue;
      if (FULL_NAMES.has(span.join(' '))) continue;
      addSpan(start, end, 1);
    }
  }
  // A real player's name anywhere in the query means the name is fine.
  for (let start = 0; start < norm.length; start++) {
    for (let len = 1; len <= 4 && start + len <= norm.length; len++) {
      if (len > 1 && FULL_NAMES.has(norm.slice(start, start + len).join(' '))) return null;
    }
  }
  if (spans.size === 0) return null;

  let best = null;
  const consider = (start, end, entry, d, kind) => {
    // Fewer typos first; then a full-name match over a last-name-only one,
    // popular players, and longer spans.
    const rank = d * 10 - (kind === 'full' ? 10 : 0) - (entry.popular ? 5 : 0) - (end - start);
    if (!best || rank < best.rank) best = { start, end, entry, d, kind, rank };
  };

  for (const [key, max] of spans) {
    if (max === 0) continue;
    const [start, end] = key.split(':').map(Number);
    const text = norm.slice(start, end).join(' ');
    const compact = text.replace(/ /g, '');
    const n = text.split(' ').length;
    if (n > 1 || end - start > 1) {
      for (const p of players) {
        // Compare word-for-word; a trailing "Jr." on the name is optional.
        const tokens = SUFFIX.test(p.tokens[p.tokens.length - 1]) ? p.tokens.slice(0, -1) : p.tokens;
        if (tokens.length < 2) continue;
        if (p.n[0] !== text[0] && max < 2) continue;
        // Spacing-insensitive, so "Ja Marr Chase" finds Ja'Marr Chase.
        const d = editDistance(compact, tokens.join(''), max);
        if (d > 0 && d <= max) consider(start, end, p, d, 'full');
        else if (d === 0 && text !== tokens.join(' ')) consider(start, end, p, 0.5, 'full');
      }
    } else {
      // Single word: compare against last names ("wembenyama").
      for (const [last, p] of LAST_NAMES) {
        if (last[0] !== text[0]) continue;
        const d = editDistance(text, last, max);
        if (d > 0 && d <= max) consider(start, end, p, d, 'last');
      }
    }
  }
  if (!best) return null;

  let { start, end } = best;
  const { entry, kind } = best;
  // The full name already carries "Jr."; don't keep the typed one too.
  if (kind === 'full' && SUFFIX.test(entry.tokens[entry.tokens.length - 1]) && SUFFIX.test(norm[end] || '')) end += 1;
  const replacement = kind === 'full' ? entry.name : properLast(entry);
  const out = [...words.slice(0, start), replacement, ...words.slice(end)].join(' ');
  if (normalizeName(out) === qAll) return null;
  return { query: out, name: entry.name, sport: entry.sport };
}

// Display spelling of a player's last name, "Wembanyama" from the entry.
function properLast(p) {
  const parts = p.name.split(/\s+/);
  const last = lastToken(p);
  return parts.find((w) => normalizeName(w) === last) || parts[parts.length - 1];
}

// ── Recent searches ───────────────────────────────────────────────────

// Card words collectors write in capitals.
const UPPER_WORDS = new Set(['psa', 'bgs', 'sgc', 'cgc', 'rc', 'rpa', 'sp', 'ssp', 'ud', 'opc', 'bcp', 'yg', 'nba', 'wnba', 'nfl', 'mlb', 'nhl']);

/**
 * Proper capitals for a search term: player names as listed
 * ("connor mcdavid prizm" → "Connor McDavid Prizm"), card abbreviations in
 * capitals, everything else title-cased. Numbers and "/25" stay as typed.
 */
export function tidySearchTerm(term) {
  const words = String(term || '').trim().split(/\s+/).filter(Boolean);
  const norm = words.map((w) => normalizeName(w));
  const out = [];
  for (let i = 0; i < words.length; ) {
    // Longest player name starting here, up to 4 words.
    let matched = false;
    for (let len = Math.min(4, words.length - i); len >= 2; len--) {
      const entries = byName.get(norm.slice(i, i + len).join(' '));
      if (entries) { out.push(entries[0].name); i += len; matched = true; break; }
    }
    if (matched) continue;
    const w = words[i];
    const n = norm[i];
    const last = LAST_NAMES.get(n);
    if (last && !CARD_WORDS.has(n)) out.push(properLast(last));
    else if (UPPER_WORDS.has(n)) out.push(w.toUpperCase());
    else if (/[0-9/]/.test(w)) out.push(w);
    else out.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    i += 1;
  }
  return out.join(' ');
}

/**
 * Clean a newest-first recent-search list: proper capitals, and one entry
 * per search, so "Paul Skenes" and a typo'd "Paul Skeenes" share a slot.
 * Keeps the correctly spelled version, correcting a typo-only entry.
 */
export function tidyRecentSearches(list, max = 5) {
  const groups = new Map(); // key → { terms }
  for (const raw of list || []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const fix = didYouMean(raw);
    const key = normalizeName(fix ? fix.query : raw);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ raw, ok: !fix, fixed: fix?.query });
  }
  // A typo-only entry shows (and re-runs) the corrected spelling.
  return [...groups.values()]
    .map((terms) => { const ok = terms.find((t) => t.ok); return tidySearchTerm(ok ? ok.raw : terms[0].fixed); })
    .slice(0, max);
}

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
