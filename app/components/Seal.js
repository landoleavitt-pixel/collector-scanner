/* Brand seal — F&F monogram inside concentric circles.
   Used in header + footer. */
export default function Seal({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-label="Fields & Floors Collectors"
    >
      <circle cx="11" cy="11" r="10" stroke="var(--gold)" strokeWidth="0.8" fill="none" />
      <circle cx="11" cy="11" r="7" stroke="var(--gold)" strokeWidth="0.5" fill="none" opacity="0.55" />
      <text
        x="11"
        y="14.2"
        textAnchor="middle"
        fill="var(--gold)"
        fontSize="7.5"
        fontFamily="Instrument Serif"
        fontStyle="italic"
        letterSpacing="-0.5"
      >
        F&amp;F
      </text>
    </svg>
  );
}
