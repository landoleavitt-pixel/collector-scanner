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
// It also refreshes lib/teams.json (the team list for team search).
// `node scripts/update-athletes.mjs --teams-only` refreshes just the teams.
//
// Source: ESPN's public roster pages (no account, no key, free). It's an
// unofficial feed, so if a league fails the script keeps that league's names
// from the previous file instead of wiping them.
//
// Usage limits: ESPN's terms may not allow automated use. Run this by hand,
// once a quarter, never on a schedule or from the site. It makes about 330
// requests (100 pro, 230 college), one at a time with a short pause. Only
// player names and sports are kept. Don't publish or redistribute the raw
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
const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

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
    } catch {}
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`Failed: ${url}`);
}

async function fetchLeague({ sport, path: p }) {
  const teamsData = await getJson(`${BASE}/${p}/teams`);
  const teams = teamsData.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team.id) ?? [];
  if (teams.length === 0) throw new Error(`${sport}: no teams`);
  return fetchRosters(p, teams);
}

async function fetchRosters(p, teamIds) {
  const names = new Set();
  for (const id of teamIds) {
    await pause(150);
    const roster = await getJson(`${BASE}/${p}/teams/${id}/roster`);
    // Some leagues group athletes by position, others list them flat.
    const athletes = (roster.athletes ?? []).flatMap((a) => (Array.isArray(a.items) ? a.items : [a]));
    for (const a of athletes) {
      const name = (a.fullName || a.displayName || '').trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

// School ids are shared across sports on ESPN, so the basketball conference
// lists also give us the football schools.
async function fetchCollege() {
  const names = new Set();
  const footballSchools = new Set();
  for (const p of COLLEGE_BASKETBALL) {
    const groups = await getJson(`${BASE}/${p}/groups`);
    const confs = (groups.groups ?? []).flatMap((g) => g.children ?? [])
      .filter((c) => COLLEGE_CONFERENCES.includes(c.name));
    if (confs.length === 0) throw new Error(`${p}: no conferences`);
    const ids = confs.flatMap((c) => (c.teams ?? []).map((t) => t.id));
    confs.filter((c) => !NO_FOOTBALL.has(c.name)).forEach((c) => (c.teams ?? []).forEach((t) => footballSchools.add(t.id)));
    (await fetchRosters(p, ids)).forEach((n) => names.add(n));
    console.log(`${p}: ${ids.length} teams`);
  }
  (await fetchRosters(COLLEGE_FOOTBALL, [...footballSchools])).forEach((n) => names.add(n));
  console.log(`${COLLEGE_FOOTBALL}: ${footballSchools.size} teams`);
  return [...names];
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

async function main() {
  try { await updateTeams(); } catch (err) { console.warn(`Teams: fetch failed (${err.message}). Keeping last list.`); }
  if (process.argv.includes('--teams-only')) return;

  let previous = { players: [] };
  try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

  const players = [];
  for (const league of LEAGUES) {
    try {
      const names = await fetchLeague(league);
      console.log(`${league.sport}: ${names.length} players`);
      names.forEach((n) => players.push([n, league.sport]));
    } catch (err) {
      const kept = previous.players.filter(([, s]) => s === league.sport);
      console.warn(`${league.sport}: fetch failed (${err.message}). Keeping ${kept.length} names from last time.`);
      players.push(...kept);
    }
  }

  try {
    const names = await fetchCollege();
    console.log(`College: ${names.length} players`);
    names.forEach((n) => players.push([n, 'College']));
  } catch (err) {
    const kept = previous.players.filter(([, s]) => s === 'College');
    console.warn(`College: fetch failed (${err.message}). Keeping ${kept.length} names from last time.`);
    players.push(...kept);
  }

  players.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  const out = { updated: new Date().toISOString().slice(0, 10), players };
  // One player per line keeps git diffs readable at refresh time.
  const body = `{\n  "updated": "${out.updated}",\n  "players": [\n${players.map((p) => '    ' + JSON.stringify(p)).join(',\n')}\n  ]\n}\n`;
  await writeFile(OUT, body);
  console.log(`Wrote ${players.length} players to lib/athletes-rosters.json`);
}

main().catch((err) => { console.error(err); process.exit(1); });
