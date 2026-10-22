// lib/teams.js
//
// Team search. The team list (lib/teams.json) comes from
// scripts/update-athletes.mjs; nicknames and old city names are kept here
// by hand. Runs on the server (search route) and in the browser
// (dropdown, Team filter), on the listing title only — no extra eBay calls.
//
// Two uses:
//   - Searching a whole team: typing or picking "Pittsburgh Pirates" (see
//     teamFromQuery). The search route swaps the keywords for the team's
//     name and keeps only titles that match the team.
//   - Team filter on any search: filters.teams = ['mlb-pit', ...].
//
// Same-name teams: a nickname two pro teams share (Rangers, Kings, Giants,
// Cardinals, Panthers, Jets) only counts when the title also names the city
// or the sport. Unclear titles are left out rather than guessed. A
// nickname a pro team shares with a college (Tigers, Pirates, Ducks) counts
// for the pro team unless the title says it's a college card.

import TEAM_DATA from './teams.json';

// Hand-kept extras, keyed `${league}-${abbr}` (lowercase).
//   nick: other names for the team; loc: other (often old) city names.
const EXTRAS = {
  'nba-phi': { nick: ['Sixers'] },
  'nba-por': { nick: ['Blazers'] },
  'nba-min': { nick: ['Wolves'] },
  'nba-dal': { nick: ['Mavs'] },
  'nba-cle': { nick: ['Cavs'] },
  'nba-lac': { loc: ['Los Angeles'] },
  'nba-bkn': { loc: ['New Jersey'] },
  'nba-okc': { loc: ['Seattle'], nick: ['SuperSonics', 'Sonics'] },
  'nba-mem': { loc: ['Vancouver'] },
  'nba-sac': { loc: ['Kansas City'] },
  'mlb-ath': { loc: ['Oakland', 'Sacramento', 'Kansas City', 'Philadelphia'] },
  'mlb-ari': { nick: ['D-backs', 'Dbacks'] },
  'mlb-lad': { loc: ['Brooklyn'] },
  'mlb-wsh': { nick: ['Nats', 'Expos'], loc: ['Montreal'] },
  'mlb-sf': { loc: ['New York'] },
  'mlb-laa': { loc: ['Anaheim', 'California'] },
  'mlb-tb': { nick: ['Devil Rays'] },
  'mlb-cle': { nick: ['Indians'] },
  'nfl-sf': { nick: ['Niners'] },
  'nfl-ne': { nick: ['Pats'] },
  'nfl-tb': { nick: ['Bucs'] },
  'nfl-lv': { loc: ['Oakland', 'Los Angeles'] },
  'nfl-lac': { loc: ['San Diego'] },
  'nfl-lar': { loc: ['St. Louis'] },
  'nfl-ari': { loc: ['St. Louis', 'Phoenix'] },
  'nfl-wsh': { nick: ['Redskins', 'Football Team'] },
  'nfl-ten': { nick: ['Oilers'], loc: ['Houston'] },
  'nfl-ind': { loc: ['Baltimore'] },
  'nhl-tor': { nick: ['Leafs'] },
  'nhl-mtl': { nick: ['Habs'] },
  'nhl-vgk': { loc: ['Las Vegas'] },
  'nhl-utah': { loc: ['Arizona', 'Phoenix'], nick: ['Coyotes'] },
  'nhl-car': { nick: ['Whalers'], loc: ['Hartford'] },
  'nhl-col': { nick: ['Nordiques'], loc: ['Quebec'] },
  'nhl-dal': { loc: ['Minnesota'], nick: ['North Stars'] },
  'nhl-wpg': { loc: ['Atlanta'], nick: ['Thrashers'] },
  'nhl-tb': { nick: ['Bolts'] },
  'college-ala': { loc: ['Bama'] },
  'college-miss': { loc: ['Mississippi'] },
  'college-lsu': { loc: ['Louisiana State'] },
  'college-conn': { loc: ['Connecticut'] },
  'college-usc': { loc: ['Southern California', 'Southern Cal'] },
  'college-ncsu': { loc: ['North Carolina State'] },
  'college-pitt': { loc: ['Pitt'] },
  'college-unc': { loc: ['UNC'] },
  'college-mia': { loc: ['Miami FL', 'The U'] },
  'college-ta&m': { loc: ['TAMU'] },
  'college-ucf': { loc: ['Central Florida'] },
  'college-byu': { loc: ['Brigham Young'] },
  'college-tcu': { loc: ['Texas Christian'] },
  'college-smu': { loc: ['Southern Methodist'] },
};

// Shorter labels for the conference step.
const CONFERENCE_LABELS = {
  'Atlantic Coast': 'ACC', 'Big 12': 'Big 12', 'Big East': 'Big East', 'Big Ten': 'Big Ten', Southeastern: 'SEC',
};

export const TEAM_LEAGUES = ['NBA', 'WNBA', 'NFL', 'MLB', 'NHL', 'College'];

const LEAGUE_HINTS = {
  NBA: /\bnba\b|\bbasketball\b/i,
  WNBA: /\bwnba\b/i,
  NFL: /\bnfl\b|\bfootball\b/i,
  MLB: /\bmlb\b|\bbaseball\b/i,
  NHL: /\bnhl\b|\bhockey\b|\byoung\s+guns?\b/i,
  College: /\b(?:college|university|ncaa[bf]?|bowman\s+(?:u|university)|chrome\s+u|topps\s+u|u\s+now|draft\s+picks|bleu)\b/i,
};

function norm(s) {
  return String(s || '').toLowerCase().replace(/['’.]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}
function phraseRe(phrases) {
  const parts = [...new Set(phrases.map(norm).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/ /g, '\\s+'));
  return parts.length ? new RegExp(`(?:^|\\s)(?:${parts.join('|')})(?=\\s|$)`) : null;
}

export const TEAMS = TEAM_DATA.map((t) => {
  const key = `${t.league}-${t.abbr}`.toLowerCase();
  const extra = EXTRAS[key] || {};
  // ESPN gives the Athletics no city; "Athletics" is their name.
  const location = t.location === t.name ? '' : t.location;
  const nicks = [t.name, ...(extra.nick || [])];
  const locs = [location, ...(extra.loc || [])].filter(Boolean);
  return {
    key,
    league: t.league,
    conference: t.conference ? (CONFERENCE_LABELS[t.conference] || t.conference) : null,
    location,
    name: t.name,
    label: location ? `${location} ${t.name}` : t.name,
    // Short chip label: nickname for pros, school for colleges.
    short: t.league === 'College' ? location : t.name,
    nicks,
    locs,
  };
});

const TEAM_BY_KEY = new Map(TEAMS.map((t) => [t.key, t]));

// Which teams use each nickname, to spot same-name teams.
const NICK_OWNERS = new Map();
for (const t of TEAMS) for (const n of t.nicks.map(norm)) NICK_OWNERS.set(n, [...(NICK_OWNERS.get(n) || []), t]);

for (const t of TEAMS) {
  t.nickRe = phraseRe(t.nicks);
  t.locRe = phraseRe(t.locs);
  const owners = t.nicks.flatMap((n) => NICK_OWNERS.get(norm(n)) || []).filter((o) => o !== t);
  t.sharedWithPro = owners.some((o) => o.league !== 'College');
  // College locations that would mean "this is the college team, not us".
  t.collegeRivalLocRe = phraseRe(owners.filter((o) => o.league === 'College').flatMap((o) => o.locs));
}

/** Does this listing title belong to this team? */
export function titleMatchesTeam(team, title) {
  if (!team || !title) return false;
  const t = ` ${norm(title)} `;
  const hasNick = team.nickRe?.test(t);
  const hasLoc = team.locRe?.test(t);
  if (team.league === 'College') {
    // A school name alone is too loose ("Duke Snider", "Texas Rangers"):
    // it needs the nickname or a college-card word with it.
    return !!hasLoc && (hasNick || LEAGUE_HINTS.College.test(title));
  }
  if (!hasNick) return false;
  if (hasLoc) return true;
  // Nickname shared with another pro team: needs the city or the sport.
  if (team.sharedWithPro) return LEAGUE_HINTS[team.league].test(title);
  // Shared only with a college: ours unless the title says college.
  if (team.collegeRivalLocRe?.test(t) || LEAGUE_HINTS.College.test(title)) return false;
  return true;
}

/** Keep known team keys only (input comes from saved JSON and URLs). */
export function cleanTeams(keys) {
  return [...new Set((Array.isArray(keys) ? keys : []).filter((k) => typeof k === 'string' && TEAM_BY_KEY.has(k)))];
}

export function getTeam(key) {
  return TEAM_BY_KEY.get(key) || null;
}

/** Title test for a Team filter selection, or null when it's off. */
export function makeTeamMatcher(keys) {
  const teams = cleanTeams(keys).map((k) => TEAM_BY_KEY.get(k));
  if (!teams.length) return null;
  return (title) => teams.some((t) => titleMatchesTeam(t, title));
}

/** Chip labels for a Team filter selection: ["Mavericks", "Duke"]. */
export function teamFilterLabels(keys) {
  return cleanTeams(keys).map((k) => TEAM_BY_KEY.get(k).short);
}

/**
 * Is this search a whole team? Matches the full name ("Pittsburgh Pirates"),
 * an old full name ("Oakland Raiders"), or a nickname only one team uses
 * ("Lakers", "Mavs"). Returns the team or null.
 */
export function teamFromQuery(query) {
  const q = norm(query);
  if (!q) return null;
  let found = null;
  for (const t of TEAMS) {
    const fulls = t.locs.flatMap((l) => t.nicks.map((n) => norm(`${l} ${n}`)));
    if (fulls.includes(q) || norm(t.label) === q) return t;
    if (!found && t.nicks.some((n) => norm(n) === q) && (NICK_OWNERS.get(q) || []).length === 1) found = t;
  }
  return found;
}

/** What to send eBay for a whole-team search. */
export function teamQueryKeywords(team) {
  if (team.league === 'College') return team.location;
  // Same-name pro teams search with the city; others by nickname alone, so
  // titles that skip the city still come back.
  return team.sharedWithPro ? team.label : team.name;
}

/** Teams for the search dropdown: any word of the name starts with the input. */
export function suggestTeams(input, limit = 3) {
  const q = norm(input);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const scored = [];
  for (const t of TEAMS) {
    const names = [t.label, ...t.nicks, ...t.locs.map((l) => `${l} ${t.name}`)].map(norm);
    let score = 0;
    for (const n of names) {
      if (n === q) score = Math.max(score, 3);
      else if (n.startsWith(q)) score = Math.max(score, 2);
      else {
        const nw = n.split(' ');
        let i = 0;
        const ok = words.every((w) => { while (i < nw.length && !nw[i].startsWith(w)) i++; return i++ < nw.length; });
        if (ok) score = Math.max(score, 1);
      }
    }
    if (score) scored.push({ t, score: score + (t.league === 'College' ? 0 : 0.5) });
  }
  scored.sort((a, b) => b.score - a.score || a.t.label.localeCompare(b.t.label));
  return scored.slice(0, limit).map(({ t }) => t);
}
