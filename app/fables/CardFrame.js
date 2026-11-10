'use client';

// One card picture for Foils & Fables: the seller's photo when a copy is for
// sale, otherwise our own card back (never game logos or official art).
// Same 63 × 88 shape and corners either way, so rows and tiles line up.
// Size it from the parent: <CardFrame className="w-12" … />.

import { useState } from 'react';
import s from './cardFrame.module.css';

// A faint colour per game, only in the glow and the edge.
const TINT = { pokemon: [242, 207, 107], mtg: [215, 154, 94], yugioh: [169, 140, 240], lorcana: [111, 209, 189] };
const DEFAULT_TINT = [143, 211, 232];

export function CardBack({ game }) {
  const [r, g, b] = TINT[game] || DEFAULT_TINT;
  return (
    <span className={s.back} aria-hidden="true"
          style={{ '--glow': `rgba(${r},${g},${b},.34)`, '--wash': `rgba(${r},${g},${b},.1)`, '--edge': `rgba(${r},${g},${b},.45)` }}>
      <span className={s.oval}><b className={s.mark}>F<i className={s.amp}>&amp;</i>F</b></span>
    </span>
  );
}

export default function CardFrame({ src, game, alt = 'Seller’s photo', className = '', style, lazy = true, children }) {
  const [bad, setBad] = useState(false);
  const photo = src && !bad;
  return (
    <span className={`${s.frame} ${className}`} style={style} role={photo ? undefined : 'img'} aria-label={photo ? undefined : 'No photo yet'}>
      {photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} onError={() => setBad(true)} className={s.photo} />
        : <CardBack game={game} />}
      {children}
    </span>
  );
}
