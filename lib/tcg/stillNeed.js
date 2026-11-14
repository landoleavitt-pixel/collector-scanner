// lib/tcg/stillNeed.js
//
// "Still need" (DECISIONS.md 2026-11-14, "more unique and powerful"): for a
// signed-in member, the card families they've started, and in each one the
// versions they don't own yet, with how many are for sale now and a photo.
//
// A family counts as started when the member has marked at least one version
// as owned, or has a Foils & Fables "only the ones I need" saved search for it.
// Most recently touched first. Each family costs one family search, the same
// one the card list runs (same query, so it shares the 15-minute cache).
//
// Cap: at most STILL_NEED_MAX families per call (default 4, up to 8), so one
// page load is at most 8 eBay family searches (each up to 5 pages for a big
// family). The rest are listed by name in `more` and can be asked for with
// ?offset=.

import { getCard, cardFamily, versionsOf, catalogData, CATALOG_GAMES } from './catalog';
import { familyForCard } from './lists';
import { readFamilyCriteria, searchFamily } from './familySearch';

export const STILL_NEED_DEFAULT = 4;
export const STILL_NEED_MAX = 8;

// owned: owned_cards rows ({ game, card_key, version_key, updated_at }), side fables.
// searches: saved_searches rows ({ filters, query, created_at }), side fables.
// → [{ game, name, at, owned: Set(versionKey) }], most recent first.
export function startedFamilies(owned = [], searches = []) {
  const fams = new Map();
  const touch = (game, name, at) => {
    const id = `${game}|${name}`;
    if (!fams.has(id)) fams.set(id, { game, name, at: at || '', owned: new Set() });
    const f = fams.get(id);
    if (at && at > f.at) f.at = at;
    return f;
  };
  for (const row of owned) {
    if (!CATALOG_GAMES.includes(row.game)) continue;
    const fam = familyForCard(row.game, row.card_key);
    if (!fam) continue;
    touch(row.game, fam.name, row.updated_at).owned.add(row.version_key);
  }
  for (const s of searches) {
    const f = s.filters || {};
    if (!f.needOnly || !CATALOG_GAMES.includes(f.game)) continue;
    const first = Array.isArray(f.cards) && f.cards.length ? f.cards[0] : f.card;
    const fam = first ? familyForCard(f.game, first) : null;
    if (fam) touch(f.game, fam.name, s.created_at);
  }
  // A family's owned marks, wherever they came from.
  for (const row of owned) {
    const fam = CATALOG_GAMES.includes(row.game) ? familyForCard(row.game, row.card_key) : null;
    const f = fam && fams.get(`${row.game}|${fam.name}`);
    if (f) f.owned.add(row.version_key);
  }
  return [...fams.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// Every version of a family, as checklist rows.
function familyVersions(game, name) {
  const { cards } = cardFamily(game, name);
  const out = [];
  for (const c of cards) {
    const card = getCard(game, c.key);
    for (const row of card.p) {
      const s = catalogData(game).sets[row[0]] || [];
      for (const v of versionsOf(game, row)) {
        out.push({ card: card.key, cardName: card.n, set: row[0], setName: s[0] || row[0], released: s[1] || null, number: row[1], version: v.key, label: v.label, rarity: v.rarity, rarityGroup: v.rarityGroup });
      }
    }
  }
  return { cards: cards.map((c) => c.key), versions: out };
}

// One family's answer. search: (criteria) → searchFamily result (injectable for tests).
export async function familyStillNeed(fam, search = searchFamily) {
  const { cards, versions } = familyVersions(fam.game, fam.name);
  const missing = versions.filter((v) => !fam.owned.has(v.version));
  let result = null;
  try {
    // The same query the card list runs, so the 15-minute cache is shared.
    result = await search(readFamilyCriteria(new URLSearchParams({ game: fam.game, cards: cards.join(','), q: fam.name, lang: 'en', limit: '1000', unsure: 'show' })));
  } catch { /* eBay down: versions without counts */ }
  const counts = result?.counts || {};
  const photos = {};
  for (const it of result?.items || []) {
    if (it.match?.kind === 'exact' && it.match.versions?.length === 1 && it.image && !photos[it.match.versions[0]]) photos[it.match.versions[0]] = it.image;
  }
  const rows = missing.map((v) => ({ ...v, forSale: counts[v.version] || 0, photo: photos[v.version] || null }));
  rows.sort((a, b) => b.forSale - a.forSale || String(b.released || '').localeCompare(String(a.released || '')));
  return {
    game: fam.game,
    name: fam.name,
    versions: versions.length,
    owned: versions.filter((v) => fam.owned.has(v.version)).length,
    missing: rows.length,
    missingForSale: rows.filter((r) => r.forSale > 0).length,
    // For sale first; the rest follow so the list is complete.
    rows,
    capped: !!result?.capped,
    searchFailed: !result,
  };
}

export async function stillNeed({ owned, searches, offset = 0, limit = STILL_NEED_DEFAULT, search }) {
  const all = startedFamilies(owned, searches);
  const n = Math.max(1, Math.min(STILL_NEED_MAX, limit));
  const page = all.slice(offset, offset + n);
  const families = await Promise.all(page.map((f) => familyStillNeed(f, search)));
  return {
    families,
    total: all.length,
    offset,
    nextOffset: offset + n < all.length ? offset + n : null,
    more: all.slice(offset + n).map((f) => ({ game: f.game, name: f.name })),
  };
}
