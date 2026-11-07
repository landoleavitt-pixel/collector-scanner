// lib/tcg/familySearch.js
//
// Card-family search: one eBay search for a card's name, then every title is
// matched against the versions the collector picked (lib/tcg/family.js).
// Magic, English Pokémon, Yu-Gi-Oh! and Lorcana, the games with a free catalog.
//
// eBay cost: one call per search (200 listings, Buy It Now and auctions
// together), cached 15 minutes like the main search.

import { gameByKey, TCG_SINGLES_CATEGORY, CONDITION_GRADED, CONDITION_RAW } from './games';
import { fetchPool, toResult, PAGE_SIZE, NO_MAX_PRICE } from './search';
import { readShipping, shippingFilters } from '../ebay';
import { getCard, CATALOG_GAMES, versionsOf, catalogData } from './catalog';
import { bestMatch, catalogPrinting, catalogRarity, catalogGroup } from './catalogMatch';
import { compareRarity } from './score';
import { rungOf, rarityValuesToGroups } from './ladders';

const SORTS = { rarest: null, ending: 'endingSoonest', newest: 'newlyListed', price_asc: 'price', price_desc: '-price' };
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

// Shown by default. "unsure" = the right card, version not in the title.
// Japanese copies and unconfirmed promos follow the language and unsure
// choices: they're never counted as a picked version.
export function readFamilyCriteria(input) {
  const get = (k) => (input instanceof URLSearchParams ? input.get(k) : input?.[k] != null ? String(input[k]) : null);
  const game = CATALOG_GAMES.includes(get('game')) ? get('game') : null;
  // One card (card=) or a whole family (cards=key,key,… up to 100), searched
  // on eBay with q (the family name) or the first card's name.
  const keys = [...list(get('cards')), ...(get('card') ? [String(get('card'))] : [])].slice(0, 100);
  const cards = game ? [...new Map(keys.map((k) => getCard(game, k.slice(0, 120))).filter(Boolean).map((c) => [c.key, c])).values()] : [];
  const card = cards[0] || null;
  const q = String(get('q') || '').replace(/[^\p{L}\p{N}\s'&.\-/]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const versions = list(get('versions')).slice(0, 500);
  const langs = list(get('lang')).filter((l) => ['en', 'ja', 'other'].includes(l));
  const unsure = get('unsure') ? get('unsure') === 'show' : versions.length === 0;
  let priceMax = num(get('priceMax'));
  if (priceMax != null && priceMax >= NO_MAX_PRICE) priceMax = null;
  return {
    game,
    card,
    cards,
    q,
    versions,
    rarity: rarityValuesToGroups(list(get('rarity')), game ? [game] : []),
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
    ...readShipping(get),
  };
}

// What we send to eBay: the card name (first face of a two-faced Magic card,
// commas dropped), in singles, filtered by game.
export function familyQueryText(game, card) {
  // " - " in a Lorcana name isn't a word eBay should exclude.
  return card.n.split(/\s*\/\/\s*/)[0].replace(/[,:"]|\s-\s/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function ebayQuery(c) {
  const filters = [];
  if (c.priceMin != null || c.priceMax != null) filters.push(`price:[${c.priceMin ?? 0}..${c.priceMax ?? ''}],priceCurrency:USD`);
  if (c.graded === 'graded') filters.push(`conditionIds:{${CONDITION_GRADED}}`);
  if (c.graded === 'raw') filters.push(`conditionIds:{${CONDITION_RAW}}`);
  filters.push(...shippingFilters(c));
  return {
    q: c.q || familyQueryText(c.game, c.card),
    filters,
    aspectFilter: `categoryId:${TCG_SINGLES_CATEGORY},Game:{${gameByKey(c.game).aspect}}`,
    sort: SORTS[c.sort],
    pages: 1,
    listing: c.listing,
    single: true,
    offers: c.offers,
  };
}

const LANG_KEY = (language) => (language === 'Japanese' ? 'ja' : 'other');

function keep(c, it) {
  const m = it.match;
  if (m.kind === 'reject') return c.proxies && m.why === 'proxy or custom card';
  if (c.rarity?.length && !c.rarity.includes(it.parsed.rarityGroup)) return false;
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

export { catalogPrinting };

// A saved card-family search ("only the ones I need" alerts) as
// /api/tcg-family-search's query string. Saved filters: { game, cards (or one
// card), versions, needOnly, lang, graded, priceMin, priceMax, listing }; the
// saved query (the family name) is what's sent to eBay. Alerts look
// at the newest listings, the whole pool, and only at listings we can pin to
// a picked version when versions are picked. needOnly is applied by the alert
// checker (it removes versions the member owns). Mirrored in
// supabase/functions/poller/index.ts.
export const FAMILY_FILTER_KEYS = ['game', 'card', 'cards', 'versions', 'rarity', 'lang', 'graded', 'priceMin', 'priceMax', 'listing', 'freeShip', 'offers', 'shipFrom', 'returns'];
export function familySavedParams(filters = {}, query = '') {
  const params = new URLSearchParams({ sort: 'newest', limit: '1000' });
  if (query) params.set('q', query);
  for (const k of FAMILY_FILTER_KEYS) {
    const v = filters?.[k];
    if (v == null || v === '' || v === false || (Array.isArray(v) && !v.length)) continue;
    params.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  params.set('unsure', filters?.versions?.length ? 'hide' : 'show');
  return params;
}

export async function searchFamily(c) {
  const eq = ebayQuery(c);
  const pool = await fetchPool(eq);
  const cards = c.cards?.length ? c.cards : [c.card];
  const all = pool.items.map((it) => {
    const { match, card } = bestMatch(c.game, cards, it.title);
    const parsed = match.parsed;
    // Rarity from the catalog when the match pins it (lib/tcg/catalogMatch.js).
    const fromCatalog = catalogRarity(c.game, card, match, parsed.rarity);
    if (fromCatalog) {
      parsed.rarity = fromCatalog;
      parsed.rarityName = rungOf(c.game, fromCatalog)?.label || parsed.rarityName;
    }
    const groupFromCatalog = catalogGroup(c.game, card, match, parsed.rarityGroup);
    if (groupFromCatalog) {
      parsed.rarityGroup = groupFromCatalog.group;
      // These ladders lump several names into one step: show the printing's own.
      if (groupFromCatalog.name && (c.game === 'yugioh' || c.game === 'lorcana')) parsed.rarityName = groupFromCatalog.name;
    }
    const graded = it.conditionId === CONDITION_GRADED || (it.conditionId !== CONDITION_RAW && !!parsed.grade);
    return { ...it, parsed, graded, match, card };
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
    cards: cards.map((x) => x.key),
    query: eq.q,
    items: items.slice(c.offset, c.offset + c.limit).map((it) => ({
      ...toResult(it),
      match: { kind: it.match.kind, why: it.match.why, versions: it.match.versions, ...(it.match.listed ? { listed: it.match.listed } : {}) },
      catalog: catalogPrinting(c.game, it.card, it.match),
      raritySource: catalogGroup(c.game, it.card, it.match) ? 'catalog' : 'title',
      ...(cards.length > 1 ? { cardKey: it.match.kind === 'reject' ? null : it.card.key } : {}),
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
