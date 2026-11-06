// lib/tcg/ladders.js
//
// Each game's rarity ladder, rarest first, as in research/non-sports-filters.md
// section 3. Copy says "ranked by the rarity printed on the card": none of
// these companies publish print runs.
//
// A rung:
//   key    stable id, used in URLs and saved searches
//   label  plain text for chips and filters
//   rank   1 = rarest. Rungs the research puts on one step share a rank.
//   tier   chip colour group: grail | ultra | rare | scarce, or null for the
//          plain rungs below them. Same keys as the sports tiers, so the UI can
//          reuse its colour slots; the names shown to people are in TIERS.
//   names  optional: what each match pattern is called on a result, so a card
//          shows "Shining" rather than the whole group name (QA 2026-10-31 #13)
//   match  title patterns (lowercase, accents removed). The parser walks the
//          ladder top down and the first rung with a matching pattern wins, so
//          "Special Illustration Rare" is caught before "Illustration Rare"
//          and "Mythic Rare" before "Rare".

// Rarity groups (DECISIONS.md 2026-11-01, research/fables-rarity-tiers.md):
// five plain groups, the same in every game, placed by how often a card of
// that rarity turns up in packs (community pack-opening counts; publishers
// don't publish odds). Promo and Vintage cards get a label instead of a group.
// `tier` is the colour slot a group uses, kept for alert emails and older
// screens; the placeholder names Grail / Relic / Treasure / Charm are gone.
export const GROUPS = [
  { key: 'extremely_rare', label: 'Extremely rare', tier: 'grail', meaning: 'Fewer than one in a box of packs' },
  { key: 'very_rare', label: 'Very rare', tier: 'ultra', meaning: 'A few in a box of packs' },
  { key: 'rare', label: 'Rare', tier: 'rare', meaning: 'Most packs have one' },
  { key: 'uncommon', label: 'Uncommon', tier: null, meaning: 'A few in most packs' },
  { key: 'common', label: 'Common', tier: null, meaning: 'Several in every pack' },
  { key: 'promo', label: 'Promo', tier: null, meaning: 'Given out, not found in packs' },
  { key: 'vintage', label: 'Vintage', tier: 'grail', meaning: 'Older cards, rare because of age' },
];
export const GROUP_KEYS = GROUPS.map((g) => g.key);
// Sort order for rarest first. Promo and Vintage have no pack odds, so where
// they sort is a judgement: Vintage with Extremely rare, Promo with Very rare.
export const GROUP_ORDER = { extremely_rare: 0, vintage: 0, very_rare: 1, promo: 1, rare: 2, uncommon: 3, common: 4 };
export const groupTier = (key) => GROUPS.find((g) => g.key === key)?.tier ?? null;
export const TIERS = [
  { key: 'grail', label: 'Extremely rare' },
  { key: 'ultra', label: 'Very rare' },
  { key: 'rare', label: 'Rare' },
];
export const TIER_ORDER = { grail: 0, ultra: 1, rare: 2, scarce: 3 };

// One Piece card codes, so single letters (L, R, C) only count right after one.
const OP_CODE = '(?:op|st|eb|prb)\\d{2}-\\d{3}';
const PARALLEL = '(?:parallel|alt(?:ernate)?[\\s-]*art|\\baa\\b)';

const r = (s) => new RegExp(s, 'i');

export const LADDERS = {
  // Scarlet & Violet and Mega Evolution eras, from Pokémon.com's symbol order,
  // with the vintage chase cards (Gold Star, Shining, Crystal, Secret Rare) at
  // the top of their eras. Japanese codes (MUR/UR, SAR, AR, SR, RR) come from
  // fan checklists; the research flags them to re-check against set lists.
  pokemon: [
    { key: 'mhr', label: 'Mega Hyper Rare', rank: 1, tier: 'grail', match: [r('mega hyper rare'), r('\\bmhr\\b'), r('\\bmur\\b')] },
    { key: 'star', label: 'Gold Star, Shining & Crystal', names: ['Gold Star', 'Gold Star', 'Shining', 'Crystal'], rank: 2, tier: 'grail', match: [r('gold star'), r('☆'), r('\\bshining\\b(?!\\s+(?:fates|legends))'), r('\\bcrystal\\b(?!\\s+guardians)')] },
    { key: 'hr', label: 'Hyper Rare', rank: 2, tier: 'grail', match: [r('hyper rare'), r('black white rare'), r('\\bbwr\\b'), r('\\bur\\b'), r('\\bgold\\s+(?:secret|rare|full\\s+art|hyper)\\b|\\bhyper\\s+gold\\b')] },
    { key: 'secret', label: 'Secret Rare', rank: 2, tier: 'grail', match: [r('secret rare')] },
    { key: 'sir', label: 'Special Illustration Rare', rank: 3, tier: 'grail', match: [r('special illustration'), r('\\bsir\\b'), r('\\bsar\\b')] },
    { key: 'ir', label: 'Illustration Rare', rank: 4, tier: 'ultra', match: [r('illustration rare'), r('mega attack rare'), r('\\bir\\b'), r('\\bar\\b')] },
    { key: 'ultra', label: 'Ultra Rare', rank: 5, tier: 'ultra', match: [r('ultra rare'), r('\\bsr\\b')] },
    { key: 'dr', label: 'Double Rare', rank: 6, tier: 'rare', match: [r('double rare'), r('\\brr\\b'), r('ace spec')] },
    { key: 'holo', label: 'Holo Rare', rank: 7, tier: 'scarce', match: [r('holo rare'), r('rare holo'), r('(?<!reverse[\\s-]*)\\bholo\\b')] },
    { key: 'rare', label: 'Rare', rank: 8, tier: null, match: [r('\\brare\\b')] },
    { key: 'uncommon', label: 'Uncommon', rank: 9, tier: null, match: [r('\\buncommon\\b')] },
    { key: 'common', label: 'Common', rank: 10, tier: null, match: [r('\\bcommon\\b')] },
  ],

  // Official printed rarities are Common, Uncommon, Rare and Mythic Rare. The
  // top three steps are collector treatments, ordered the way collectors value
  // them (a judgement, per the research).
  mtg: [
    { key: 'serialized', label: 'Serialized', rank: 1, tier: 'grail', match: [r('\\bseriali[sz]ed\\b'), r('serial[\\s-]*numbered')] },
    { key: 'vintage', label: 'Vintage set', names: ['Alpha', 'Beta', 'Unlimited', 'Arabian Nights', 'Legends'], rank: 2, tier: 'grail', match: [r('\\balpha\\b'), r('\\bbeta\\b'), r('\\bunlimited\\b'), r('arabian nights'), r('(?<!(?:multiverse|commander|dominaria|baldur\'s gate)\\s)\\blegends\\b(?!\\s+of\\b)')] },
    { key: 'special-foil', label: 'Special foil', names: ['Double rainbow foil', 'Textured foil', 'Surge foil', 'Galaxy foil', 'Halo foil', 'Etched foil', 'Step-and-compleat foil'], rank: 3, tier: 'ultra', match: [r('double rainbow'), r('\\btextured\\b'), r('surge foil'), r('galaxy foil'), r('halo foil'), r('\\betched\\b'), r('step[\\s-]*and[\\s-]*compleat')] },
    { key: 'mythic-treatment', label: 'Mythic, special frame', rank: 4, tier: 'rare', match: [r('^(?=.*\\bmythic\\b)(?=.*(?:borderless|showcase|extended art))')] },
    { key: 'mythic', label: 'Mythic Rare', rank: 5, tier: 'rare', match: [r('\\bmythic\\b')] },
    { key: 'rare', label: 'Rare', rank: 6, tier: 'scarce', match: [r('\\brare\\b')] },
    { key: 'uncommon', label: 'Uncommon', rank: 7, tier: null, match: [r('\\buncommon\\b')] },
    { key: 'common', label: 'Common', rank: 8, tier: null, match: [r('\\bcommon\\b')] },
  ],

  // Konami has no official ranking page; this follows Yugipedia.
  yugioh: [
    { key: 'starlight', label: 'Starlight & Quarter Century', names: ['Starlight Rare', 'Quarter Century Secret Rare', 'Quarter Century Secret Rare', 'Quarter Century Secret Rare', 'Quarter Century Secret Rare'], rank: 1, tier: 'grail', match: [r('starlight'), r('quarter century'), r('\\bqcsr\\b'), r('\\bqc[a-z]{2}-[a-z]{0,2}\\d{3}\\b'), r('\\b25th\\s+(?:anniversary\\s+)?secret\\b')] },
    { key: 'ghost', label: 'Ghost Rare', rank: 2, tier: 'grail', match: [r('ghost rare')] },
    { key: 'collectors', label: "Collector's & Ultimate Rares", names: ["Collector's Rare", 'Ultimate Rare', 'Platinum Secret Rare', 'Prismatic Secret Rare'], rank: 3, tier: 'ultra', match: [r("collector'?s rare"), r('ultimate rare'), r('platinum secret'), r('prismatic secret')] },
    { key: 'secret', label: 'Secret Rare', rank: 4, tier: 'rare', match: [r('secret rare')] },
    { key: 'ultra', label: 'Ultra Rare', rank: 5, tier: 'rare', match: [r('ultra rare')] },
    { key: 'super', label: 'Super Rare', rank: 6, tier: 'scarce', match: [r('super rare')] },
    { key: 'rare', label: 'Rare', rank: 7, tier: null, match: [r('\\brare\\b')] },
    { key: 'common', label: 'Common', rank: 8, tier: null, match: [r('\\bcommon\\b')] },
  ],

  // Printed codes (L, C, UC, R, SR, SEC, TR) are on Bandai's card list.
  // "Manga Rare" and "Super Parallel" are collector names, not printed.
  // Prize cards are rarer than any pack card, so they sit on top.
  onepiece: [
    // Bought or handed-out promos that only mention an event (event packs,
    // the Championship Set, celebration collections) aren't prize cards.
    { key: 'prize', label: 'Prize card', rank: 1, tier: 'grail', match: [r('^(?!.*(?:event\\s+(?:pack|pk)|celebration|championship\\s+set))(?=.*(?:championship|treasure cup|flagship))')] },
    { key: 'manga', label: 'Manga Rare & Super Parallel', names: ['Manga Rare', 'Super Parallel'], rank: 2, tier: 'grail', match: [r('\\bmanga\\b'), r('super parallel')] },
    { key: 'tr', label: 'Treasure Rare & SP', names: ['Treasure Rare', 'Treasure Rare', 'SP'], rank: 3, tier: 'ultra', match: [r('treasure rare'), r('\\btr\\b'), r('\\bsp\\b')] },
    { key: 'sec-parallel', label: 'Secret Rare, parallel', rank: 4, tier: 'ultra', match: [r(`^(?=.*(?:\\bsec\\b|secret rare))(?=.*${PARALLEL})`)] },
    { key: 'sec', label: 'Secret Rare', rank: 5, tier: 'rare', match: [r('\\bsec\\b'), r('secret rare')] },
    { key: 'sr-parallel', label: 'Super Rare, parallel', rank: 6, tier: 'rare', match: [r(`^(?=.*(?:\\bsr\\b|super rare))(?=.*${PARALLEL})`)] },
    { key: 'sr', label: 'Super Rare', rank: 7, tier: 'scarce', match: [r('\\bsr\\b'), r('super rare')] },
    { key: 'leader-parallel', label: 'Leader, parallel', rank: 8, tier: 'scarce', match: [r(`^(?=.*(?:\\bleader\\b|${OP_CODE}\\s*\\(?l\\b))(?=.*${PARALLEL})`)] },
    { key: 'leader', label: 'Leader', rank: 9, tier: null, match: [r('\\bleader\\b'), r(`${OP_CODE}\\s*\\(?l\\b`)] },
    { key: 'rare', label: 'Rare', rank: 10, tier: null, match: [r('\\brare\\b'), r(`${OP_CODE}\\s*\\(?r\\b`)] },
    { key: 'uncommon', label: 'Uncommon', rank: 11, tier: null, match: [r('\\buncommon\\b'), r('\\buc\\b')] },
    { key: 'common', label: 'Common', rank: 12, tier: null, match: [r('\\bcommon\\b'), r(`${OP_CODE}\\s*\\(?c\\b`)] },
  ],

  // Epic and Iconic were added in Set 9 "Fabled" (2025); order from Rare Candy.
  lorcana: [
    { key: 'iconic', label: 'Iconic', rank: 1, tier: 'grail', match: [r('\\biconic\\b')] },
    { key: 'enchanted', label: 'Enchanted', rank: 2, tier: 'grail', match: [r('\\benchanted\\b')] },
    { key: 'epic', label: 'Epic', rank: 3, tier: 'ultra', match: [r('\\bepic\\b')] },
    { key: 'legendary', label: 'Legendary', rank: 4, tier: 'rare', match: [r('\\blegendary\\b')] },
    { key: 'super', label: 'Super Rare', rank: 5, tier: 'scarce', match: [r('super rare')] },
    { key: 'rare', label: 'Rare', rank: 6, tier: null, match: [r('\\brare\\b')] },
    { key: 'uncommon', label: 'Uncommon', rank: 7, tier: null, match: [r('\\buncommon\\b')] },
    { key: 'common', label: 'Common', rank: 8, tier: null, match: [r('\\bcommon\\b')] },
  ],
};

// Each rung's group, from research/fables-rarity-tiers.md section 2.
// "UNSOURCED" = the research found no pull-rate source; placed by judgement.
const RUNG_GROUPS = {
  pokemon: {
    mhr: 'extremely_rare',
    star: 'extremely_rare', // UNSOURCED (Gold Star, Shining, Crystal)
    hr: 'extremely_rare', // Black White Rare in here: UNSOURCED
    secret: 'extremely_rare', // UNSOURCED (older "number above the set" cards)
    sir: 'extremely_rare',
    ir: 'very_rare', // Mega Attack Rare in here: UNSOURCED
    ultra: 'very_rare',
    dr: 'very_rare', // ACE SPEC in here: single source
    holo: 'rare',
    rare: 'rare',
    uncommon: 'uncommon',
    common: 'common',
  },
  mtg: {
    serialized: 'extremely_rare', // pack odds UNSOURCED; the print run is printed
    vintage: 'vintage', // Alpha, Beta, Unlimited, Arabian Nights, Legends (supply UNSOURCED)
    'special-foil': 'very_rare', // a treated rare; a treated mythic is Extremely rare (groupOf)
    'mythic-treatment': 'extremely_rare',
    mythic: 'very_rare',
    rare: 'rare', // a treated rare is Very rare (groupOf)
    uncommon: 'uncommon',
    common: 'common',
  },
  yugioh: {
    starlight: 'extremely_rare', // Quarter Century Secret in here: UNSOURCED
    ghost: 'extremely_rare', // UNSOURCED
    collectors: 'extremely_rare', // Collector's, Ultimate, Platinum, Prismatic: UNSOURCED
    secret: 'very_rare',
    ultra: 'very_rare',
    super: 'rare',
    rare: 'uncommon', // UNSOURCED (pack layout not sourced)
    common: 'common',
  },
  onepiece: {
    prize: 'promo', // event prizes: not in packs, no source on how many exist
    manga: 'extremely_rare', // Manga Rare, Super Parallel
    tr: 'extremely_rare', // SP sourced; Treasure Rare UNSOURCED
    'sec-parallel': 'extremely_rare', // UNSOURCED
    sec: 'very_rare',
    'sr-parallel': 'very_rare',
    sr: 'rare',
    'leader-parallel': 'very_rare',
    leader: 'very_rare', // UNSOURCED
    rare: 'rare', // UNSOURCED
    uncommon: 'uncommon',
    common: 'common',
  },
  lorcana: {
    iconic: 'extremely_rare', // single source
    enchanted: 'extremely_rare',
    epic: 'very_rare', // UNSOURCED
    legendary: 'very_rare',
    super: 'rare',
    rare: 'rare',
    uncommon: 'uncommon',
    common: 'common',
  },
};
for (const [game, rungs] of Object.entries(LADDERS)) {
  for (const rung of rungs) {
    rung.group = RUNG_GROUPS[game]?.[rung.key] || null;
    rung.tier = groupTier(rung.group);
  }
}

// Promos and special printings from outside packs (PRINTINGS in parseTitle.js).
// The List, Mystery Booster and World Championship decks are reprints and keep
// the card's own group.
const PROMO_PRINTINGS = new Set(['judge', 'prerelease', 'prize-pack', 'box-topper', 'stamped', 'book', 'promo']);
// Catalog names with no ladder step of their own: special-set chase cards the
// research puts in Extremely rare (UNSOURCED).
const CATALOG_EXTREMELY_RARE = /\bshiny\b|\bradiant\b|\bamazing\b|black white rare|pikachu rare|futuristic/i;
// TCGdex names the research doesn't cover at all, all UNSOURCED: older premium
// card types, placed with Ultra Rare.
const CATALOG_VERY_RARE = /holo rare v|lv\.x|\bprime\b|\blegend\b|full art trainer/i;

// A card's group. extras: printing (from the title), treated (borderless,
// showcase, extended art), mythic (the card's base rarity is Mythic),
// rarityText (the catalog's own name for the rarity).
export function groupOf(game, rungKey, extras = {}) {
  if (extras.printing && PROMO_PRINTINGS.has(extras.printing)) return 'promo';
  if (extras.rarityText && /\bpromo\b/i.test(extras.rarityText)) return 'promo';
  if (extras.rarityText && CATALOG_EXTREMELY_RARE.test(extras.rarityText)) return 'extremely_rare';
  if (extras.rarityText && CATALOG_VERY_RARE.test(extras.rarityText)) return 'very_rare';
  if (extras.rarityText && /classic collection/i.test(extras.rarityText)) return 'rare'; // UNSOURCED
  const rung = rungKey ? rungOf(game, rungKey) : null;
  if (!rung) return null;
  if (game === 'mtg') {
    if (rung.key === 'rare' && extras.treated) return 'very_rare';
    if (rung.key === 'mythic' && extras.treated) return 'extremely_rare';
    if (rung.key === 'special-foil' && extras.mythic) return 'extremely_rare';
  }
  return rung.group;
}

// rarity=<values> → groups. Group keys pass through. Older saved searches hold
// ladder keys ("sir", "pokemon:sir"); those become the rung's group.
export function rarityValuesToGroups(values, games) {
  const out = new Set();
  for (const raw of values) {
    const v = String(raw).toLowerCase();
    if (GROUP_KEYS.includes(v)) { out.add(v); continue; }
    const [g, k] = v.includes(':') ? v.split(':') : [null, v];
    for (const game of g ? [g] : games) {
      const group = rungOf(game, k)?.group;
      if (group) out.add(group);
    }
  }
  return [...out];
}

export function rungOf(game, key) {
  return (LADDERS[game] || []).find((g) => g.key === key) || null;
}

// The lowest rank on a game's ladder, so ranks can be compared across games
// (rank / bottom: 0 = rarest, 1 = most common).
export function bottomRank(game) {
  const ladder = LADDERS[game] || [];
  return ladder.length ? ladder[ladder.length - 1].rank : 1;
}

// Title words to nudge eBay toward a rung, for the search query's OR group.
// Only plain words; the regexes above stay the real check.
export const RUNG_QUERY_WORDS = {
  pokemon: { mhr: ['"mega hyper rare"', 'MUR'], star: ['"gold star"', 'shining', 'crystal'], hr: ['"hyper rare"', 'gold', 'BWR', 'UR'], secret: ['"secret rare"'], sir: ['SIR', '"special illustration"', 'SAR'], ir: ['"illustration rare"', 'IR', 'AR'], ultra: ['"ultra rare"', 'SR'], dr: ['"double rare"', 'RR', '"ace spec"'], holo: ['holo'] },
  mtg: { serialized: ['serialized', 'serial'], vintage: ['alpha', 'beta', 'unlimited', '"arabian nights"', 'legends'], 'special-foil': ['"double rainbow"', 'textured', 'surge', 'galaxy', 'halo', 'etched'], 'mythic-treatment': ['mythic'], mythic: ['mythic'] },
  yugioh: { starlight: ['starlight', '"quarter century"', 'QCSR'], ghost: ['"ghost rare"'], collectors: ['"collectors rare"', '"ultimate rare"', '"platinum secret"', '"prismatic secret"'], secret: ['"secret rare"'], ultra: ['"ultra rare"'], super: ['"super rare"'] },
  onepiece: { prize: ['championship', '"treasure cup"', 'flagship'], manga: ['manga', '"super parallel"'], tr: ['"treasure rare"', 'TR', 'SP'], 'sec-parallel': ['SEC'], sec: ['SEC', '"secret rare"'], 'sr-parallel': ['SR'], sr: ['SR', '"super rare"'], 'leader-parallel': ['leader'], leader: ['leader'] },
  lorcana: { iconic: ['iconic'], enchanted: ['enchanted'], epic: ['epic'], legendary: ['legendary'], super: ['"super rare"'] },
};
