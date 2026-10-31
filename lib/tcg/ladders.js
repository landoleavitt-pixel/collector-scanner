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
//   match  title patterns (lowercase, accents removed). The parser walks the
//          ladder top down and the first rung with a matching pattern wins, so
//          "Special Illustration Rare" is caught before "Illustration Rare"
//          and "Mythic Rare" before "Rare".

// Placeholder names until the boss approves (DECISIONS.md).
export const TIERS = [
  { key: 'grail', label: 'Grail', sports: 'Grail' },
  { key: 'ultra', label: 'Relic', sports: 'Ultra' },
  { key: 'rare', label: 'Treasure', sports: 'Rare' },
  { key: 'scarce', label: 'Charm', sports: 'Scarce' },
];
export const TIER_ORDER = Object.fromEntries(TIERS.map((t, i) => [t.key, i]));

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
    { key: 'star', label: 'Gold Star, Shining or Crystal', rank: 2, tier: 'grail', match: [r('gold star'), r('☆'), r('\\bshining\\b(?!\\s+(?:fates|legends))'), r('\\bcrystal\\b(?!\\s+guardians)')] },
    { key: 'hr', label: 'Hyper Rare', rank: 2, tier: 'grail', match: [r('hyper rare'), r('black white rare'), r('\\bbwr\\b'), r('\\bur\\b'), r('^(?!.*(?:metal|plated|\\d{2}k|burger king|gold\\s+(?:card|border|diamond|label|star)))(?=.*\\bgold\\b)')] },
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
    { key: 'vintage', label: 'Vintage set (Alpha, Beta, Unlimited, Arabian Nights, Legends)', rank: 2, tier: 'grail', match: [r('\\balpha\\b'), r('\\bbeta\\b'), r('\\bunlimited\\b'), r('arabian nights'), r('\\blegends\\b')] },
    { key: 'special-foil', label: 'Special foil', rank: 3, tier: 'ultra', match: [r('double rainbow'), r('\\btextured\\b'), r('surge foil'), r('galaxy foil'), r('halo foil'), r('\\betched\\b'), r('step[\\s-]*and[\\s-]*compleat')] },
    { key: 'mythic-treatment', label: 'Mythic, Borderless, Showcase or Extended Art', rank: 4, tier: 'rare', match: [r('^(?=.*\\bmythic\\b)(?=.*(?:borderless|showcase|extended art))')] },
    { key: 'mythic', label: 'Mythic Rare', rank: 5, tier: 'rare', match: [r('\\bmythic\\b')] },
    { key: 'rare', label: 'Rare', rank: 6, tier: 'scarce', match: [r('\\brare\\b')] },
    { key: 'uncommon', label: 'Uncommon', rank: 7, tier: null, match: [r('\\buncommon\\b')] },
    { key: 'common', label: 'Common', rank: 8, tier: null, match: [r('\\bcommon\\b')] },
  ],

  // Konami has no official ranking page; this follows Yugipedia.
  yugioh: [
    { key: 'starlight', label: 'Starlight Rare or Quarter Century Secret Rare', rank: 1, tier: 'grail', match: [r('starlight'), r('quarter century'), r('\\bqcsr\\b')] },
    { key: 'ghost', label: 'Ghost Rare', rank: 2, tier: 'grail', match: [r('ghost rare')] },
    { key: 'collectors', label: "Collector's, Ultimate, Platinum Secret or Prismatic Secret Rare", rank: 3, tier: 'ultra', match: [r("collector'?s rare"), r('ultimate rare'), r('platinum secret'), r('prismatic secret')] },
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
    { key: 'prize', label: 'Prize card (Championship, Treasure Cup, Flagship)', rank: 1, tier: 'grail', match: [r('^(?!.*(?:event\\s+(?:pack|pk)|celebration|championship\\s+set))(?=.*(?:championship|treasure cup|flagship))')] },
    { key: 'manga', label: 'Manga Rare or Super Parallel', rank: 2, tier: 'grail', match: [r('\\bmanga\\b'), r('super parallel')] },
    { key: 'tr', label: 'Treasure Rare or SP', rank: 3, tier: 'ultra', match: [r('treasure rare'), r('\\btr\\b'), r('\\bsp\\b')] },
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
