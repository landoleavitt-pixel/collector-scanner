#!/usr/bin/env node
// scripts/update-athletes.mjs
//
// Refreshes lib/athletes-rosters.json — every current player on an NBA, WNBA,
// NFL, MLB and NHL roster — for the player-name suggestions in the search box.
// Run it once a quarter (see README "Refreshing the player list"):
//
//   node scripts/update-athletes.mjs
//
// Source: ESPN's public roster pages (no account, no key, free). It's an
// unofficial feed, so if a league fails the script keeps that league's names
// from the previous file instead of wiping them.
//
// Usage limits: ESPN's terms may not allow automated use. Run this by hand,
// once a quarter, never on a schedule or from the site. It makes about 100
// requests, one at a time. Only player names and sports are kept. Don't
// publish or redistribute the raw ESPN data. If it breaks or gets blocked,
// edit lib/athletes-rosters.json and lib/athletes.js by hand instead.
//
// Stars, legends, prospects and nicknames are NOT fetched; they're kept by
// hand in lib/athletes.js. Add new draft picks and hot prospects there.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'athletes-rosters.json');
const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const LEAGUES = [
  { sport: 'NBA', path: 'basketball/nba' },
  { sport: 'WNBA', path: 'basketball/wnba' },
  { sport: 'NFL', path: 'football/nfl' },
  { sport: 'MLB', path: 'baseball/mlb' },
  { sport: 'NHL', path: 'hockey/nhl' },
];

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
  const names = new Set();
  for (const id of teams) {
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

async function main() {
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

  players.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  const out = { updated: new Date().toISOString().slice(0, 10), players };
  // One player per line keeps git diffs readable at refresh time.
  const body = `{\n  "updated": "${out.updated}",\n  "players": [\n${players.map((p) => '    ' + JSON.stringify(p)).join(',\n')}\n  ]\n}\n`;
  await writeFile(OUT, body);
  console.log(`Wrote ${players.length} players to lib/athletes-rosters.json`);
}

main().catch((err) => { console.error(err); process.exit(1); });
