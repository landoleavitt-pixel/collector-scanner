// lib/tcg/catalog.js
//
// "Every version of a card" for Magic and English Pokémon, from the compact
// catalogs that scripts/build-tcg-catalog.mjs writes to lib/tcg/catalog/.
//
//   findCards(game, q)        name search, for the card picker
//   getCard(game, card)       one card (by key or exact name) or null
//   cardVersions(game, card)  every version: set → card number → version
//
// Words used here:
//   card key     "sheoldred-the-apocalypse", "charizard-ex"
//   version key  "<set>:<number>:<finish>", e.g. "dmu:107:f" (Magic, foil)
//                or "sv03.5:199:h" (Pokémon, holo). Stable across rebuilds,
//                so it's safe to store in owned_cards and saved searches.
//
// Each version carries the rung and tier from our rarity ladders, so the
// checklist uses the same colours as search results.

import mtgData from './catalog/mtg.json';
import pokemonData from './catalog/pokemon.json';
import { rungOf, groupOf, groupTier } from './ladders';
import { rungFromText, normalize } from './parseTitle';

export const CATALOG_GAMES = ['mtg', 'pokemon'];
const DATA = { mtg: mtgData, pokemon: pokemonData };

export function catalogData(game) {
  return DATA[game] || null;
}

export function slug(s) {
  return normalize(s).replace(/['.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Names ───────────────────────────────────────────────────────────────────
const nameIndex = {};
function names(game) {
  if (!nameIndex[game]) {
    nameIndex[game] = Object.entries(DATA[game].cards).map(([key, c]) => ({ key, name: c.n, norm: normalize(c.n), count: c.p.length }));
  }
  return nameIndex[game];
}

// Cards for what was typed. A match can start at any word of the name
// ("charizard" finds "Mega Charizard X ex"); names that start with it come
// first, then names with a word that starts with it, then any other match.
// Up to `limit` (default 10, max 300).
export function findCards(game, q, limit = 10) {
  if (!DATA[game]) return [];
  const t = normalize(q).trim();
  if (t.length < 2) return [];
  const atWord = new RegExp(`(?:^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const tiers = [[], [], []];
  for (const c of names(game)) {
    if (c.norm.startsWith(t)) tiers[0].push(c);
    else if (atWord.test(c.norm)) tiers[1].push(c);
    else if (c.norm.includes(t)) tiers[2].push(c);
  }
  const byFit = (a, b) => a.norm.length - b.norm.length || b.count - a.count;
  return tiers.flatMap((x) => x.sort(byFit)).slice(0, Math.max(1, Math.min(300, limit)))
    .map(({ key, name, count }) => ({ key, name, printings: count }));
}

// A card family: every card whose name holds the typed words as whole words
// ("Charizard" → Charizard, Charizard ex, Mega Charizard X ex, Charizard VMAX…).
export function familyCards(game, q, limit = 300) {
  if (!DATA[game]) return [];
  const t = normalize(q).trim().replace(/\s+/g, ' ');
  if (t.length < 2) return [];
  const whole = new RegExp(`(?:^|[^a-z0-9'])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`);
  return names(game).filter((c) => whole.test(c.norm))
    .sort((a, b) => a.norm.length - b.norm.length || b.count - a.count)
    .slice(0, limit)
    .map(({ key, name, count }) => ({ key, name, printings: count }));
}

export function getCard(game, card) {
  const data = DATA[game];
  if (!data || !card) return null;
  if (data.cards[card]) return { key: card, ...data.cards[card] };
  const t = normalize(card).trim();
  const exact = names(game).filter((c) => c.norm === t);
  // Case decides "Charizard ex" vs "Charizard EX" when both exist.
  const hit = exact.find((c) => DATA[game].cards[c.key].n === card) || exact[0];
  if (hit) return { key: hit.key, ...data.cards[hit.key] };
  const k = slug(card);
  return data.cards[k] ? { key: k, ...data.cards[k] } : null;
}

// ── Magic ───────────────────────────────────────────────────────────────────
const MTG_RARITY = { c: 'common', u: 'uncommon', r: 'rare', m: 'mythic', s: 'special', b: 'bonus' };
const MTG_FINISH = { n: 'Nonfoil', f: 'Foil', e: 'Etched foil' };
const VINTAGE_SETS = new Set(['lea', 'leb', '2ed', 'arn', 'leg']);
const SPECIAL_FOILS = ['doublerainbow', 'textured', 'surgefoil', 'galaxyfoil', 'halofoil', 'stepandcompleat'];
// Plain words for the treatments and promo types collectors name in titles.
export const MTG_TAG_LABELS = {
  serialized: 'Serialized', borderless: 'Borderless', showcase: 'Showcase', extendedart: 'Extended art',
  fullart: 'Full art', retro: 'Retro frame', goldborder: 'Gold border', textured: 'Textured foil',
  surgefoil: 'Surge foil', galaxyfoil: 'Galaxy foil', halofoil: 'Halo foil', doublerainbow: 'Double rainbow foil',
  stepandcompleat: 'Step-and-compleat foil', fracturefoil: 'Fracture foil', raisedfoil: 'Raised foil',
  ripplefoil: 'Ripple foil', rainbowfoil: 'Rainbow foil', silverfoil: 'Silver foil', manafoil: 'Mana foil',
  gilded: 'Gilded foil', embossed: 'Embossed', prerelease: 'Prerelease promo', promopack: 'Promo pack',
  stamped: 'Stamped', datestamped: 'Date stamped', judgegift: 'Judge promo', boxtopper: 'Box topper',
  poster: 'Poster', playtest: 'Playtest card', mediainsert: 'Media promo', buyabox: 'Buy-a-Box promo',
  bundle: 'Bundle promo', fnm: 'FNM promo', instore: 'In-store promo', japanshowcase: 'Japanese showcase',
  jpwalker: 'Japanese alternate art', concept: 'Concept art', sldbonus: 'Secret Lair bonus', thick: 'Thick display',
  oilslick: 'Oil slick', neonink: 'Neon ink', confettifoil: 'Confetti foil', storechampionship: 'Store Championship',
  tourney: 'Tournament promo', gameday: 'Game Day promo', playerrewards: 'Player Rewards', wizardsplaynetwork: 'WPN promo',
};
const MTG_PROMO_TAGS = new Set(['prerelease', 'promopack', 'stamped', 'datestamped', 'judgegift', 'mediainsert', 'buyabox', 'bundle', 'fnm', 'instore', 'playerrewards', 'wizardsplaynetwork', 'gameday', 'tourney', 'storechampionship', 'release', 'event']);
const LANG_LABEL = { en: 'English', ja: 'Japanese', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ko: 'Korean', ru: 'Russian', zhs: 'Chinese (simplified)', zht: 'Chinese (traditional)', ph: 'Phyrexian' };

export function mtgRungKey(set, rarity, finish, tags) {
  if (tags.includes('serialized')) return 'serialized';
  if (VINTAGE_SETS.has(set)) return 'vintage';
  if (finish === 'e' || SPECIAL_FOILS.some((t) => tags.includes(t))) return 'special-foil';
  const r = MTG_RARITY[rarity];
  if (r === 'mythic' && ['borderless', 'showcase', 'extendedart'].some((t) => tags.includes(t))) return 'mythic-treatment';
  return ['mythic', 'rare', 'uncommon', 'common'].includes(r) ? r : null;
}

// Scryfall's "special" and "bonus" rarities have no ladder step, and the
// research doesn't place them (all UNSOURCED): Masterpieces and bonus-sheet
// cards are chase cards, championship cards are prizes, and the rest
// (Timeshifted sheets) turn up about once a pack.
function mtgSpecialGroup(set, rarity) {
  if (rarity === 'b') return 'extremely_rare';
  if (rarity !== 's') return null;
  const type = DATA.mtg.sets[set]?.[2];
  if (type === 'masterpiece') return 'extremely_rare';
  if (type === 'memorabilia') return 'promo';
  return 'rare';
}

// One printing → its versions (one per finish).
export function mtgVersions(row) {
  const [set, number, rarity, finishes, tagStr = '', lang = 'en', flavor = null] = row;
  const tags = tagStr ? tagStr.split(' ') : [];
  const named = tags.filter((t) => MTG_TAG_LABELS[t]).map((t) => MTG_TAG_LABELS[t]);
  return (finishes || 'n').split('').map((f) => {
    const rungKey = mtgRungKey(set, rarity, f, tags);
    // Promo printings by the catalog's own marks: a promo set, or a promo type.
    const promo = DATA.mtg.sets[set]?.[2] === 'promo' || tags.some((t) => MTG_PROMO_TAGS.has(t));
    const rarityGroup = promo && rungKey !== 'serialized' ? 'promo' : groupOf('mtg', rungKey, {
      treated: tags.some((t) => t === 'borderless' || t === 'showcase' || t === 'extendedart'),
      mythic: rarity === 'm',
    }) || mtgSpecialGroup(set, rarity);
    return {
      key: `${set}:${number}:${f}`,
      label: [MTG_FINISH[f] || f, ...named, ...(lang !== 'en' ? [LANG_LABEL[lang] || lang] : [])].join(' · '),
      rarity: MTG_RARITY[rarity] ? MTG_RARITY[rarity][0].toUpperCase() + MTG_RARITY[rarity].slice(1) : null,
      finish: f === 'n' ? 'nonfoil' : f === 'e' ? 'etched' : 'foil',
      language: lang,
      tags,
      ...(flavor ? { flavorName: flavor } : {}),
      rarityKey: rungKey,
      rarityGroup,
      tier: groupTier(rarityGroup),
    };
  });
}

// ── Pokémon ─────────────────────────────────────────────────────────────────
const PK_VARIANT = { n: 'Normal', h: 'Holo', r: 'Reverse holo', 1: '1st Edition' };

export function pokemonVersions(row, rarities) {
  const [set, number, rIdx, variants] = row;
  const rarity = rarities[rIdx] && rarities[rIdx] !== 'None' ? rarities[rIdx] : null;
  const base = rarity ? rungFromText('pokemon', normalize(rarity)) : null;
  const letters = (variants || 'n').split('');
  return letters.map((v) => {
    // A holo copy of a plain "Rare" is a Holo Rare; reverse holos keep the card's rarity.
    let rung = base;
    if (v === 'h' && (!base || base.key === 'rare')) rung = rungOf('pokemon', 'holo');
    if (v === '1' && letters.includes('h') && (!base || base.key === 'rare')) rung = rungOf('pokemon', 'holo');
    const label = v === '1' && letters.includes('h') ? '1st Edition Holo' : PK_VARIANT[v] || v;
    return {
      key: `${set}:${number}:${v}`,
      label,
      rarity,
      finish: v === 'h' ? 'holo' : v === 'r' ? 'reverse' : v === '1' ? (letters.includes('h') ? 'holo' : 'normal') : 'normal',
      firstEdition: v === '1',
      language: 'en',
      tags: [],
      rarityKey: rung ? rung.key : null,
      rarityGroup: groupOf('pokemon', rung?.key, { rarityText: rarity }),
      tier: groupTier(groupOf('pokemon', rung?.key, { rarityText: rarity })),
    };
  });
}

// ── Grouped list ────────────────────────────────────────────────────────────
// Number order: 1, 2, 10, 10a, 107p, TG01, SV001…
function numberOrder(a, b) {
  const na = parseInt(String(a).replace(/^\D+/, ''), 10);
  const nb = parseInt(String(b).replace(/^\D+/, ''), 10);
  const pa = String(a).match(/^\D*/)[0];
  const pb = String(b).match(/^\D*/)[0];
  if (pa !== pb) return pa.localeCompare(pb);
  if (na !== nb) return (Number.isNaN(na) ? 1e9 : na) - (Number.isNaN(nb) ? 1e9 : nb);
  return String(a).localeCompare(String(b));
}

export function versionsOf(game, row) {
  return game === 'mtg' ? mtgVersions(row) : pokemonVersions(row, DATA.pokemon.rarities);
}

// Every version of a card, sets newest first (as in the checklist mockup).
export function cardVersions(game, cardKey) {
  const data = DATA[game];
  const card = getCard(game, cardKey);
  if (!card) return null;
  const bySet = new Map();
  for (const row of card.p) {
    const [set, number] = row;
    if (!bySet.has(set)) bySet.set(set, new Map());
    const nums = bySet.get(set);
    if (!nums.has(number)) nums.set(number, []);
    nums.get(number).push(...versionsOf(game, row));
  }
  const sets = [...bySet.entries()].map(([code, nums]) => {
    const s = data.sets[code] || [];
    return {
      set: code,
      name: s[0] || code,
      released: s[1] || null,
      ...(game === 'pokemon' ? { total: s[2] || null } : { type: s[2] || null }),
      numbers: [...nums.entries()].sort(([a], [b]) => numberOrder(a, b)).map(([number, versions]) => ({
        number,
        rarity: versions[0]?.rarity || null,
        versions,
      })),
    };
  }).sort((a, b) => String(b.released || '').localeCompare(String(a.released || '')) || a.name.localeCompare(b.name));

  const count = sets.reduce((n, s) => n + s.numbers.reduce((m, x) => m + x.versions.length, 0), 0);
  return {
    game,
    card: { key: card.key, name: card.n, ...(game === 'mtg' ? { reservedList: !!card.rl } : {}) },
    sets,
    versionCount: count,
    source: data.source,
    built: data.built,
  };
}
