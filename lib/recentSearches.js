// lib/recentSearches.js
//
// The "Pick up where you left off" chips on the Fields & Floors home page.
// Same rules as the search box:
//   - Team names ("Pittsburgh Pirates", "Duke Blue Devils") are never
//     spell-checked. They show as the team's own name.
//   - Nothing is rewritten to a guessed spelling. A chip re-runs exactly
//     what was searched (with tidy capitals). A misspelled entry only merges
//     into a correctly spelled one that's also in the list ("Paul Skeenes"
//     and "Paul Skenes" share one chip, showing "Paul Skenes").
//
// Repair on read: an earlier version spell-checked team names, so a
// "Pittsburgh Pirates" chip showed (and re-ran) as "Pittsburgh Perales". If
// someone tapped it, that wrong search was saved too. Entries that are exactly
// that old wrong spelling of a team in the same list are dropped.
//
// `names` is lib/playerSuggest.js (normalizeName, didYouMean, tidySearchTerm),
// passed in because it's loaded lazily.

import { teamFromQuery } from './teams';

export function tidyRecentSearches(list, names, max = 5) {
  const terms = (Array.isArray(list) ? list : []).filter((t) => typeof t === 'string' && t.trim());
  const norm = (s) => names.normalizeName(s);

  // Wrong spellings the old version made from team searches in this list.
  const oldTeamTypos = new Set();
  for (const raw of terms) {
    if (!teamFromQuery(raw)) continue;
    const wrong = names.didYouMean(raw)?.query;
    if (wrong && norm(wrong) !== norm(raw)) oldTeamTypos.add(norm(wrong));
  }

  const groups = new Map(); // key → [{ raw, ok, team }]
  for (const raw of terms) {
    if (oldTeamTypos.has(norm(raw))) continue;
    const team = teamFromQuery(raw);
    const fix = team ? null : names.didYouMean(raw);
    // Typos share a slot with the spelling they'd be corrected to.
    const key = team ? `team:${team.key}` : norm(fix ? fix.query : raw);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ raw, ok: !fix, team });
  }

  return [...groups.values()]
    .map((g) => {
      const pick = g.find((t) => t.ok) || g[0];
      return pick.team ? pick.team.label : names.tidySearchTerm(pick.raw);
    })
    .slice(0, max);
}
