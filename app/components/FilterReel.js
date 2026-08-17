'use client';

import { useState, useEffect, useRef } from 'react';

/* FilterReel — an autoplaying demo of what the product actually does.
 *
 * The loop: a player name types itself, print-run and toggle chips light up
 * one at a time, and a counter falls from eBay's noisy result count to the
 * handful that actually match. Roughly 9 seconds, then it resets.
 *
 * Why built in code rather than a video: a muted autoplay loop of this length
 * would be 1–3 MB, hurt mobile load, and need a poster frame. This is a few
 * KB, renders instantly, and stays sharp on any display.
 *
 * Honesty note: the numbers below are illustrative of the pattern (broad
 * keyword search returns mostly non-matching listings; stacked filters return
 * few but relevant ones), not a claim about one specific query.
 */

const QUERY = 'Caitlin Clark';

// Each step lights one chip and drops the count. Timings are cumulative
// offsets from the start of the chip phase.
const STEPS = [
  { at: 0,    chip: '/5',   from: 1240, to: 610 },
  { at: 700,  chip: '/10',  from: 610,  to: 340 },
  { at: 1400, chip: '/25',  from: 340,  to: 96 },
  { at: 2100, chip: 'Auto', from: 96,   to: 31 },
  { at: 2800, chip: 'RC',   from: 31,   to: 18 },
];

const TYPE_MS = 90;              // per character
const TYPE_TOTAL = QUERY.length * TYPE_MS;
const HOLD_MS = 2600;            // pause on the finished state before looping
const TOTAL = TYPE_TOTAL + 3500 + HOLD_MS;

const CHIP_META = {
  '/5':   { kind: 'grail' },
  '/10':  { kind: 'grail' },
  '/25':  { kind: 'grail' },
  '/50':  { kind: 'ultra' },
  '/99':  { kind: 'ultra' },
  'Auto': { kind: 'toggle' },
  'RC':   { kind: 'toggle' },
  'Graded': { kind: 'toggle' },
};

const ALL_CHIPS = ['/5', '/10', '/25', '/50', '/99', 'Auto', 'RC', 'Graded'];

function chipStyle(label, active) {
  const kind = CHIP_META[label]?.kind || 'toggle';
  if (!active) {
    return {
      color: 'var(--ink-500)',
      background: 'transparent',
      border: '0.5px solid rgba(232,226,213,0.14)',
      opacity: 0.35,
    };
  }
  if (kind === 'grail') {
    return {
      color: '#1a1612',
      backgroundImage: 'linear-gradient(180deg,#ffd97a,#d99c14)',
      border: '0.5px solid #ffc14d',
      fontWeight: 700,
      opacity: 1,
    };
  }
  if (kind === 'ultra') {
    return {
      color: '#1a1612',
      backgroundImage: 'linear-gradient(180deg,#e0e8f0,#98a5b3)',
      border: '0.5px solid #c8d4e0',
      fontWeight: 700,
      opacity: 1,
    };
  }
  return {
    color: 'var(--gold-bright)',
    background: 'rgba(201,149,74,0.06)',
    border: '0.5px solid var(--gold-deep)',
    opacity: 1,
  };
}

export default function FilterReel() {
  const [typed, setTyped] = useState('');
  const [activeChips, setActiveChips] = useState([]);
  const [count, setCount] = useState(1240);
  const [reduced, setReduced] = useState(false);
  const timers = useRef([]);

  // Respect prefers-reduced-motion — show the completed state, no animation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReduced(true);
      setTyped(QUERY);
      setActiveChips(STEPS.map((s) => s.chip));
      setCount(STEPS[STEPS.length - 1].to);
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;

    function clearTimers() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }

    function schedule(fn, ms) {
      timers.current.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    }

    function runCycle() {
      setTyped('');
      setActiveChips([]);
      setCount(STEPS[0].from);

      // Type the query one character at a time.
      for (let i = 1; i <= QUERY.length; i++) {
        schedule(() => setTyped(QUERY.slice(0, i)), i * TYPE_MS);
      }

      // Then light chips and tick the counter down.
      STEPS.forEach((step) => {
        const start = TYPE_TOTAL + 400 + step.at;
        schedule(() => {
          setActiveChips((prev) => [...prev, step.chip]);
          // Animate the number rather than snapping — the fall is the point.
          const frames = 14;
          for (let f = 1; f <= frames; f++) {
            schedule(() => {
              const v = Math.round(step.from + ((step.to - step.from) * f) / frames);
              setCount(v);
            }, (f * 260) / frames);
          }
        }, start);
      });

      schedule(runCycle, TOTAL);
    }

    runCycle();
    return () => { cancelled = true; clearTimers(); };
  }, [reduced]);

  const finalCount = STEPS[STEPS.length - 1].to;
  const pct = Math.max(4, Math.round((count / STEPS[0].from) * 100));

  return (
    <div
      className="rounded-xl p-5 md:p-6"
      style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line)' }}
      aria-label={`Demonstration: searching ${QUERY} with print run and autograph filters narrows ${STEPS[0].from} eBay listings to ${finalCount} matches.`}
    >
      {/* Typed query */}
      <div
        className="mb-4"
        style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-100)', minHeight: 28 }}
      >
        {typed}
        {!reduced && (
          <span
            className="ff-reel-caret inline-block align-baseline"
            style={{ width: 1, height: 20, background: 'var(--gold)', marginLeft: 2 }}
          />
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {ALL_CHIPS.map((label) => {
          const active = activeChips.includes(label);
          return (
            <span
              key={label}
              className="font-mono px-2 py-1 rounded"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.08em',
                transition: 'opacity 0.35s ease, background 0.35s ease, color 0.35s ease',
                ...chipStyle(label, active),
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Narrowing meter */}
      <div
        className="rounded-full overflow-hidden mb-2"
        style={{ height: 3, background: 'rgba(232,226,213,0.07)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundImage: 'linear-gradient(90deg,#d99c14,#ffd97a)',
            transition: 'width 0.26s linear',
          }}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--ink-500)' }}
        >
          eBay keyword search
        </span>
        <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--gold-bright)' }}>
          {count.toLocaleString('en-US')}{' '}
          <span style={{ fontSize: 10, fontStyle: 'normal', color: 'var(--ink-400)' }}>
            {count === 1 ? 'match' : 'matches'}
          </span>
        </span>
      </div>

      <style jsx>{`
        .ff-reel-caret { animation: ffReelBlink 1s steps(2, start) infinite; }
        @keyframes ffReelBlink { to { visibility: hidden; } }
        @media (prefers-reduced-motion: reduce) {
          .ff-reel-caret { animation: none; visibility: hidden; }
        }
      `}</style>
    </div>
  );
}
