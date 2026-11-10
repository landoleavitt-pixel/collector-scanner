'use client';

// The two-part switch between Fields & Floors (sports) and Foils & Fables
// (trading card games). Same account on both sides; only the look and the
// search change. Each side has its own dot: gold for sports, foil for fables.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { siteForHost, SPORTS_ORIGIN } from '../../lib/domains';

export default function SideSwitch({ fables, className = '' }) {
  // On the Foils & Fables domain, "/" is the Foils & Fables home, so the sports
  // side lives on its own domain (lib/domains.js).
  const [sportsHref, setSportsHref] = useState('/');
  useEffect(() => {
    if (siteForHost(window.location.host) === 'fables') setSportsHref(SPORTS_ORIGIN);
  }, []);
  const item = (on) => ({
    className: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-fine font-medium whitespace-nowrap transition-colors',
    style: on
      ? { background: 'var(--bg-elev-2)', color: 'var(--ink-100)', boxShadow: 'inset 0 0 0 1px var(--line)' }
      : { color: 'var(--ink-400)' },
  });
  return (
    <nav aria-label="Switch site" className={`inline-flex items-center gap-0.5 rounded-full p-[3px] ${className}`}
         style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <Link href={sportsHref} aria-current={!fables ? 'page' : undefined} {...item(!fables)}>
        <span className="w-[7px] h-[7px] rounded-full flex-none" style={{ background: '#e6b96b' }} aria-hidden="true" />
        Fields &amp; Floors
      </Link>
      <Link href="/fables" aria-current={fables ? 'page' : undefined} {...item(fables)}>
        <span className="w-[7px] h-[7px] rounded-full flex-none" style={{ background: 'linear-gradient(135deg,#9fe3f5,#b6a8f0,#f0b3d0,#f3d9a0)' }} aria-hidden="true" />
        Foils &amp; Fables
      </Link>
    </nav>
  );
}
