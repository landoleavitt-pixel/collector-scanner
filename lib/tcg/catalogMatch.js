// lib/tcg/catalogMatch.js
//
// Rarity from the card catalogs (DECISIONS.md, "rarity from card catalogs").
// When a listing fits a catalog printing (Magic via Scryfall, English Pokémon
// via TCGdex, Yu-Gi-Oh! via YGOPRODeck, Lorcana via Lorcast), its rarity comes from the catalog rather than the title:
//
//   one printing, one rarity        that rarity
//   several possible versions       the title's rarity if it's one of them,
//   with different rarities         otherwise the least rare of them
//   no match, or only "Japanese     the title's rarity, as before
//   printing" / "promo, not
//   confirmed" / "version not
//   in title"
//
// Serial /N still sorts first and grade last (lib/tcg/score.js); this only
// changes the rarity rung, so the rarity filter and the label agree with it.

import { catalogData, familyCards, getCard, versionsOf, CATALOG_GAMES } from './catalog';
import { rungOf, GROUP_ORDER } from './ladders';
import { matchListing } from './family';

// Across a family, the card a listing fits best: a pinned printing first,
// then a set, a promo, a language-only copy, "version not in title".
const KIND_ORDER = { exact: 0, set: 1, promo: 2, language: 3, unknown: 4, reject: 5 };
export function bestMatch(game, cards, title, parsed = null) {
  let best = null;
  for (const card of cards) {
    const match = matchListing(game, card, title, parsed);
    if (!best || KIND_ORDER[match.kind] < KIND_ORDER[best.match.kind]) best = { match, card };
    if (match.kind === 'exact') break;
  }
  return best;
}

// The catalog printing (set + card number) of an exact match, so the
// checklist can put a listing's photo on the right row.
export function catalogPrinting(game, card, match) {
  if (match.kind !== 'exact' || !match.versions.length) return null;
  const [set, number] = match.versions[0].split(':');
  const s = catalogData(game).sets[set];
  return { card: card.key, cardName: card.n, set, setName: s?.[0] || set, number, versions: match.versions };
}

// The rung key the catalog gives a match, or null to keep the title's.
export function catalogRarity(game, card, match, titleRarity = null) {
  if ((match.kind !== 'exact' && match.kind !== 'set') || !match.versions.length) return null;
  const want = new Set(match.versions);
  const keys = new Set();
  for (const row of card.p) {
    if (!match.versions.some((v) => v.startsWith(`${row[0]}:${row[1]}:`))) continue;
    for (const v of versionsOf(game, row)) if (want.has(v.key) && v.rarityKey) keys.add(v.rarityKey);
  }
  if (!keys.size) return null;
  if (keys.size === 1) return [...keys][0];
  if (titleRarity && keys.has(titleRarity)) return titleRarity;
  // The least rare: the highest rank number on the ladder.
  return [...keys].sort((a, b) => (rungOf(game, b)?.rank ?? 0) - (rungOf(game, a)?.rank ?? 0))[0];
}

// The group the catalog gives a match, or null to keep the title's. Same rule
// as catalogRarity. Also returns the catalog's own rarity name when one fits.
export function catalogGroup(game, card, match, titleGroup = null) {
  if ((match.kind !== 'exact' && match.kind !== 'set') || !match.versions.length) return null;
  const want = new Set(match.versions);
  const groups = new Set();
  const names = new Set();
  for (const row of card.p) {
    if (!match.versions.some((v) => v.startsWith(`${row[0]}:${row[1]}:`))) continue;
    for (const v of versionsOf(game, row)) {
      if (!want.has(v.key)) continue;
      if (v.rarityGroup) groups.add(v.rarityGroup);
      if (v.rarity) names.add(v.rarity);
    }
  }
  if (!groups.size) return null;
  const name = names.size === 1 ? [...names][0] : null;
  if (groups.size === 1) return { group: [...groups][0], name };
  if (titleGroup && groups.has(titleGroup)) return { group: titleGroup, name };
  return { group: [...groups].sort((a, b) => GROUP_ORDER[b] - GROUP_ORDER[a])[0], name };
}

// Families per (game, typed name), and matches per (listing, typed name), kept
// for as long as the 15-minute search pool so repeats cost nothing.
const families = new Map();
const matches = new Map();
const MAX = 20000;
function familyFor(game, q) {
  const key = `${game}|${q.toLowerCase()}`;
  if (!families.has(key)) {
    if (families.size > 500) families.delete(families.keys().next().value);
    families.set(key, familyCards(game, q, 80).map((f) => getCard(game, f.key)).filter(Boolean));
  }
  return families.get(key);
}

// For search results: set parsed.rarity from the catalog where it fits, and
// attach `catalog` (set + number) and `raritySource` to each item.
export function applyCatalog(items, q) {
  if (!q) return items;
  return items.map((it) => {
    const game = it.parsed?.game;
    if (!CATALOG_GAMES.includes(game)) return { ...it, catalog: null, raritySource: 'title' };
    const key = `${it.id}|${game}|${q.toLowerCase()}`;
    let found = matches.get(key);
    if (found === undefined) {
      const family = familyFor(game, q);
      const best = family.length ? bestMatch(game, family, it.title) : null;
      found = best ? {
        rarity: catalogRarity(game, best.card, best.match, it.parsed.rarity),
        group: catalogGroup(game, best.card, best.match, it.parsed.rarityGroup),
        catalog: catalogPrinting(game, best.card, best.match),
        // The sets this listing can be from, for the Set filter.
        sets: ['exact', 'set'].includes(best.match.kind) ? [...new Set(best.match.versions.map((v) => v.split(':')[0]))] : null,
      } : null;
      if (matches.size > MAX) matches.delete(matches.keys().next().value);
      matches.set(key, found);
    }
    if (!found?.rarity && !found?.group) return { ...it, catalog: found?.catalog || null, catalogSets: found?.sets || null, raritySource: 'title' };
    const rung = found.rarity ? rungOf(game, found.rarity) : null;
    return {
      ...it,
      parsed: {
        ...it.parsed,
        rarity: found.rarity || it.parsed.rarity,
        // The game's own name. A rung's label unless the catalog's name says more (Shiny Rare, Radiant Rare).
        rarityName: (found.group?.name && (game === 'yugioh' || game === 'lorcana' || rung?.group !== found.group.group) ? found.group.name : rung?.label) || it.parsed.rarityName,
        rarityGroup: found.group?.group ?? it.parsed.rarityGroup,
      },
      catalog: found.catalog,
      catalogSets: found.sets,
      raritySource: 'catalog',
    };
  });
}
