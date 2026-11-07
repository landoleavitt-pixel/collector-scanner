// lib/tcg/catalog.js
//
// "Every version of a card" for Magic, English Pokémon, Yu-Gi-Oh! and Lorcana, from the compact
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
import yugiohData from './catalog/yugioh.json';
import lorcanaData from './catalog/lorcana.json';
import { CATALOG_GAMES } from './catalogGames';
import { rungOf, groupOf, groupTier, POKEMON_VINTAGE_SETS } from './ladders';
import { rungFromText, normalize } from './parseTitle';

export { CATALOG_GAMES };
const DATA = { mtg: mtgData, pokemon: pokemonData, yugioh: yugiohData, lorcana: lorcanaData };

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

// Every card whose name holds the typed words as whole words ("Dark Magician"
// → Dark Magician Girl, Toon Dark Magician…). For matching listings, where a
// title may name any of them.
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

// What a card's name says it is, without the parts that make it another
// version of the same card:
//   Pokémon  the Pokémon, without ex / V / VMAX / GX… and Mega, Radiant, Dark,
//            regional forms or an owner ("Mega Charizard X ex" → charizard)
//   Lorcana  the character, without the version ("Elsa - Snow Queen" → elsa)
//   Magic    the name before the comma ("Sheoldred, the Apocalypse" → sheoldred)
//   Yu-Gi-Oh! the whole name
const PK_PREFIX = /^(?:(?:mega|m|dark|light|shining|radiant|galarian|alolan|hisuian|paldean|team\s+rocket's|[a-z.]+'s)\s+)+/;
const PK_SUFFIX = /(?:\s+(?:ex|gx|v|vmax|vstar|v-union|break|lv\.?\s*x|lv\.?\s*\d+|prime|legend|star|☆|δ|delta(?:\s+species)?|[xy]))+$/;
export function cardBase(game, name) {
  const n = normalize(name).replace(/\s+/g, ' ').trim();
  if (game === 'pokemon') return n.replace(PK_PREFIX, '').replace(PK_SUFFIX, '').trim();
  if (game === 'lorcana') return n.split(' - ')[0].trim();
  if (game === 'mtg') return n.split(/\s*\/\/\s*/)[0].split(',')[0].trim();
  return n;
}

// A card family for card lists and "every version" (DECISIONS.md): the cards
// that are this card, not every card that holds its words. "Charizard" →
// Charizard, Charizard ex, Mega Charizard X ex, Blaine's Charizard, not
// Charizard Spirit Link; "Dark Magician" → Dark Magician only, not Toon Dark
// Magician; "Black Lotus" → not Black Lotus Lounge. Tag teams count for each
// Pokémon in them ("Charizard & Braixen GX"). When no card fits that way
// (a partial name, "blue eyes"), it falls back to the whole-word list and says
// so with match: 'words'.
const baseIndex = {};
export function cardFamily(game, q, limit = 300) {
  if (!DATA[game]) return { cards: [], match: 'card' };
  const t = normalize(q).trim().replace(/\s+/g, ' ');
  if (t.length < 2) return { cards: [], match: 'card' };
  if (!baseIndex[game]) {
    baseIndex[game] = names(game).map((c) => ({ ...c, bases: (game === 'pokemon' ? c.name.split(/\s+&\s+/) : [c.name]).map((p) => cardBase(game, p)) }));
  }
  // A full name with its suffix ("Charizard ex") is that card alone.
  const typedBase = cardBase(game, t);
  const exact = names(game).filter((c) => c.norm === t);
  let hits = game === 'pokemon' && typedBase !== t && exact.length ? exact
    : baseIndex[game].filter((c) => c.bases.includes(typedBase) || c.norm === t);
  let match = 'card';
  if (!hits.length) { hits = familyCards(game, q, limit).map((f) => names(game).find((c) => c.key === f.key)); match = 'words'; }
  return {
    match,
    cards: hits.sort((a, b) => a.norm.length - b.norm.length || b.count - a.count).slice(0, limit)
      .map(({ key, name, count }) => ({ key, name, printings: count })),
  };
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
      rarityGroup: groupOf('pokemon', rung?.key, { rarityText: rarity, vintage: POKEMON_VINTAGE_SETS.has(set) }),
      tier: groupTier(groupOf('pokemon', rung?.key, { rarityText: rarity, vintage: POKEMON_VINTAGE_SETS.has(set) })),
    };
  });
}

// ── Yu-Gi-Oh! ───────────────────────────────────────────────────────────────
// A version is a printed code in one rarity ("LOB:EN001:ultra-rare"). 1st
// Edition and Unlimited share a code and YGOPRODeck doesn't list them apart.
// Rarity → ladder step. Beyond the ladder's own names, all UNSOURCED: gold and
// parallel cards sit a step above the card they copy.
const YGO_RUNG = {
  Common: 'common', 'Short Print': 'common', 'Super Short Print': 'common',
  Rare: 'rare', 'Starfoil Rare': 'rare', 'Shatterfoil Rare': 'rare', 'Mosaic Rare': 'rare',
  'Normal Parallel Rare': 'rare', 'Duel Terminal Normal Parallel Rare': 'rare',
  'Super Rare': 'super', 'Gold Rare': 'super', 'Duel Terminal Rare Parallel Rare': 'super',
  'Ultra Rare': 'ultra', "Ultra Rare (Pharaoh's Rare)": 'ultra', 'Premium Gold Rare': 'ultra', 'Platinum Rare': 'ultra',
  'Super Parallel Rare': 'ultra', 'Duel Terminal Super Parallel Rare': 'ultra',
  'Secret Rare': 'secret', 'Gold Secret Rare': 'secret', 'Extra Secret Rare': 'secret', 'Ultra Secret Rare': 'secret',
  'Ultra Parallel Rare': 'secret', 'Duel Terminal Ultra Parallel Rare': 'secret',
  "Collector's Rare": 'collectors', 'Ultimate Rare': 'collectors', 'Platinum Secret Rare': 'collectors',
  'Prismatic Secret Rare': 'collectors', 'Grand Master Rare': 'collectors',
  'Ghost Rare': 'ghost', 'Ghost/Gold Rare': 'ghost', '10000 Secret Rare': 'ghost',
  'Starlight Rare': 'starlight', 'Quarter Century Secret Rare': 'starlight',
};
const YGO_PROMO_SET = /promotional|promotion\b|prize|participation/i;

export function yugiohVersions(row) {
  const [set, number, rIdx] = row;
  const promoSet = YGO_PROMO_SET.test(DATA.yugioh.sets[set]?.[0] || '');
  return rIdx.map((i) => {
    const name = DATA.yugioh.rarities[i];
    const rarity = name === 'None' ? null : name;
    const rungKey = YGO_RUNG[name] || null;
    const rarityGroup = promoSet ? 'promo' : groupOf('yugioh', rungKey);
    return {
      key: `${set}:${number}:${slug(name)}`,
      label: rarity || 'Rarity not listed',
      rarity,
      finish: slug(name),
      language: /^PT/.test(number) ? 'pt' : 'en',
      tags: [],
      rarityKey: rungKey,
      rarityGroup,
      tier: groupTier(rarityGroup),
    };
  });
}

// ── Lorcana ─────────────────────────────────────────────────────────────────
const LORCANA_FINISH = { n: ['Non-foil', 'nonfoil'], f: ['Cold foil', 'foil'], p: ['Promo', 'promo'] };

export function lorcanaVersions(row) {
  const [set, number, rIdx, finishes] = row;
  const rarity = DATA.lorcana.rarities[rIdx];
  const rung = rungFromText('lorcana', normalize(rarity));
  const rarityGroup = groupOf('lorcana', rung?.key, { rarityText: rarity });
  return (finishes || 'n').split('').map((f) => ({
    key: `${set}:${number}:${f}`,
    label: LORCANA_FINISH[f][0],
    rarity,
    finish: LORCANA_FINISH[f][1],
    language: 'en',
    tags: [],
    rarityKey: rung ? rung.key : null,
    rarityGroup,
    tier: groupTier(rarityGroup),
  }));
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
  if (game === 'yugioh') return yugiohVersions(row);
  if (game === 'lorcana') return lorcanaVersions(row);
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
      ...(game === 'mtg' ? { type: s[2] || null } : { total: s[2] || null }),
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
