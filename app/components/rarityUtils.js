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

/**
 * Production tier boundaries used by the watchlist tile, search results,
 * homepage example, and email template. Slightly tighter than the
 * universalTierForRun() boundaries (rare caps at 249 not 499) — these
 * are what the user actually sees in production.
 */
export function tierForRun(run) {
  const n = typeof run === 'string'
    ? Number(run.replace(/^\//, ''))
    : Number(run);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n <= 25)  return 'grail';
  if (n <= 99)  return 'ultra';
  if (n <= 249) return 'rare';
  return 'scarce';
}

/**
 * Returns inline-style object for a print-run chip in the given tier.
 * Single source of truth for tier colors across the watchlist tile,
 * homepage example, and the (future) tier-correct email template.
 *
 * Outline-style "Auto" / "RC" / "Condition" toggles use OUTLINE_CHIP_STYLE.
 */
export function tierChipStyle(tier) {
  const styles = {
    grail:  { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#ffd97a,#d99c14)', border: '0.5px solid #ffc14d', fontWeight: 700 },
    ultra:  { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#e0e8f0,#98a5b3)', border: '0.5px solid #c8d4e0', fontWeight: 700 },
    rare:   { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#d6884a,#8e4f1f)', border: '0.5px solid #d6722d', fontWeight: 700 },
    scarce: { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#8a96a4,#4a5360)', border: '0.5px solid #5a6470', fontWeight: 600 },
  };
  return styles[tier] || styles.grail;
}

/**
 * Outline-style toggle chip (Auto, RC, Condition, Listing-Type).
 * Same look across watchlist tile, homepage example, and email template.
 */
export const OUTLINE_CHIP_STYLE = {
  color: 'var(--gold-bright)',
  background: 'rgba(201,149,74,0.06)',
  border: '0.5px solid var(--gold-deep)',
};
