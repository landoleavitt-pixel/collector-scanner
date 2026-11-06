// lib/tcg/search.js
//
// The Foils & Fables search: read the query string, ask eBay for card-game
// singles, read each title (parseTitle.js), filter, and sort.
//
// What goes to eBay (research section 4): the category (183454 = singles,
// so sealed product and lots are left out), the Game item specific via
// aspect_filter, graded vs raw via condition ids, price, listing type, and
// for Japanese only, the Language item specific. Everything else (rarity,
// serial, grader, grade, 1st Edition, proxies) is read from the title here,
// at no extra eBay cost.
//
// Quota: rarest-first fetches 2 pages of 200 per listing type (Buy It Now
// and auctions run as separate queries, as on the sports side), other sorts
// 1 page each. So a search costs 2–4 eBay calls, and the pool is cached for
// 15 minutes per eBay query, shared by everyone, with paging (offset) and
// the title filters served from that cache.

import { getAppToken, browseSearch, SHIP_FROM, readShipping, shippingFilters } from '../ebay';
import { GAMES, GAME_KEYS, gameByKey, TCG_SINGLES_CATEGORY, EXCLUDED_CATEGORIES, CONDITION_GRADED, CONDITION_RAW } from './games';
import { LADDERS, TIERS, GROUPS, RUNG_QUERY_WORDS, rungOf, rarityValuesToGroups } from './ladders';
import { parseTitle, normalize } from './parseTitle';
import { tierOf, compareRarity } from './score';

export const PAGE_SIZE = 48;
export const NO_MAX_PRICE = 100000;
export const GRADERS = ['PSA', 'CGC', 'BGS', 'TAG', 'SGC', 'ARS'];
export const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'ja', label: 'Japanese' },
  { key: 'other', label: 'Other languages' },
];
const SORTS = {
  rarest: null,
  ending: 'endingSoonest',
  newest: 'newlyListed',
  price_asc: 'price',
  'price-low': 'price',
  price_desc: '-price',
  'price-high': '-price',
};

const EBAY_PAGE = 200;
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map(); // eBay query -> { at, result }

// Game names typed into the search box ("pokemon charizard") pick the game
// instead of being sent to eBay, since many titles leave the name out.
const GAME_WORDS = [
  ['pokemon', /\bpok[eé]mon\b/gi],
  ['mtg', /\bmtg\b|\bmagic:?\s+the\s+gathering\b/gi],
  ['yugioh', /\byu-?gi-?oh!?/gi],
  ['onepiece', /\bone\s+piece\b/gi],
  ['lorcana', /\b(?:disney\s+)?lorcana\b/gi],
];

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// eBay's Card Condition values for raw singles (tested 2026-11-01).
export const CONDITIONS = {
  nm: { label: 'Near Mint or better', ebay: 'Near Mint or Better' },
  lp: { label: 'Lightly played', ebay: 'Lightly Played (Excellent)' },
  mp: { label: 'Moderately played', ebay: 'Moderately Played (Very Good)' },
  hp: { label: 'Heavily played', ebay: 'Heavily Played (Poor)' },
};
// Per game, which finishes and special-art kinds a title can name.
export const FINISHES = {
  pokemon: [['holo', 'Holo'], ['reverse', 'Reverse holo']],
  mtg: [['foil', 'Foil'], ['etched', 'Etched foil'], ['nonfoil', 'Non-foil']],
  lorcana: [['foil', 'Foil'], ['coldfoil', 'Cold foil']],
};
export const ARTS = {
  pokemon: [['fullart', 'Full art'], ['altart', 'Alternate art']],
  mtg: [['borderless', 'Borderless'], ['showcase', 'Showcase'], ['extended', 'Extended art'], ['retro', 'Retro frame']],
  onepiece: [['altart', 'Alternate art'], ['manga', 'Manga art']],
  yugioh: [['altart', 'Alternate art']],
  lorcana: [['fullart', 'Full art'], ['altart', 'Alternate art']],
};
const FINISH_KEYS = [...new Set(Object.values(FINISHES).flat().map(([k]) => k))];
const ART_KEYS = [...new Set(Object.values(ARTS).flat().map(([k]) => k))];

const truthy = (v) => v === '1' || v === 'true';
const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

// URLSearchParams (or a plain object) → criteria. Unknown values fall back
// to defaults, so nothing from the URL reaches eBay unchecked.
export function readCriteria(input) {
  const get = (k) => (input instanceof URLSearchParams ? input.get(k) : input?.[k] != null ? String(input[k]) : null);

  let q = String(get('q') || '').replace(/[^\p{L}\p{N}\s'&.\-/#]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  let games = list(get('game')).filter((g) => GAME_KEYS.includes(g));
  const typed = [];
  for (const [key, re] of GAME_WORDS) {
    re.lastIndex = 0;
    if (re.test(q)) { typed.push(key); q = q.replace(re, ' ').replace(/\s+/g, ' ').trim(); }
  }
  if (!games.length) games = typed.length ? typed : [...GAME_KEYS];

  // Rarity groups. Older saved searches hold ladder keys ("sir", "pokemon:sir"),
  // which become that rung's group, so existing alerts keep working.
  const rarity = rarityValuesToGroups(list(get('rarity')), games);

  const langs = list(get('lang')).filter((l) => ['en', 'ja', 'other'].includes(l));
  const graded = ['graded', 'raw'].includes(get('graded')) ? get('graded') : 'any';
  const grader = list(get('grader')).map((g) => g.toUpperCase()).filter((g) => GRADERS.includes(g));
  const grade = list(get('grade')).map(Number).filter((g) => g >= 1 && g <= 10);
  const priceMin = num(get('priceMin'));
  let priceMax = num(get('priceMax'));
  if (priceMax != null && priceMax >= NO_MAX_PRICE) priceMax = null;
  const sort = Object.prototype.hasOwnProperty.call(SORTS, get('sort')) ? get('sort') : 'rarest';
  const listing = ['auction', 'bin'].includes(get('listing')) ? get('listing') : 'any';
  const offset = Math.max(0, Math.min(10000, parseInt(get('offset'), 10) || 0));
  // Alerts and saved-search priming read the whole filtered pool in one go.
  const limit = Math.max(1, Math.min(1000, parseInt(get('limit'), 10) || PAGE_SIZE));

  return {
    q,
    games,
    rarity,
    langs: langs.length === 3 ? [] : langs, // [] = all
    graded: grader.length || grade.length ? (graded === 'raw' ? 'raw' : 'graded') : graded,
    grader,
    grade,
    firstEd: truthy(get('firstEd')),
    serialOnly: truthy(get('serialOnly')),
    priceMin,
    priceMax,
    sort,
    listing,
    offset,
    limit,
    proxies: get('proxies') === 'show',
    lots: get('lots') === 'show',
    // versions=1 is accepted for older callers; `catalog` is now always included.
    versions: truthy(get('versions')),
    // More filters (research/fables-filters-2.md). Title-read ones mean "only
    // listings that say so"; the rest are eBay's own search filters.
    finish: list(get('finish')).filter((v) => FINISH_KEYS.includes(v)),
    art: list(get('art')).filter((v) => ART_KEYS.includes(v)),
    promos: ['hide', 'only'].includes(get('promos')) ? get('promos') : 'show',
    cond: graded === 'raw' ? list(get('cond')).filter((v) => CONDITIONS[v]) : [],
    ...readShipping(get),
  };
}

// Extra words that steer eBay toward what the filters want. Each OR group is
// added only if the query stays within eBay's 100 characters; the title
// checks after the fetch are the real filter.
function queryText(c) {
  const parts = c.q ? [c.q] : [];
  const groups = [];
  // With a name typed on a catalog game, skip the rarity words: the catalog
  // sets the group, so a title needn't name the rarity to count.
  const catalogDecides = c.q && c.games.every((g) => g === 'mtg' || g === 'pokemon');
  if (c.rarity.length && !catalogDecides) {
    const words = new Set();
    for (const game of c.games) {
      for (const rung of LADDERS[game] || []) {
        if (c.rarity.includes(rung.group)) for (const w of RUNG_QUERY_WORDS[game]?.[rung.key] || []) words.add(w);
      }
    }
    if (c.rarity.includes('promo')) words.add('promo');
    if (words.size) groups.push(`(${[...words].join(', ')})`);
  }
  if (c.serialOnly) groups.push('(serialized, serial, numbered)');
  if (c.firstEd) groups.push('(1st, "first edition")');
  if (c.grader.length) groups.push(`(${c.grader.join(', ')})`);
  for (const g of groups) {
    if ([...parts, g].join(' ').length <= 100) parts.push(g);
  }
  return parts.join(' ');
}

// The eBay side of a search: everything that changes what eBay returns.
function ebayQuery(c) {
  const filters = [];
  if (c.priceMin != null || c.priceMax != null) {
    filters.push(`price:[${c.priceMin ?? 0}..${c.priceMax ?? ''}],priceCurrency:USD`);
  }
  if (c.graded === 'graded') filters.push(`conditionIds:{${CONDITION_GRADED}}`);
  if (c.graded === 'raw') filters.push(`conditionIds:{${CONDITION_RAW}}`);
  filters.push(...shippingFilters(c));

  const aspects = [`categoryId:${TCG_SINGLES_CATEGORY}`, `Game:{${c.games.map((g) => gameByKey(g).aspect).join('|')}}`];
  // Japanese only: the Language field is well filled for Japanese cards
  // (research section 2). Other choices are read from the title, so listings
  // with the field left blank aren't lost.
  if (c.langs.length === 1 && c.langs[0] === 'ja') aspects.push('Language:{Japanese}');
  // Raw condition: eBay's Card Condition item specific (filled on ~86% of
  // listings; listings with none are left out, which the filter's note says).
  if (c.cond.length) aspects.push(`Card Condition:{${c.cond.map((k) => CONDITIONS[k].ebay).join('|')}}`);

  return {
    q: queryText(c),
    filters,
    aspectFilter: aspects.join(','),
    sort: SORTS[c.sort],
    pages: c.sort === 'rarest' ? 2 : 1,
    listing: c.listing,
    // "Accepts offers": one query for Best Offer listings (auctions never take offers).
    offers: c.offers,
  };
}

export function normalizeItem(item) {
  const isAuction = item.buyingOptions?.includes('AUCTION') ?? false;
  const price = isAuction && item.currentBidPrice?.value
    ? parseFloat(item.currentBidPrice.value)
    : parseFloat(item.price?.value ?? 0);
  return {
    id: item.itemId,
    title: item.title,
    price,
    currency: item.currentBidPrice?.currency ?? item.price?.currency ?? 'USD',
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
    url: item.itemWebUrl,
    endTime: item.itemEndDate ?? null,
    buyingOptions: item.buyingOptions ?? [],
    bidCount: item.bidCount ?? null,
    conditionId: item.conditionId ?? null,
    categories: (item.categories || []).map((cat) => String(cat.categoryId)),
  };
}

async function fetchOne(eq, buyingOption, token) {
  let items = [];
  let total = 0;
  for (let page = 0; page < eq.pages; page++) {
    const params = new URLSearchParams({
      limit: String(EBAY_PAGE),
      offset: String(page * EBAY_PAGE),
      category_ids: TCG_SINGLES_CATEGORY,
      aspect_filter: eq.aspectFilter,
    });
    if (eq.q) params.set('q', eq.q);
    const filters = [...eq.filters, ...(buyingOption ? [`buyingOptions:{${buyingOption}}`] : [])];
    if (filters.length) params.set('filter', filters.join(','));
    if (eq.sort) params.set('sort', eq.sort);
    const data = await browseSearch(params, token);
    total = data.total ?? total;
    const batch = (data.itemSummaries ?? []).map(normalizeItem);
    items = items.concat(batch);
    if (batch.length < EBAY_PAGE || items.length >= total) break;
  }
  return { items, total };
}

export async function fetchPool(eq) {
  const key = JSON.stringify(eq);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  const token = await getAppToken();
  const one = eq.listing === 'auction' ? 'AUCTION' : eq.listing === 'bin' ? 'FIXED_PRICE' : null;
  // eq.single: one eBay call for both listing types (card-family search).
  const types = eq.offers ? ['BEST_OFFER'] : eq.single ? [one] : one ? [one] : ['FIXED_PRICE', 'AUCTION'];
  const parts = await Promise.all(types.map((t) => fetchOne(eq, t, token)));
  const seen = new Set();
  const items = parts.flatMap((p) => p.items).filter((it) => !seen.has(it.id) && seen.add(it.id));
  const result = {
    items,
    ebayTotal: parts.reduce((n, p) => n + p.total, 0),
    fetchedMax: types.length * eq.pages * EBAY_PAGE,
  };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), result });
  return result;
}

// A search for a card whose name starts a longer card's name ("Dark Magician"
// vs "Dark Magician Girl") leaves the longer card out unless it was typed.
const LONGER_NAMES = [
  ['dark magician', /\bdark\s+magician\s+(?:girl|knight|of\s+chaos)\b/],
  ['exodia', /\bexodia\s+necross\b/],
  ['stitch', /\bstitch\s+touch\b/],
];
function longerName(q, title) {
  return LONGER_NAMES.some(([name, longer]) => q.includes(name) && !longer.test(q) && longer.test(title) && !title.replace(new RegExp(longer.source, 'g'), ' ').includes(name));
}

// Title checks. Each returns true to keep the card.
function keep(c, it) {
  const p = it.parsed;
  if (!c.lots && (p.lot || it.categories.some((cat) => EXCLUDED_CATEGORIES.includes(cat)))) return false;
  if (!c.proxies && (p.proxy || p.nonCard)) return false;
  if (p.game && !c.games.includes(p.game)) return false;
  if (c.rarity.length && !c.rarity.includes(p.rarityGroup)) return false;
  if (c.langs.length && !c.langs.includes(p.language)) return false;
  if (c.graded === 'graded' && !it.graded) return false;
  if (c.graded === 'raw' && it.graded) return false;
  if (c.grader.length && !c.grader.includes(p.grade?.grader)) return false;
  if (c.grade.length && !c.grade.includes(p.grade?.grade)) return false;
  if (c.firstEd && !p.firstEdition) return false;
  if (c.serialOnly && !p.serial && p.rarity !== 'serialized') return false;
  // More filters: "only show X" for what titles name.
  if (c.finish.length && !c.finish.some((f) => p.finish?.includes(f))) return false;
  if (c.art.length && !c.art.some((a) => p.art?.includes(a))) return false;
  if (c.promos === 'hide' && p.printing) return false;
  if (c.promos === 'only' && !p.printing) return false;
  if (c.offers && !it.buyingOptions?.includes('BEST_OFFER')) return false;
  // Every typed word must be in the title (eBay matches loosely).
  if (c.q && longerName(normalize(c.q), normalize(it.title))) return false;
  if (c.q) {
    const t = normalize(it.title);
    for (const w of normalize(c.q).split(/\s+/)) {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`(?:^|[^\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'u').test(t)) return false;
    }
  }
  return true;
}

export function toResult(it) {
  const p = it.parsed;
  const rung = p.game && p.rarity ? rungOf(p.game, p.rarity) : null;
  return {
    id: it.id,
    title: it.title,
    price: it.price,
    currency: it.currency,
    image: it.image,
    url: it.url,
    endTime: it.endTime,
    buyingOptions: it.buyingOptions,
    bidCount: it.bidCount,
    game: p.game,
    // A special printing (prerelease, The List, stamped promo…) shows its own
    // label instead of the normal card's. One Piece prize cards keep theirs.
    rarity: p.printing && rung?.key !== 'prize' ? p.printingLabel : rung ? (p.rarity === rung.key && p.rarityName) || rung.label : null,
    rarityKey: rung ? rung.key : null,
    rarityGroup: p.rarityGroup ?? null,
    printing: p.printing,
    tier: tierOf(p),
    serial: p.serial,
    grade: p.grade,
    gradeLabel: p.grade ? [p.grade.grader, p.grade.grade].filter((x) => x != null).join(' ') : null,
    graded: it.graded,
    language: p.language,
    firstEdition: p.firstEdition,
    shadowless: p.shadowless,
    finish: p.finish || [],
    art: p.art || [],
    // Magic / English Pokémon with a name searched: the catalog printing the
    // listing fits (set + number), and where the rarity came from.
    ...(it.catalog !== undefined ? { catalog: it.catalog, raritySource: it.raritySource } : {}),
  };
}

const SORTERS = {
  ending: (a, b) => (Date.parse(a.endTime) || Infinity) - (Date.parse(b.endTime) || Infinity),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
};
SORTERS['price-low'] = SORTERS.price_asc;
SORTERS['price-high'] = SORTERS.price_desc;

export async function searchTcg(c) {
  const eq = ebayQuery(c);
  const pool = await fetchPool(eq);
  const oneGame = c.games.length === 1 ? c.games[0] : null;
  const japaneseAspect = eq.aspectFilter.includes('Language:');

  let items = pool.items.map((it) => {
    const parsed = parseTitle(it.title, { game: oneGame });
    // eBay already filtered on Language:{Japanese}; trust it when the title is silent.
    if (japaneseAspect && parsed.language === 'en') parsed.language = 'ja';
    const graded = it.conditionId === CONDITION_GRADED || (it.conditionId !== CONDITION_RAW && !!parsed.grade);
    return { ...it, parsed, graded };
  });
  // Magic and English Pokémon: rarity from the card catalog where a listing
  // fits a printing, before the rarity filter and the sort (lib/tcg/catalogMatch.js).
  // Loaded only for searches with a name, since the catalogs are large.
  if (c.q && c.games.some((g) => g === 'mtg' || g === 'pokemon')) {
    const { applyCatalog } = await import('./catalogMatch');
    items = applyCatalog(items, c.q);
  }
  items = items.filter((it) => keep(c, it));

  if (c.sort === 'rarest') items.sort((a, b) => compareRarity(a.parsed, b.parsed));
  else if (SORTERS[c.sort]) items.sort(SORTERS[c.sort]); // newest keeps eBay's order

  const page = items.slice(c.offset, c.offset + c.limit).map(toResult);

  return {
    items: page,
    total: items.length,
    offset: c.offset,
    nextOffset: c.offset + c.limit < items.length ? c.offset + c.limit : null,
    ebayTotal: pool.ebayTotal,
    capped: pool.ebayTotal > pool.fetchedMax,
  };
}

// For /api/tcg-meta and the filter UI.
export function tcgMeta() {
  return {
    games: GAMES.map((g) => ({ key: g.key, label: g.label })),
    ladders: Object.fromEntries(Object.entries(LADDERS).map(([game, rungs]) => [
      game,
      rungs.map(({ key, label, rank, tier, group }) => ({ key, label, rank, tier, group })),
    ])),
    tiers: TIERS.map(({ key, label }) => ({ key, label })),
    groups: GROUPS.map(({ key, label, meaning }) => ({ key, label, meaning })),
    groupSource: 'How often a card turns up in packs, from community pack-opening counts.',
    languages: LANGUAGES,
    graders: GRADERS,
    sorts: ['rarest', 'ending', 'newest', 'price_asc', 'price_desc'],
    // "More filters": per game where a filter only applies to some games.
    more: {
      finishes: FINISHES,
      arts: ARTS,
      conditions: Object.entries(CONDITIONS).map(([key, v]) => ({ key, label: v.label })),
      conditionNote: 'Hides listings with no condition stated',
      promos: [['show', 'Show'], ['hide', 'Hide'], ['only', 'Only promos']],
      shipFrom: SHIP_FROM,
    },
    pageSize: PAGE_SIZE,
    noMaxPrice: NO_MAX_PRICE,
  };
}

// A saved Foils & Fables search (query + filters) as /api/tcg-search's query
// string, for alerts. Filters use the same names as the URL; arrays are
// joined with commas. Alerts always look at the newest listings, and read
// the whole filtered pool. Mirrored in supabase/functions/poller/index.ts.
export const SAVED_FILTER_KEYS = ['game', 'rarity', 'lang', 'graded', 'grader', 'grade', 'firstEd', 'serialOnly', 'priceMin', 'priceMax', 'listing', 'finish', 'art', 'promos', 'cond', 'freeShip', 'offers', 'shipFrom', 'returns'];
// A saved search with `card` set is a card-family search instead
// (familySavedParams in lib/tcg/familySearch.js).
export function savedSearchParams(query, filters = {}) {
  const params = new URLSearchParams({ q: query || '', sort: 'newest', limit: '1000' });
  for (const k of SAVED_FILTER_KEYS) {
    const v = filters?.[k];
    if (v == null || v === '' || v === false || (Array.isArray(v) && !v.length) || (k === 'promos' && v === 'show')) continue;
    params.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v));
  }
  return params;
}
