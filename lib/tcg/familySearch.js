// lib/tcg/familySearch.js
//
// Card-family search: one eBay search for a card's name, then every title is
// matched against the versions the collector picked (lib/tcg/family.js).
// Magic and English Pokémon, the two games with a free catalog.
//
// eBay cost: one call per search (200 listings, Buy It Now and auctions
// together), cached 15 minutes like the main search.

import { gameByKey, TCG_SINGLES_CATEGORY, CONDITION_GRADED, CONDITION_RAW } from './games';
import { fetchPool, toResult, PAGE_SIZE, NO_MAX_PRICE } from './search';
import { getCard, CATALOG_GAMES, versionsOf, catalogData } from './catalog';
import { matchListing } from './family';
import { compareRarity } from './score';

const SORTS = { rarest: null, ending: 'endingSoonest', newest: 'newlyListed', price_asc: 'price', price_desc: '-price' };
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

// Shown by default. "unsure" = the right card, version not in the title.
// Japanese copies and unconfirmed promos follow the language and unsure
// choices: they're never counted as a picked version.
export function readFamilyCriteria(input) {
  const get = (k) => (input instanceof URLSearchParams ? input.get(k) : input?.[k] != null ? String(input[k]) : null);
  const game = CATALOG_GAMES.includes(get('game')) ? get('game') : null;
  const card = game ? getCard(game, String(get('card') || '').slice(0, 120)) : null;
  const versions = list(get('versions')).slice(0, 500);
  const langs = list(get('lang')).filter((l) => ['en', 'ja', 'other'].includes(l));
  const unsure = get('unsure') ? get('unsure') === 'show' : versions.length === 0;
  let priceMax = num(get('priceMax'));
  if (priceMax != null && priceMax >= NO_MAX_PRICE) priceMax = null;
  return {
    game,
    card,
    versions,
    langs: langs.length === 3 ? [] : langs,
    unsure,
    graded: ['graded', 'raw'].includes(get('graded')) ? get('graded') : 'any',
    priceMin: num(get('priceMin')),
    priceMax,
    listing: ['auction', 'bin'].includes(get('listing')) ? get('listing') : 'any',
    sort: Object.prototype.hasOwnProperty.call(SORTS, get('sort')) ? get('sort') : 'rarest',
    offset: Math.max(0, Math.min(10000, parseInt(get('offset'), 10) || 0)),
    limit: Math.max(1, Math.min(1000, parseInt(get('limit'), 10) || PAGE_SIZE)),
    proxies: get('proxies') === 'show',
  };
}

// What we send to eBay: the card name (first face of a two-faced Magic card,
// commas dropped), in singles, filtered by game.
export function familyQueryText(game, card) {
  return card.n.split(/\s*\/\/\s*/)[0].replace(/[,:"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function ebayQuery(c) {
  const filters = [];
  if (c.priceMin != null || c.priceMax != null) filters.push(`price:[${c.priceMin ?? 0}..${c.priceMax ?? ''}],priceCurrency:USD`);
  if (c.graded === 'graded') filters.push(`conditionIds:{${CONDITION_GRADED}}`);
  if (c.graded === 'raw') filters.push(`conditionIds:{${CONDITION_RAW}}`);
  return {
    q: familyQueryText(c.game, c.card),
    filters,
    aspectFilter: `categoryId:${TCG_SINGLES_CATEGORY},Game:{${gameByKey(c.game).aspect}}`,
    sort: SORTS[c.sort],
    pages: 1,
    listing: c.listing,
    single: true,
  };
}

const LANG_KEY = (language) => (language === 'Japanese' ? 'ja' : 'other');

function keep(c, it) {
  const m = it.match;
  if (m.kind === 'reject') return c.proxies && m.why === 'proxy or custom card';
  if (c.graded === 'graded' && !it.graded) return false;
  if (c.graded === 'raw' && it.graded) return false;
  const lang = m.kind === 'language' ? LANG_KEY(m.language) : it.parsed.language;
  if (c.langs.length && !c.langs.includes(lang)) return false;
  if (m.kind === 'language' || m.kind === 'unknown' || m.kind === 'promo') {
    // Can't be pinned to a version: shown only with "unsure" on, unless the
    // collector picked a version this unconfirmed promo could be.
    if (m.kind === 'promo' && c.versions.length && m.versions.some((v) => c.versions.includes(v))) return true;
    return c.unsure;
  }
  if (!c.versions.length) return true;
  return m.versions.some((v) => c.versions.includes(v));
}

// The catalog printing (set + card number) of an exact match, so the
// checklist can put a listing's photo on the right row.
export function catalogPrinting(game, card, match) {
  if (match.kind !== 'exact' || !match.versions.length) return null;
  const [set, number] = match.versions[0].split(':');
  const s = catalogData(game).sets[set];
  return { card: card.key, cardName: card.n, set, setName: s?.[0] || set, number, versions: match.versions };
}

export async function searchFamily(c) {
  const eq = ebayQuery(c);
  const pool = await fetchPool(eq);
  const all = pool.items.map((it) => {
    const match = matchListing(c.game, c.card, it.title);
    const parsed = match.parsed;
    // Rank by the catalog's rarity when the match is one printing.
    if (match.kind === 'exact') {
      const v = match.versions.map((k) => k.split(':'));
      const row = c.card.p.find((r) => r[0] === v[0]?.[0] && r[1] === v[0]?.[1]);
      const keys = row ? [...new Set(versionsOf(c.game, row).filter((x) => match.versions.includes(x.key)).map((x) => x.rarityKey))] : [];
      if (keys.length === 1 && keys[0]) parsed.rarity = keys[0];
    }
    const graded = it.conditionId === CONDITION_GRADED || (it.conditionId !== CONDITION_RAW && !!parsed.grade);
    return { ...it, parsed, graded, match };
  });

  const kinds = {};
  for (const it of all) kinds[it.match.kind] = (kinds[it.match.kind] || 0) + 1;

  let items = all.filter((it) => keep(c, it));
  if (c.sort === 'rarest') items.sort((a, b) => compareRarity(a.parsed, b.parsed));
  else if (c.sort === 'price_asc') items.sort((a, b) => a.price - b.price);
  else if (c.sort === 'price_desc') items.sort((a, b) => b.price - a.price);

  // For the checklist chips: listings for sale now, per version (only when a
  // listing is exactly one version) and per printing (set + number).
  const counts = {};
  const printingCounts = {};
  for (const it of all) {
    if (it.match.kind !== 'exact') continue;
    if (it.match.versions.length === 1) counts[it.match.versions[0]] = (counts[it.match.versions[0]] || 0) + 1;
    const p = it.match.versions[0]?.split(':').slice(0, 2).join(':');
    if (p) printingCounts[p] = (printingCounts[p] || 0) + 1;
  }

  return {
    card: { game: c.game, key: c.card.key, name: c.card.n },
    query: eq.q,
    items: items.slice(c.offset, c.offset + c.limit).map((it) => ({
      ...toResult(it),
      match: { kind: it.match.kind, why: it.match.why, versions: it.match.versions, ...(it.match.listed ? { listed: it.match.listed } : {}) },
      catalog: catalogPrinting(c.game, c.card, it.match),
    })),
    total: items.length,
    offset: c.offset,
    nextOffset: c.offset + c.limit < items.length ? c.offset + c.limit : null,
    kinds,
    counts,
    printingCounts,
    ebayTotal: pool.ebayTotal,
    capped: pool.ebayTotal > pool.fetchedMax,
  };
}
