// lib/checklist.js
//
// "Every card of this player" for the sports card checklist (DECISIONS.md,
// "Card checklist view"). Server-side; used by app/api/checklist/route.js.
//
// Sources:
//   lib/checklists/<set-key>.json   the card makers' own checklists, written by
//                                   scripts/import-checklists.mjs (empty until
//                                   Landon adds files to data/checklists/)
//   PARALLEL_DATA (parallelData.js) each set's colours, print runs and flags
//   coloursForCard (checklistColours.js) which colours a given card can have:
//                                   rookie-only colours stay off veteran
//                                   cards and the other way round; variation
//                                   colours are listed apart; box-only colours
//                                   stay in, marked with their box.
//
// Result, grouped by set, then card number, then version:
//   { player, sets: [{ set, label, year, sport, colourSource, checklistSource,
//       cards: [{ number, player, team, rookie, versions: [...], variations: [...] }] }] }
//   A version is { key, name, run, tier, boxOnly, exclusive }; the first is
//   the plain base card. Versions run rarest first: numbered by print run,
//   then unnumbered colours, then the base card.
//
// Player names match the way the search box reads them: accents, case and
// punctuation don't matter, "Jr." / "III" are optional, and nicknames from
// lib/athletes.js ("Wemby") find the full name. Cards for two players
// ("A / B") count for each.

import fs from 'fs';
import path from 'path';
import { PARALLEL_DATA } from './parallelData';
import { coloursForCard } from './checklistColours';
import { NICKNAMES } from './athletes';
import { universalTierForRun } from '../app/components/rarityUtils';

const CHECKLIST_DIR = path.join(process.cwd(), 'lib', 'checklists');
const SUFFIX = /^(jr|sr|ii|iii|iv|v)$/;

// Same normalising as the search box (lib/playerSuggest.js normalizeName).
export function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Comparison key: normalised, without a trailing Jr./III. */
export function nameKey(s) {
  const words = normalizeName(s).split(' ').filter(Boolean);
  while (words.length > 1 && SUFFIX.test(words[words.length - 1])) words.pop();
  return words.join(' ');
}

const NICK = new Map(Object.entries(NICKNAMES).map(([k, v]) => [nameKey(k), nameKey(v)]));

/** The name key a search should match, after nicknames. */
export function queryKey(player) {
  const key = nameKey(player);
  return NICK.get(key) || key;
}

// Names on one checklist row ("A / B" dual cards list both).
function rowNames(player) {
  return String(player || '').split(/\s+\/\s+|\s+&\s+/).map(nameKey).filter(Boolean);
}

// Read lib/checklists/*.json once per change. Missing folder = no checklists.
let cache = { stamp: null, lists: [] };
export function loadChecklists(dir = CHECKLIST_DIR) {
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const stamp = dir + '|' + files.map((f) => `${f}:${fs.statSync(path.join(dir, f)).mtimeMs}`).join(',');
  if (cache.stamp === stamp) return cache.lists;
  const lists = [];
  for (const f of files) {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (json && typeof json.set === 'string' && Array.isArray(json.cards)) lists.push(json);
    } catch {
      // A broken file is skipped rather than taking the whole checklist down.
    }
  }
  cache = { stamp, lists };
  return lists;
}

function version(p) {
  return {
    key: p.key,
    name: p.name,
    run: p.run ?? null,
    tier: p.run ? universalTierForRun(p.run) : null,
    boxOnly: p.boxOnly || null,
    exclusive: p.exclusive || null,
  };
}

// Rarest first: numbered by run, then unnumbered (data order), base last.
function byRarity(a, b) {
  if (a.run && b.run) return a.run - b.run;
  if (a.run) return -1;
  if (b.run) return 1;
  return 0;
}

const cardNumberOrder = (a, b) =>
  (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0) || String(a.number).localeCompare(String(b.number));

/**
 * Every card of one player across the checklists we hold.
 * `checklists` and `sets` default to lib/checklists/ and PARALLEL_DATA (tests pass their own).
 */
export function findPlayerCards(player, { checklists = loadChecklists(), sets = PARALLEL_DATA } = {}) {
  const want = queryKey(player);
  if (!want) return { player: '', sets: [] };

  const out = [];
  for (const list of checklists) {
    const set = sets[list.set];
    if (!set) continue; // a checklist for a set we hold no colours for
    const cards = [];
    for (const row of list.cards) {
      const [number, name, team, rookie] = row;
      if (!rowNames(name).includes(want)) continue;
      const card = { rookie: rookie ? 1 : 0 };
      const { colours, variations } = coloursForCard(set, card);
      const base = { key: 'base', name: 'Base', run: null, tier: null, boxOnly: null, exclusive: null };
      cards.push({
        number: String(number),
        player: name,
        team: team || null,
        rookie: !!rookie,
        versions: [...colours.map(version).sort(byRarity), base],
        variations: variations.map(version).sort(byRarity),
      });
    }
    if (!cards.length) continue;
    out.push({
      set: list.set,
      label: set.label,
      year: set.year ?? null,
      sport: set.sport ?? null,
      colourSource: set.source || null,
      checklistSource: list.source || null,
      cards: cards.sort(cardNumberOrder),
    });
  }
  out.sort((a, b) => (b.year || 0) - (a.year || 0) || String(a.label).localeCompare(String(b.label)));
  return { player: String(player).trim(), sets: out };
}
