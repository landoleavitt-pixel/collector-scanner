'use client';

// app/components/RarityTree.js
//
// The rarity-tree visualization that lives inside CardModal. Shows the
// parallel family for a known set (numbered ladder + unnumbered list +
// universal rarity ladder), or falls back to just the universal ladder
// with a "set not in our database" callout when the set is unknown.
//
// Props:
//   setData     - the set object from parallelData.js, or null if unknown
//   parallelKey - the parallel key string (e.g. 'orange'), or null
//   printRun    - the detected serial-number print run from the title,
//                 used to highlight the right universal tier when the
//                 set is unknown (e.g. /50 → "Grail")

import { gradientCss, universalTierForRun } from './rarityUtils';

const UNIVERSAL_LADDER = [
  { key: '1of1',   name: '1/1 — One of one', range: '1',       lo: 1,   hi: 1 },
  { key: 'grail',  name: 'Grail',            range: '2–25',    lo: 2,   hi: 25 },
  { key: 'ultra',  name: 'Ultra rare',       range: '26–99',   lo: 26,  hi: 99 },
  { key: 'rare',   name: 'Rare',             range: '100–499', lo: 100, hi: 499 },
  { key: 'scarce', name: 'Scarce',           range: '500+',    lo: 500, hi: Infinity },
];

export default function RarityTree({ setData, parallelKey, printRun }) {
  // Determine universal tier from either the matched parallel's run OR
  // the print run detected in the title for unknown sets.
  let activeRun = printRun;
  if (setData && parallelKey) {
    const all = [...(setData.parallels.numbered || []), ...(setData.parallels.unnumbered || [])];
    const matched = all.find((p) => p.key === parallelKey);
    if (matched?.run) activeRun = matched.run;
  }
  const activeUniversalKey = activeRun ? universalTierForRun(activeRun) : null;

  // ── UNKNOWN SET — fallback rendering ──────────────────────────────
  if (!setData) {
    return (
      <div className="rounded-md p-4" style={treeFrameStyle}>
        <div
          className="rounded p-3.5 mb-3"
          style={{
            background: 'rgba(212,175,92,0.04)',
            border: '0.5px solid rgba(212,175,92,0.22)',
          }}
        >
          <p className="text-[9px] uppercase tracking-[0.22em] font-medium mb-1.5"
             style={{ color: 'var(--gold)' }}>
            Set not yet in our database
          </p>
          <p className="text-[11px] leading-[1.55]" style={{ color: 'var(--ink-200)' }}>
            We don&apos;t have the parallel lineup for this set yet — so we can&apos;t
            show you where it sits in its specific rainbow.
            {activeRun
              ? <> Based on the print run of <strong style={{ color: 'var(--gold-bright)' }}>/{activeRun}</strong>, here&apos;s how it ranks against the broader hobby.</>
              : <> Here&apos;s how the broader hobby ranks rarity by print run.</>
            }
          </p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--ink-400)' }}>
            Know this set well?{' '}
            <a href="mailto:contribute@fieldsandfloors.com"
               style={{ color: 'var(--gold)', textDecoration: 'none', borderBottom: '0.5px solid var(--gold-deep)' }}>
              Send us the parallel list →
            </a>
          </p>
        </div>

        <UniversalLadder activeKey={activeUniversalKey} />
      </div>
    );
  }

  // ── KNOWN SET — full tree ──────────────────────────────────────────
  const numbered = setData.parallels.numbered || [];
  const unnumbered = setData.parallels.unnumbered || [];

  return (
    <div className="rounded-md p-4" style={treeFrameStyle}>
      {/* Header */}
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-serif italic text-[13px]"
              style={{ color: 'var(--gold-bright)' }}>
          {setData.label}
        </span>
        <span className="text-[9px] uppercase tracking-[0.12em]"
              style={{ color: 'var(--ink-400)' }}>
          {numbered.length + unnumbered.length} parallels
        </span>
      </div>
      <p className="text-[9px] mb-3" style={{ color: 'var(--ink-400)' }}>
        Source: {setData.sourceCredit}
      </p>

      {/* Numbered parallels */}
      {numbered.length > 0 && (
        <>
          <SectionLabel>Numbered parallels</SectionLabel>
          {numbered.map((p) => (
            <ParallelRow
              key={p.key}
              parallel={p}
              isActive={p.key === parallelKey}
              runDisplay={`/${p.run}`}
            />
          ))}
        </>
      )}

      {/* Unnumbered parallels */}
      {unnumbered.length > 0 && (
        <>
          <SectionLabel>Unnumbered parallels in this set</SectionLabel>
          {unnumbered.map((p) => (
            <ParallelRow
              key={p.key}
              parallel={p}
              isActive={p.key === parallelKey}
              runDisplay={p.note || 'no serial'}
            />
          ))}
        </>
      )}

      {/* Universal ladder pinned at the bottom for cross-set context */}
      <SectionLabel>Universal rarity tier</SectionLabel>
      <UniversalLadder activeKey={activeUniversalKey} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.22em] mt-3 mb-1.5 pt-2.5"
       style={{
         color: 'var(--ink-300)',
         borderTop: '0.5px dashed rgba(232,226,213,0.08)',
       }}>
      {children}
    </p>
  );
}

function ParallelRow({ parallel, isActive, runDisplay }) {
  return (
    <div
      className="grid gap-2.5 items-center rounded px-2 py-1.5"
      style={{
        gridTemplateColumns: '22px 1fr auto',
        background: isActive ? 'rgba(212,175,92,0.10)' : 'transparent',
        border: isActive ? '0.5px solid rgba(212,175,92,0.4)' : '0.5px solid transparent',
        color: isActive ? 'var(--gold-bright)' : 'var(--ink-300)',
      }}
    >
      <div
        className="rounded-sm"
        style={{
          width: 16,
          height: 12,
          background: gradientCss(parallel.gradient),
          border: '0.5px solid rgba(232,226,213,0.15)',
        }}
      />
      <span
        className="text-[11px] truncate"
        style={{
          fontFamily: 'SF Mono, Menlo, monospace',
          color: isActive ? 'var(--gold-bright)' : 'var(--ink-300)',
        }}
      >
        {parallel.name}
      </span>
      <span
        className="text-[10px]"
        style={{
          fontFamily: 'SF Mono, Menlo, monospace',
          color: isActive ? 'var(--gold)' : 'var(--ink-400)',
          whiteSpace: 'nowrap',
        }}
      >
        {runDisplay}{isActive ? ' ← here' : ''}
      </span>
    </div>
  );
}

function UniversalLadder({ activeKey }) {
  return (
    <div>
      {UNIVERSAL_LADDER.map((tier) => {
        const isActive = tier.key === activeKey;
        return (
          <div
            key={tier.key}
            className="flex items-center gap-2 rounded px-1.5 py-1"
            style={{
              background: isActive ? 'rgba(212,175,92,0.08)' : 'transparent',
              color: isActive ? 'var(--gold-bright)' : 'var(--ink-300)',
              fontFamily: 'SF Mono, Menlo, monospace',
              fontSize: 10,
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: isActive ? 'var(--gold-bright)' : 'transparent',
                border: '1px solid var(--gold-deep)',
                boxShadow: isActive ? '0 0 6px rgba(232,185,107,0.6)' : 'none',
                flexShrink: 0,
              }}
            />
            <span className="flex-1">{tier.name}</span>
            <span style={{ color: isActive ? 'var(--gold)' : 'var(--ink-400)', fontSize: 9 }}>
              {tier.range}{isActive ? ' ← here' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const treeFrameStyle = {
  background: 'rgba(20,17,12,0.6)',
  border: '0.5px solid rgba(232,226,213,0.08)',
};
