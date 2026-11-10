'use client';

// app/components/UsageStatsToggle.js
//
// "Share usage stats" switch (Apple 5.1.1(ii): an easy way to
// withdraw consent). On by default. The choice lives on this device only
// (lib/track.js); turning it off stops all browser funnel events here.

import { useEffect, useState } from 'react';
import { statsEnabled, setStatsEnabled, STATS_CHANGED_EVENT } from '../../lib/track';

export default function UsageStatsToggle({ id = 'usage-stats' }) {
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setOn(statsEnabled());
    sync();
    setReady(true);
    window.addEventListener(STATS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(STATS_CHANGED_EVENT, sync);
  }, []);

  function toggle() {
    setStatsEnabled(!on);
    setOn(!on);
  }

  return (
    <div
      id={id}
      className="flex items-start justify-between gap-6 rounded-xl border border-[var(--ink-600)] bg-[var(--bg-elev)] p-5 scroll-mt-24"
    >
      <div>
        <p className="text-[var(--ink-100)] font-medium" id={`${id}-label`}>
          Share usage stats
        </p>
        <p className="mt-1 text-body text-[var(--ink-400)] leading-relaxed">
          Counts steps like searching or opening a card, with no name, email or
          search words. Also covers our product analytics. Your choice is saved
          on this device.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        onClick={toggle}
        disabled={!ready}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
          on
            ? 'bg-[var(--accent-bright)] border-[var(--accent-bright)]'
            : 'bg-transparent border-[var(--ink-600)]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform ${
            on ? 'translate-x-[22px] bg-[var(--ink-on-accent)]' : 'translate-x-[3px] bg-[var(--ink-400)]'
          }`}
        />
        <span className="sr-only">{on ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}
