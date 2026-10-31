// lib/tcg/score.js
//
// "Rarest first" for card games (research section 3):
//   1. serial-numbered cards by /N, smallest first (same as sports)
//   2. the rarity printed on the card, by each game's ladder
//   3. 1st Edition, then Shadowless, above other copies of the same rung
//   4. grade: 10s first, then lower grades, then raw cards
// Across games, ladders are compared by tier first, then by position on the
// ladder (rank / bottom rank), since a Pokémon rank 3 and a Lorcana rank 3
// aren't the same step.

import { rungOf, bottomRank, TIER_ORDER } from './ladders';

// Chip colour for a parsed card: the rung's tier, raised for serial-numbered
// cards using the sports cut-offs (/25, /99, /249, above).
export function tierOf(p) {
  const rung = p.game && p.rarity ? rungOf(p.game, p.rarity) : null;
  let tier = rung?.tier ?? null;
  if (p.serial?.of) {
    const of = p.serial.of;
    const bySerial = of <= 25 ? 'grail' : of <= 99 ? 'ultra' : of <= 249 ? 'rare' : 'scarce';
    if (tier == null || TIER_ORDER[bySerial] < TIER_ORDER[tier]) tier = bySerial;
  }
  return tier;
}

// A sort key: arrays compared element by element, smaller = rarer.
export function rarityKey(p) {
  const rung = p.game && p.rarity ? rungOf(p.game, p.rarity) : null;
  const tier = tierOf(p);
  const grade = p.grade?.grade;
  return [
    p.serial?.of ?? Infinity,
    tier == null ? 4 : TIER_ORDER[tier],
    rung ? rung.rank / bottomRank(p.game) : 2,
    p.firstEdition ? 0 : p.shadowless ? 1 : 2,
    grade == null ? (p.grade ? 11 : 12) : 10 - grade,
  ];
}

export function compareRarity(a, b) {
  const ka = rarityKey(a);
  const kb = rarityKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
  }
  return 0;
}
