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
 * Universal ladder tier for a print run: the production tiers below plus
 * a separate 1/1 rung. Returns '1of1' | 'grail' | 'ultra' | 'rare' |
 * 'scarce', or null if run is not a positive integer.
 */
export function universalTierForRun(run) {
  if (Number(run) === 1) return '1of1';
  return tierForRun(run);
}

/**
 * Tier boundaries used everywhere: watchlist tile, search results,
 * homepage example, email template and the rarity tree.
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

/**
 * Row tint for a numbered listing in search results: a tier-coloured wash
 * from the left edge plus a 2px left border. Same values as TIER_ROW_STYLES
 * in ResultCard (app/page.js); the site tour uses this to show what a
 * results list looks like. Returns null for unnumbered cards.
 * TODO: ResultCard in app/page.js should switch to this export and drop its inline copy.
 */
export function tierRowStyle(tier) {
  const styles = {
    grail:  { bg: 'linear-gradient(90deg, rgba(255,180,30,0.42) 0%, rgba(245,200,80,0.15) 22%, transparent 55%)', border: '#ffc14d' },
    ultra:  { bg: 'linear-gradient(90deg, rgba(180,200,220,0.28) 0%, rgba(210,220,230,0.08) 18%, transparent 40%)', border: '#c8d4e0' },
    rare:   { bg: 'linear-gradient(90deg, rgba(200,90,30,0.24) 0%, rgba(220,110,50,0.06) 16%, transparent 32%)', border: '#d6722d' },
    scarce: { bg: 'linear-gradient(90deg, rgba(80,90,100,0.18) 0%, transparent 24%)', border: '#5a6470' },
  };
  const s = styles[tier];
  return s ? { backgroundImage: s.bg, borderLeft: `2px solid ${s.border}` } : null;
}
