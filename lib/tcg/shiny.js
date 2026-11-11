// lib/tcg/shiny.js
//
// "Shiny / Not shiny" (Boss for Landon, 2026-11-10), in the checklist's own
// words: Shiny is any foil finish (holo, reverse holo, foil, etched, cold
// foil); Not shiny is the regular finish.
//
// A title that names its finish ("Non-Holo", "Foil", "Reverse") decides: the
// seller has the card in hand. Otherwise a listing pinned to catalog versions
// takes their finish when they agree. When neither
// says, it's unknown (null), and a Shiny or Not shiny filter leaves it out
// and counts it, so the page can say "12 listings didn't say".

import { versionsOf } from './catalog';

// Yu-Gi-Oh! has no finish field: the printed rarity is the finish. Common,
// Short Print and Rare (a silver name only) are regular; Super Rare and up,
// and the foil commons (Starfoil, Shatterfoil, Mosaic, the parallels, the
// golds), are shiny.
const YGO_REGULAR = /^(?:common|short print|super short print|rare)$/i;

/** true (shiny), false (regular) or null (can't say) for one catalog version. */
export function versionShiny(game, v) {
  if (game === 'yugioh') return v.rarity ? !YGO_REGULAR.test(v.rarity) : null;
  if (['holo', 'reverse', 'foil', 'etched'].includes(v.finish)) return true;
  // TCGdex lists most modern ex, V and full-art cards as "normal" though the
  // cards themselves are foil, so a "normal" Very or Extremely rare Pokémon
  // card can't be called regular from the catalog alone.
  if (game === 'pokemon' && v.finish === 'normal' && ['very_rare', 'extremely_rare'].includes(v.rarityGroup)) return null;
  if (['normal', 'nonfoil'].includes(v.finish)) return false;
  return null; // Lorcana promos: finish not stated
}

/** The same for the versions a listing matched: all agree, or null. */
export function versionsShiny(game, card, versionKeys) {
  if (!card || !versionKeys?.length) return null;
  const want = new Set(versionKeys);
  const seen = new Set();
  for (const row of card.p) {
    for (const v of versionsOf(game, row)) if (want.has(v.key)) seen.add(versionShiny(game, v));
  }
  return seen.size === 1 ? [...seen][0] : null;
}

/** From the title: what parseTitle read as the finish (and, for Yu-Gi-Oh!, the rarity). */
export function titleShiny(parsed) {
  const f = parsed?.finish || [];
  if (f.includes('nonfoil') || f.includes('nonholo')) return false;
  if (f.some((x) => ['holo', 'reverse', 'foil', 'etched', 'coldfoil'].includes(x))) return true;
  if (parsed?.game === 'yugioh' && parsed.rarity) return !['common', 'rare'].includes(parsed.rarity);
  return null;
}

/** A listing's answer: the title's when it names a finish, else the catalog's. */
export function listingShiny(catalogAnswer, parsed) {
  const fromTitle = titleShiny(parsed);
  return fromTitle !== null ? fromTitle : catalogAnswer ?? null;
}
