// lib/playerTeams.js
//
// Team search by player. Most card titles name the player but not the team
// ("2024 Topps Chrome Paul Skenes Gold /50"), so a team search also keeps a
// title when it names a player who was on that team the year the card is
// from. Server only: the player history (lib/playerTeams.json, built by
// scripts/update-athletes.mjs) is too big for the browser. The search route
// tags each listing with the teams found this way (item.teams) so the Team
// filter's counts in the browser include them.
//
// Rules, for each player named in the title:
//   - The title names a team in the player's league: that team only (same
//     as before), even if it's outside the history ("Miami Heat" on a
//     2024-25 LeBron throwback). A bare shared nickname ("Kings") counts
//     for the player's own team by that name, otherwise the card is left out.
//   - It has a card year ("2024", "2023-24"): the team the player was on
//     that season. Cards come out during a season and show the team the
//     player started it with, so the season before counts too; if the two seasons point to
//     different teams (a trade, a move), the card is unclear and left out.
//   - No year: the player's current team only. A rookie card with no year
//     only counts if the player is still on their first team.
//   - A college card (Bowman U, Chrome U, college, NCAA…, or a school name
//     like LSU or Notre Dame that no pro team uses) only counts for
//     the player's college; other cards for their pro teams, or their
//     college when they haven't played pro yet.
//   - Two players with the same name who point to different teams: unclear,
//     left out.
// The title-only rules in lib/teams.js (same-name teams like Rangers or
// Kings) still apply when a title names a team.

import DATA from './playerTeams.json';
import { STARS, PROSPECTS } from './athletes';
import { TEAMS, getTeam, titleMatchesTeam, cleanTeams, isCollegeTitle } from './teams';

// Leagues whose season spans two calendar years. The season's ESPN year is
// the year it ends (2025 = 2024-25).
const WINTER = new Set(['nba', 'nhl', 'college']);
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

export function normName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameTokens(name) {
  const t = normName(name).split(' ').filter(Boolean);
  while (t.length > 2 && SUFFIXES.has(t[t.length - 1])) t.pop();
  return t;
}

// name tokens joined -> { tokens, entries }; indexed by the last token.
const BY_LAST = new Map();
const BY_NAME = new Map();
for (const e of DATA.players) {
  const tokens = nameTokens(e.player);
  if (tokens.length < 2) continue;
  const key = tokens.join(' ');
  let rec = BY_NAME.get(key);
  if (!rec) {
    rec = { tokens, entries: [] };
    BY_NAME.set(key, rec);
    const last = tokens[tokens.length - 1];
    BY_LAST.set(last, [...(BY_LAST.get(last) || []), rec]);
  }
  rec.entries.push(e);
}

/**
 * The card's year from the title: { start, end, span } or null. "2023-24"
 * gives start 2023, end 2024, span true. With several years ("2024 Topps
 * 1989 design") the newest wins; the older one is a throwback design.
 */
export function cardYear(title) {
  const re = /(?<![\d/#])((?:19|20)\d{2})(?:\s*[-/]\s*((?:19|20)?\d{2}))?(?![\d])/g;
  const maxYear = new Date().getFullYear() + 1;
  let best = null;
  for (const m of String(title || '').matchAll(re)) {
    const start = Number(m[1]);
    if (start < 1980 || start > maxYear) continue;
    let end = start;
    let span = false;
    if (m[2]) {
      const e = m[2].length === 2 ? Math.floor(start / 100) * 100 + Number(m[2]) : Number(m[2]);
      if (e === start + 1) { end = e; span = true; }
    }
    if (!best || end > best.end) best = { start, end, span };
  }
  if (best) return best;
  // Short seasons: "23-24" anywhere; "25/26" only in the first three words,
  // since later in a title it's usually a serial number (24/25).
  const words = String(title || '').trim().split(/\s+/);
  const shortRe = /^(?<![\d#])(\d{2})\s*([-/])\s*(\d{2})$/;
  for (let i = 0; i < words.length; i++) {
    const m = shortRe.exec(words[i]);
    if (!m || (m[2] === '/' && i > 2)) continue;
    const a = Number(m[1]);
    if (Number(m[3]) !== (a + 1) % 100) continue;
    const start = a >= 80 ? 1900 + a : 2000 + a;
    if (start > maxYear) continue;
    return { start, end: start + 1, span: true };
  }
  return null;
}

// Seasons (ESPN years) to check for a stint in this league, including the
// season before (see rules above).
function seasonWindow(year, league) {
  let lo;
  let hi;
  if (WINTER.has(league)) {
    // "2023-24" is the 2024 season; a bare "2024" could be 2023-24 or 2024-25.
    [lo, hi] = year.span ? [year.end, year.end] : [year.start, year.start + 1];
  } else {
    [lo, hi] = year.span ? [year.start, year.end] : [year.start, year.start];
  }
  return [lo - 1, hi];
}

const leagueOf = (key) => key.slice(0, key.indexOf('-'));
const TEAMS_BY_LEAGUE = new Map();
for (const t of TEAMS) {
  const l = leagueOf(t.key);
  TEAMS_BY_LEAGUE.set(l, [...(TEAMS_BY_LEAGUE.get(l) || []), t]);
}

// School names that mark a college card on their own (LSU, Notre Dame):
// not a pro city or nickname, and not a word in any player's name
// ("Butler", "Baylor").
const NAME_WORDS = new Set([...BY_NAME.keys()].flatMap((k) => k.split(' ')));
const PRO_WORDS = new Set(TEAMS.filter((t) => t.league !== 'College').flatMap((t) => [...t.locs, ...t.nicks]).map(normName));
const SCHOOLS = [...new Set(TEAMS.filter((t) => t.league === 'College').flatMap((t) => t.locs).map(normName))]
  .filter((n) => n && !PRO_WORDS.has(n) && !(n.split(' ').length === 1 && NAME_WORDS.has(n)));
const SCHOOL_RE = new RegExp(`(?:^| )(?:${SCHOOLS.sort((a, b) => b.length - a.length).join('|')})(?= |$)`);
const ROOKIE_RE = /\b(?:rookie|rc|rpa)\b/i;
const isCollege = (t) => t.team.startsWith('college-');

function stintsIn(stints, year) {
  return stints.filter((s) => {
    const [lo, hi] = seasonWindow(year, leagueOf(s.team));
    return s.from <= hi && (s.to === null || s.to >= lo);
  });
}

function oneTeam(stints) {
  const keys = [...new Set(stints.map((s) => s.team))];
  return keys.length === 1 ? keys : [];
}

// Team keys this card belongs to for one catalogue entry (0 or 1, or the
// teams the title names).
function entryTeams(e, title, year, college) {
  const leagues = new Set(e.teams.map((s) => leagueOf(s.team)));
  const named = [...leagues].flatMap((l) => TEAMS_BY_LEAGUE.get(l) || [])
    .filter((t) => titleMatchesTeam(t, title)).map((t) => t.key);
  if (named.length) return named;
  // A bare shared nickname ("Kings", "Rangers") the same-name rule left
  // unclear: the player's own team by that name, or nothing.
  const t = ` ${normName(title)} `;
  const nicked = [...leagues].flatMap((l) => TEAMS_BY_LEAGUE.get(l) || []).filter((team) => team.nickRe?.test(t));
  if (nicked.length) {
    const own = new Set(e.teams.map((st) => st.team));
    return oneTeam(nicked.filter((team) => own.has(team.key)).map((team) => ({ team: team.key })));
  }
  const col = e.teams.filter(isCollege);
  const pro = e.teams.filter((s) => !isCollege(s));
  if (!year) {
    const open = (list) => list.filter((s) => s.to === null);
    const list = college || !pro.length ? col : pro;
    // A rookie card shows the first team: only safe if they never moved.
    if (ROOKIE_RE.test(title) && new Set(list.map((s) => s.team)).size > 1) return [];
    return oneTeam(open(list));
  }
  if (college) return oneTeam(stintsIn(col, year));
  const hits = stintsIn(pro, year);
  return oneTeam(hits.length ? hits : stintsIn(col, year));
}

/** Players from the catalogue named in a title: [{ key, entries }]. */
function playersInTitle(title) {
  const tokens = normName(title).split(' ').filter(Boolean);
  const found = new Map();
  tokens.forEach((tok, i) => {
    for (const rec of BY_LAST.get(tok) || []) {
      const n = rec.tokens.length;
      if (i + 1 < n) continue;
      let ok = true;
      for (let j = 0; j < n; j++) if (tokens[i - n + 1 + j] !== rec.tokens[j]) { ok = false; break; }
      if (ok) found.set(rec.tokens.join(' '), rec);
    }
  });
  return [...found.values()];
}

/** Team keys a title belongs to through the players it names. */
export function catalogTeamsForTitle(title) {
  const out = new Set();
  if (!title) return out;
  const players = playersInTitle(title);
  if (!players.length) return out;
  const year = cardYear(title);
  const college = isCollegeTitle(title) || SCHOOL_RE.test(normName(title));
  for (const rec of players) {
    const results = rec.entries.map((e) => entryTeams(e, title, year, college).sort().join(','));
    // Same name, different answers: unclear.
    if (new Set(results).size !== 1 || !results[0]) continue;
    results[0].split(',').forEach((k) => out.add(k));
  }
  return out;
}

/** Does this title belong to this team, by name or by player? */
export function matchesTeam(team, title, catalog = catalogTeamsForTitle(title)) {
  return titleMatchesTeam(team, title) || catalog.has(team.key);
}

/** Server-side Team filter test, or null when it's off. */
export function makeCatalogTeamMatcher(keys) {
  const teams = cleanTeams(keys).map(getTeam);
  if (!teams.length) return null;
  return (title, catalog) => teams.some((t) => matchesTeam(t, title, catalog));
}

// ── eBay queries for a whole-team search ──────────────────────────────

const POPULAR = new Set([...STARS, ...PROSPECTS].map((s) => nameTokens(s.split('|')[0]).join(' ')));

/**
 * Players to add to a whole-team eBay search, most useful first: the
 * hand-picked stars and prospects who are on the team now or were in the
 * last two seasons, then the rest of today's roster, longest-serving first.
 */
export function teamQueryPlayers(teamKey, limit = 24) {
  const thisYear = new Date().getFullYear();
  const recentFrom = thisYear - 2;
  const rows = [];
  for (const [key, rec] of BY_NAME) {
    // Skip names two players share: they'd only bring back unclear cards.
    if (rec.entries.length !== 1) continue;
    const stints = rec.entries[0].teams.filter((s) => s.team === teamKey);
    if (!stints.length) continue;
    const current = stints.find((s) => s.to === null);
    const popular = POPULAR.has(key);
    const recent = stints.some((s) => s.to !== null && s.to >= recentFrom);
    if (!current && !(popular && recent)) continue;
    const years = stints.reduce((n, s) => n + (s.to ?? thisYear) - s.from + 1, 0);
    rows.push({ name: rec.tokens.join(' '), display: rec.entries[0].player, popular, years });
  }
  rows.sort((a, b) => b.popular - a.popular || b.years - a.years || a.name.localeCompare(b.name));
  return rows.slice(0, limit).map((r) => queryName(r.display));
}

// The name as eBay should see it: no accents, no "Jr.", no periods.
function queryName(name) {
  const plain = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, '').replace(/["(),]/g, ' ');
  const words = plain.split(/\s+/).filter(Boolean);
  while (words.length > 2 && SUFFIXES.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(' ');
}

/**
 * Split names into eBay OR groups: ("A B", "C D", ...), each at most
 * maxChars long. eBay documents a 100-character query limit but accepted
 * 200+ in testing (Oct 2026); the default print-run group alone is ~100.
 */
export function orGroups(names, maxChars = 120, maxGroups = 3) {
  const groups = [];
  let cur = [];
  const render = (list) => `(${list.map((n) => `"${n}"`).join(', ')})`;
  for (const n of names) {
    if (cur.length && render([...cur, n]).length > maxChars) {
      groups.push(render(cur));
      cur = [];
      if (groups.length >= maxGroups) return groups;
    }
    cur.push(n);
  }
  if (cur.length && groups.length < maxGroups) groups.push(render(cur));
  return groups;
}
