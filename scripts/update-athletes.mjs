#!/usr/bin/env node
// scripts/update-athletes.mjs
//
// Refreshes lib/athletes-rosters.json — every current player on an NBA, WNBA,
// NFL, MLB and NHL roster, plus college football and men's/women's
// basketball in the major conferences — for the player-name suggestions in
// the search box. College players are tagged "College".
// Run it once a quarter (see README "Refreshing the player list"):
//
//   node scripts/update-athletes.mjs
//
// It also refreshes lib/teams.json (the team list for team search) and
// lib/playerTeams.json (which teams each player has been on, by season, so a
// team search finds cards that name the player but not the team).
// `node scripts/update-athletes.mjs --teams-only` refreshes just the teams.
//
// Player history:
//   node scripts/update-athletes.mjs --history
// rebuilds lib/playerTeams.json from scratch: 10 seasons for pro players
// (one request per pro player, about 4,500) and 5 for college (one per
// school per season, about 900). About 5,400 extra requests and an hour, so
// it only needs running once, or if the file gets badly out of date. It
// stops early, keeping what it has, if ESPN returns a 429 or 10 errors in a
// row. The normal quarterly run moves players to the team on today's roster,
// keeps everyone already in the file, and only fetches the season log of
// pro players new to the file (a few hundred requests at most).
//
// Source: ESPN's public roster pages (no account, no key, free). It's an
// unofficial feed, so if a league fails the script keeps that league's names
// from the previous file instead of wiping them.
//
// Usage limits: ESPN's terms may not allow automated use. Run this by hand,
// once a quarter, never on a schedule or from the site. It makes about 330
// requests (100 pro, 230 college), one at a time with a short pause, plus
// a few hundred for new pro players' history; with --history about 5,400. Only player names, sports, teams and seasons
// are kept (ESPN's player ids are used while running, never saved). Don't publish or redistribute the raw
// ESPN data. If it breaks or gets blocked,
// edit lib/athletes-rosters.json and lib/athletes.js by hand instead.
//
// Stars, legends, prospects and nicknames are NOT fetched; they're kept by
// hand in lib/athletes.js. Add new draft picks and hot prospects there.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEAMS_OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'teams.json');
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'athletes-rosters.json');
const PLAYER_TEAMS_OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'playerTeams.json');
const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
// Past rosters (player ids by team and season) come from ESPN's core feed.
const CORE = 'https://sports.core.api.espn.com/v2/sports';
const PRO_SEASONS = 10;
const COLLEGE_SEASONS = 5;

const LEAGUES = [
  { sport: 'NBA', path: 'basketball/nba' },
  { sport: 'WNBA', path: 'basketball/wnba' },
  { sport: 'NFL', path: 'football/nfl' },
  { sport: 'MLB', path: 'baseball/mlb' },
  { sport: 'NHL', path: 'hockey/nhl' },
];

// Major conferences only: that's where nearly every carded college player
// is (Bowman U, Topps Chrome U, Prizm Draft Picks). Big East has no football.
const COLLEGE_CONFERENCES = [
  'Atlantic Coast Conference', 'Big 12 Conference', 'Big East Conference',
  'Big Ten Conference', 'Southeastern Conference',
];
const COLLEGE_BASKETBALL = ['basketball/mens-college-basketball', 'basketball/womens-college-basketball'];
const COLLEGE_FOOTBALL = 'football/college-football';
const NO_FOOTBALL = new Set(['Big East Conference']);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
      if (res.status === 429) throw Object.assign(new Error('ESPN said slow down (429)'), { blocked: true });
    } catch (err) {
      if (err.blocked) throw err;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`Failed: ${url}`);
}

// Every team fetched this run, for the player history: { path, id, key }.
const TEAM_REFS = [];

async function fetchLeague({ sport, path: p }) {
  const teamsData = await getJson(`${BASE}/${p}/teams`);
  const teams = teamsData.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];
  if (teams.length === 0) throw new Error(`${sport}: no teams`);
  const keys = new Map(teams.map((t) => [t.id, `${sport}-${t.abbreviation}`.toLowerCase()]));
  return fetchRosters(p, sport, keys);
}

// keys: ESPN team id -> our team key (lib/teams.js). Returns the names, plus
// who is on which team this season for lib/playerTeams.json.
async function fetchRosters(p, sport, keys) {
  const names = new Set();
  const members = [];
  for (const [id, key] of keys) {
    await pause(150);
    const roster = await getJson(`${BASE}/${p}/teams/${id}/roster`);
    const season = roster.season?.year;
    TEAM_REFS.push({ path: p, id, key, season, sport });
    // Some leagues group athletes by position, others list them flat.
    const athletes = (roster.athletes ?? []).flatMap((a) => (Array.isArray(a.items) ? a.items : [a]));
    for (const a of athletes) {
      const name = (a.fullName || a.displayName || '').trim();
      if (!name) continue;
      names.add(name);
      if (season) members.push({ id: a.id, name, sport, team: key, season, rookie: a.experience?.years === 0 });
    }
  }
  return { names: [...names], members };
}

// School ids are shared across sports on ESPN, so the basketball conference
// lists also give us the football schools.
async function fetchCollege() {
  const names = new Set();
  const members = [];
  const footballSchools = new Map();
  for (const p of COLLEGE_BASKETBALL) {
    const groups = await getJson(`${BASE}/${p}/groups`);
    const confs = (groups.groups ?? []).flatMap((g) => g.children ?? [])
      .filter((c) => COLLEGE_CONFERENCES.includes(c.name));
    if (confs.length === 0) throw new Error(`${p}: no conferences`);
    const keys = new Map(confs.flatMap((c) => (c.teams ?? []).map((t) => [t.id, `college-${t.abbreviation}`.toLowerCase()])));
    confs.filter((c) => !NO_FOOTBALL.has(c.name)).forEach((c) => (c.teams ?? []).forEach((t) => footballSchools.set(t.id, keys.get(t.id))));
    const got = await fetchRosters(p, 'College', keys);
    got.names.forEach((n) => names.add(n));
    members.push(...got.members);
    console.log(`${p}: ${keys.size} teams`);
  }
  const got = await fetchRosters(COLLEGE_FOOTBALL, 'College', footballSchools);
  got.names.forEach((n) => names.add(n));
  members.push(...got.members);
  console.log(`${COLLEGE_FOOTBALL}: ${footballSchools.size} teams`);
  return { names: [...names], members };
}

// Team list for team search: pro teams plus the major-conference schools.
// About 7 requests. Kept as-is if anything fails.
async function updateTeams() {
  const teams = [];
  for (const { sport, path: p } of LEAGUES) {
    const data = await getJson(`${BASE}/${p}/teams`);
    for (const { team: t } of data.sports?.[0]?.leagues?.[0]?.teams ?? []) {
      teams.push({ league: sport, location: t.location, name: t.name, abbr: t.abbreviation });
    }
  }
  const seen = new Set();
  for (const p of COLLEGE_BASKETBALL) {
    const groups = await getJson(`${BASE}/${p}/groups`);
    for (const c of (groups.groups ?? []).flatMap((g) => g.children ?? [])) {
      if (!COLLEGE_CONFERENCES.includes(c.name)) continue;
      for (const t of c.teams ?? []) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        // displayName is "Auburn Tigers"; name is the nickname.
        const location = t.displayName.slice(0, t.displayName.length - t.name.length).trim();
        teams.push({ league: 'College', conference: c.name.replace(' Conference', ''), location, name: t.name, abbr: t.abbreviation });
      }
    }
  }
  const counts = teams.reduce((m, t) => ({ ...m, [t.league]: (m[t.league] || 0) + 1 }), {});
  if (Object.keys(counts).length < 6) throw new Error(`incomplete team list ${JSON.stringify(counts)}`);
  teams.sort((a, b) => a.league.localeCompare(b.league) || a.location.localeCompare(b.location));
  const body = `[\n${teams.map((t) => '  ' + JSON.stringify(t)).join(',\n')}\n]\n`;
  await writeFile(TEAMS_OUT, body);
  console.log(`Wrote ${teams.length} teams to lib/teams.json`, counts);
}

// ── Player history (lib/playerTeams.json) ──────────────────────────────────
//
// One entry per player: { player, sport, teams: [{ team, from, to }] }.
// from/to are ESPN season years, inclusive; to: null means "still there".
// For NBA, NHL and college basketball the season
// year is the year it ends (2025 = the 2024-25 season); NFL, MLB, WNBA and
// college football use the year it's played. lib/playerTeams.js reads it.

// Season runs -> tenures. A one-season gap is treated as missing data.
function toTenures(seasonsByTeam, currentByTeam) {
  const out = [];
  for (const [team, set] of seasonsByTeam) {
    const years = [...set].sort((a, b) => a - b);
    let from = years[0];
    let prev = years[0];
    for (const y of [...years.slice(1), Infinity]) {
      if (y - prev <= 2) { prev = y; continue; }
      out.push({ team, from, to: currentByTeam.get(team) === prev ? null : prev });
      from = y;
      prev = y;
    }
  }
  return out.sort((a, b) => a.from - b.from || (a.to ?? 9999) - (b.to ?? 9999));
}

// Stops the player history early, keeping what it has, if ESPN pushes back:
// a 429, or 10 failed requests in a row. Requests stay one at a time.
const guard = { requests: 0, failures: 0, stopped: null };
async function historyJson(url) {
  if (guard.stopped) return null;
  await pause(150);
  if (++guard.requests % 500 === 0) console.log(`History: ${guard.requests} requests`);
  try {
    const data = await getJson(url);
    guard.failures = 0;
    return data;
  } catch (err) {
    if (err.blocked || ++guard.failures >= 10) {
      guard.stopped = err.blocked ? err.message : '10 failed requests in a row';
      console.warn(`History: stopping early (${guard.stopped}). Keeping what we have.`);
    }
    return null;
  }
}

// One pro player's last PRO_SEASONS seasons: team key -> Set(season), or
// null if it couldn't be fetched.
async function fetchProLog(id, leaguePath, season, keyOf) {
  const [sportPath, league] = leaguePath.split('/');
  const log = await historyJson(`${CORE}/${sportPath}/leagues/${league}/athletes/${id}/statisticslog`);
  if (!log) return null;
  const seasons = new Map();
  for (const e of log.entries ?? []) {
    const y = Number(/seasons\/(\d+)/.exec(e.season?.$ref || '')?.[1]);
    if (!y || y <= season - PRO_SEASONS) continue;
    for (const st of e.statistics ?? []) {
      const teamId = /teams\/(\d+)/.exec(st.team?.$ref || '')?.[1];
      const key = teamId && keyOf.get(`${leaguePath}/${teamId}`);
      if (!key) continue;
      if (!seasons.has(key)) seasons.set(key, new Set());
      seasons.get(key).add(y);
    }
  }
  return seasons;
}

const teamKeyMap = () => new Map(TEAM_REFS.map((r) => [`${r.path}/${r.id}`, r.key]));
const leaguePaths = new Map(LEAGUES.map((l) => [l.sport, l.path]));

// Past seasons from ESPN's core feed, for today's players. Pro: each
// player's season log (the team they finished each season with). College:
// each school's past rosters (player ids only, matched to today's names).
// ESPN's past pro rosters can't be used: they list today's players.
async function fetchHistory(members) {
  const byId = new Map();
  const keyOf = teamKeyMap();
  for (const m of members) {
    if (!byId.has(m.id)) byId.set(m.id, { id: m.id, name: m.name, sport: m.sport, seasons: new Map(), current: new Map(), pro: null });
    const p = byId.get(m.id);
    if (m.sport !== 'College' && !m.rookie) p.pro = { path: leaguePaths.get(m.sport), season: m.season };
    // A college player who's now pro keeps the pro sport.
    if (m.sport !== 'College') p.sport = m.sport;
    if (!p.seasons.has(m.team)) p.seasons.set(m.team, new Set());
    p.seasons.get(m.team).add(m.season);
    p.current.set(m.team, m.season);
  }
  for (const p of byId.values()) {
    if (!p.pro) continue;
    const log = await fetchProLog(p.id, p.pro.path, p.pro.season, keyOf);
    // Not fetched: today's team only for now; the next run fills it in.
    if (!log) { p.partial = true; continue; }
    for (const [key, set] of log) {
      if (!p.seasons.has(key)) p.seasons.set(key, new Set());
      set.forEach((y) => p.seasons.get(key).add(y));
    }
  }
  for (const ref of TEAM_REFS) {
    if (!ref.season || ref.sport !== 'College') continue;
    const span = COLLEGE_SEASONS;
    const [sportPath, league] = ref.path.split('/');
    for (let y = ref.season - span + 1; y < ref.season; y++) {
      const data = await historyJson(`${CORE}/${sportPath}/leagues/${league}/seasons/${y}/teams/${ref.id}/athletes?limit=1000`);
      if (!data) continue;
      for (const it of data.items ?? []) {
        const id = String(it.$ref || '').split('?')[0].split('/').pop();
        const p = byId.get(id);
        if (!p) continue;
        if (!p.seasons.has(ref.key)) p.seasons.set(ref.key, new Set());
        p.seasons.get(ref.key).add(y);
      }
    }
  }
  console.log(`History: ${guard.requests} requests in all`);
  return [...byId.values()].map((p) => ({
    player: p.name, sport: p.sport, teams: toTenures(p.seasons, p.current), ...(p.partial ? { partial: true } : {}),
  }));
}

// Quarterly update: move each player to today's team and close the old
// stint. Players no longer on a roster are kept (their cards still sell),
// with their last stint closed. Only pro players new to the file (or marked
// partial by a run that stopped early) get their season log fetched, so a
// quarter costs about one request per newly signed or traded-in veteran
// (typically a few hundred), not the whole history again.
async function mergeCurrent(previous, members, failed) {
  const entries = previous.map((e) => ({ ...e, teams: e.teams.map((t) => ({ ...t })) }));
  const index = new Map();
  for (const e of entries) index.set(e.player, [...(index.get(e.player) || []), e]);
  const currentSeason = new Map(); // team key -> season
  for (const m of members) currentSeason.set(m.team, m.season);
  const seen = new Set();
  for (const m of members) {
    const same = index.get(m.name) || [];
    // Same name and sport, or a college player who just turned pro.
    let e = same.find((x) => x.sport === m.sport)
      || same.find((x) => (x.sport === 'College') !== (m.sport === 'College') && !seen.has(x));
    if (!e) {
      e = { player: m.name, sport: m.sport, teams: [] };
      entries.push(e);
      index.set(m.name, [...same, e]);
    }
    if (m.sport !== 'College') e.sport = m.sport;
    if ((!e.teams.length || e.partial) && m.sport !== 'College' && !m.rookie) e.fetch = m;
    seen.add(e);
    const open = e.teams.find((t) => t.to === null && t.team === m.team);
    if (!open) e.teams.push({ team: m.team, from: m.season, to: null });
  }
  const keyOf = teamKeyMap();
  for (const e of entries) {
    const m = e.fetch;
    delete e.fetch;
    if (!m) continue;
    const log = await fetchProLog(m.id, leaguePaths.get(m.sport), m.season, keyOf);
    if (!log) { e.partial = true; continue; }
    delete e.partial;
    if (!log.has(m.team)) log.set(m.team, new Set());
    log.get(m.team).add(m.season);
    e.teams = [...e.teams.filter((t) => t.team.startsWith('college-')), ...toTenures(log, new Map([[m.team, m.season]]))];
  }
  if (guard.requests) console.log(`History: ${guard.requests} requests for new players`);
  for (const e of entries) {
    for (const t of e.teams) {
      if (t.to !== null) continue;
      if (failed.has(e.sport) || (t.team.startsWith('college-') && failed.has('College'))) continue;
      const onIt = members.some((m) => m.team === t.team && m.name === e.player);
      if (onIt) continue;
      const now = currentSeason.get(t.team);
      if (now) t.to = Math.max(t.from, now - 1);
    }
    e.teams.sort((a, b) => a.from - b.from || (a.to ?? 9999) - (b.to ?? 9999));
  }
  return entries;
}

async function updatePlayerTeams(members, failed) {
  let previous = null;
  try { previous = JSON.parse(await readFile(PLAYER_TEAMS_OUT, 'utf8')).players; } catch {}
  let entries;
  if (process.argv.includes('--history') || !previous) {
    if (failed.size) throw new Error(`history needs every league; failed: ${[...failed].join(', ')}`);
    entries = await fetchHistory(members);
  } else {
    entries = await mergeCurrent(previous, members, failed);
  }
  entries.sort((a, b) => a.sport.localeCompare(b.sport) || a.player.localeCompare(b.player));
  const updated = new Date().toISOString().slice(0, 10);
  const body = `{\n  "updated": "${updated}",\n  "players": [\n${entries.map((e) => '    ' + JSON.stringify(e)).join(',\n')}\n  ]\n}\n`;
  await writeFile(PLAYER_TEAMS_OUT, body);
  const partial = entries.filter((e) => e.partial).length;
  console.log(`Wrote ${entries.length} players to lib/playerTeams.json`);
  if (partial) console.warn(`${partial} players have today's team only (stopped early); the next run fills them in.`);
}

async function main() {
  try { await updateTeams(); } catch (err) { console.warn(`Teams: fetch failed (${err.message}). Keeping last list.`); }
  if (process.argv.includes('--teams-only')) return;

  let previous = { players: [] };
  try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

  const players = [];
  const members = [];
  const failed = new Set();
  for (const league of LEAGUES) {
    try {
      const got = await fetchLeague(league);
      const names = got.names;
      members.push(...got.members);
      console.log(`${league.sport}: ${names.length} players`);
      names.forEach((n) => players.push([n, league.sport]));
    } catch (err) {
      const kept = previous.players.filter(([, s]) => s === league.sport);
      console.warn(`${league.sport}: fetch failed (${err.message}). Keeping ${kept.length} names from last time.`);
      players.push(...kept);
      failed.add(league.sport);
    }
  }

  try {
    const got = await fetchCollege();
    const names = got.names;
    members.push(...got.members);
    console.log(`College: ${names.length} players`);
    names.forEach((n) => players.push([n, 'College']));
  } catch (err) {
    const kept = previous.players.filter(([, s]) => s === 'College');
    console.warn(`College: fetch failed (${err.message}). Keeping ${kept.length} names from last time.`);
    players.push(...kept);
    failed.add('College');
  }

  players.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  const out = { updated: new Date().toISOString().slice(0, 10), players };
  // One player per line keeps git diffs readable at refresh time.
  const body = `{\n  "updated": "${out.updated}",\n  "players": [\n${players.map((p) => '    ' + JSON.stringify(p)).join(',\n')}\n  ]\n}\n`;
  await writeFile(OUT, body);
  console.log(`Wrote ${players.length} players to lib/athletes-rosters.json`);

  try {
    await updatePlayerTeams(members, failed);
  } catch (err) {
    console.warn(`Player teams: failed (${err.message}). Keeping last file.`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
