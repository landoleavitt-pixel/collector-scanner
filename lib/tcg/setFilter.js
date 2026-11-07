// lib/tcg/setFilter.js
//
// The Set filter (research/fables-filters-2.md, rank 5), for the games with a
// catalog. Separate from lib/tcg/search.js because it loads the large catalogs.
//
//   setList(game)              every set, newest first, for the drop-down
//   setQueryWords(game, codes) what to ask eBay for
//   listingInSets(game, codes, item)  is this listing from one of the sets?
//
// A listing we can pin to catalog printings is decided by those printings.
// Otherwise it needs its title to name the set, so a set filter hides titles
// that don't say.

import { catalogData } from './catalog';
import { titleSetHit } from './family';

export function setList(game) {
  const data = catalogData(game);
  if (!data) return [];
  return Object.entries(data.sets)
    .map(([code, s]) => ({ code, name: s[0], released: s[1] || null }))
    .sort((a, b) => String(b.released || '').localeCompare(String(a.released || '')) || a.name.localeCompare(b.name));
}

// An OR group of set names: ("Evolving Skies", "Fusion Strike"). The name alone,
// since titles that give only a code or number still hold the card's name. For
// Yu-Gi-Oh! and Magic, sellers often write only the code, so that's added too.
export function setQueryWords(game, codes) {
  const data = catalogData(game);
  const words = [];
  for (const code of codes) {
    const name = data?.sets[code]?.[0];
    if (!name) continue;
    words.push(`"${name.replace(/\(.*\)/, '').replace(/["():,]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)}"`);
    if (game === 'yugioh' || game === 'mtg') words.push(code);
  }
  return words.length ? `(${words.join(', ')})` : '';
}

export function listingInSets(game, codes, item) {
  const known = item.catalogSets || item.match?.versions?.map((v) => v.split(':')[0]);
  if (known?.length && (item.catalogSets || ['exact', 'set'].includes(item.match?.kind))) return known.some((s) => codes.includes(s));
  return codes.some((code) => titleSetHit(game, code, item.title));
}
