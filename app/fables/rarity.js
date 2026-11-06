'use client';

// Foils & Fables rarity groups (DECISIONS.md "Rarity groups approved";
// research/fables-rarity-tiers.md; mockups/fables-rarity-groups.html).
// Five groups in every game, placed by pack odds, plus Promo and Vintage.
// The engine puts `rarityGroup` on tcg-search, family-search and
// tcg-versions items and takes rarity=<groups> as the filter.

const FOIL = 'var(--foil)';
const WARM = { color: '#f0d9a8', border: '1px solid #6b5a38', background: 'rgba(240,217,168,.06)' };
const PLAIN = { color: 'var(--ink-200)', border: '1px solid var(--line)' };

// Rarest first. `chip`: the label style; `dot`: the small dot (checklist).
export const RARITY_GROUPS = [
  { key: 'extremely_rare', label: 'Extremely rare', meaning: 'Fewer than one in a box of packs', chip: { background: FOIL, color: '#0b0f1a' }, dot: FOIL },
  { key: 'very_rare', label: 'Very rare', meaning: 'A few in a box of packs', chip: { background: 'linear-gradient(180deg,#c9d3f5,#8b97c7)', color: '#0b0f1a' }, dot: 'linear-gradient(180deg,#c9d3f5,#8b97c7)' },
  { key: 'rare', label: 'Rare', meaning: 'Most packs have one', chip: { background: 'linear-gradient(180deg,#9fe3f5,#4b98ad)', color: '#071018' }, dot: 'linear-gradient(180deg,#9fe3f5,#4b98ad)' },
  { key: 'uncommon', label: 'Uncommon', meaning: 'A few in most packs', chip: PLAIN, dot: null },
  { key: 'common', label: 'Common', meaning: 'Several in every pack', chip: PLAIN, dot: null },
  { key: 'promo', label: 'Promo', meaning: 'Given out, not found in packs', chip: WARM, dot: '#c9a86a' },
  { key: 'vintage', label: 'Vintage', meaning: 'Older cards, rare because of age', chip: WARM, dot: '#c9a86a' },
];
const BY_KEY = Object.fromEntries(RARITY_GROUPS.map((g, i) => [g.key, { ...g, rank: i }]));

export const groupOf = (key) => BY_KEY[key] || null;
// For sorting: rarest first; unknown last.
export const groupRank = (key) => (BY_KEY[key] ? BY_KEY[key].rank : 99);
export const RARITY_SOURCE = 'How often a card turns up in packs, from community pack-opening counts.';

// Row tint by group, same strength as before (grail / ultra / rare).
export const GROUP_ROW = {
  extremely_rare: { backgroundImage: 'linear-gradient(90deg, rgba(182,168,240,0.30) 0%, rgba(240,179,208,0.10) 22%, transparent 55%)', borderLeft: '2px solid #d7c4f2' },
  very_rare: { backgroundImage: 'linear-gradient(90deg, rgba(201,211,245,0.22) 0%, rgba(201,211,245,0.06) 18%, transparent 40%)', borderLeft: '2px solid #c9d3f5' },
  rare: { backgroundImage: 'linear-gradient(90deg, rgba(159,227,245,0.20) 0%, rgba(159,227,245,0.05) 16%, transparent 32%)', borderLeft: '2px solid #9fe3f5' },
};

/** The coloured group label ("Extremely rare"). */
export function GroupChip({ group, className = '' }) {
  const g = groupOf(group);
  if (!g) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-[7px] text-[12px] font-semibold tracking-[0.02em] whitespace-nowrap ${className}`} style={g.chip}>
      {g.label}
    </span>
  );
}

/** Small dot plus word, for calm rows (checklist). */
export function GroupDot({ group }) {
  const g = groupOf(group);
  if (!g) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink-200)' }}>
      <i className="w-2.5 h-2.5 rounded-full flex-none" style={g.dot ? { background: g.dot } : { border: '1.5px solid var(--ink-600)' }} aria-hidden="true" />
      {g.label}
    </span>
  );
}
