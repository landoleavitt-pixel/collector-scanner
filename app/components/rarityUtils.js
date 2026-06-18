// app/components/rarityUtils.js
//
// Small shared helpers for the rarity-tree visualization.
// Kept separate from RarityTree.js so they can be unit-tested or reused
// by other components (e.g. a future per-card SEO page).

/**
 * Build a linear-gradient CSS string from a [from, to] hex pair.
 * Used for parallel color swatches and card-border tints.
 */
export function gradientCss(gradient) {
  if (!Array.isArray(gradient) || gradient.length < 2) {
    return gradient?.[0] || '#888';
  }
  return `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;
}

/**
 * Given a serial-number print run (e.g. 25, 99, 250), return the
 * universal rarity tier key it belongs to.
 *
 * Returns one of: '1of1' | 'grail' | 'ultra' | 'rare' | 'scarce'
 * Returns null if run is not a positive integer.
 */
export function universalTierForRun(run) {
  const n = Number(run);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n === 1)   return '1of1';
  if (n <= 25)   return 'grail';
  if (n <= 99)   return 'ultra';
  if (n <= 499)  return 'rare';
  return 'scarce';
}
