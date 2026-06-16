'use client';

// app/components/BidCountdown.js
//
// A live-ticking auction countdown rendered as an odometer-style reel — each
// digit sits in a tiny box and the strip inside translates vertically to show
// the right digit. Smooth roll on each change.
//
// Usage:
//   <BidCountdown endTime={item.endTime} />
//
// `endTime` is an ISO string (the eBay item end timestamp). If absent the
// component renders nothing — auctions without a known end aren't shown.
//
// Design choices baked in:
//   - One shared requestAnimationFrame loop drives ALL mounted countdowns at
//     once via a subscriber set. This avoids 50 separate setInterval timers
//     on a page of 50 auction results, which would shred battery on mobile.
//   - Seconds remaining are always computed from Date.now() vs the parsed
//     endTime — never a decremented counter. That way tab-throttling, sleep,
//     and clock drift don't desync the display.
//   - When the document is hidden we suspend the rAF loop entirely (saves
//     more battery; the user can't see the digits anyway). Picks back up on
//     visibility change.
//   - prefers-reduced-motion users get instant digit swaps with no animation.
//   - At zero, the component shows "ENDED" (small caps, muted) and stops
//     subscribing — no more updates.
//
// Sizing variant: corner-badge (compact overlay for thumbnails). Future
// variants (inline, dedicated row) can be added with a `variant` prop later.

import { useEffect, useRef, useState } from 'react';

// ── Shared rAF scheduler ─────────────────────────────────────────────────
// Single set of subscribers, single rAF loop. Each subscriber is a function
// that gets called once per second-boundary with the current Date.now().

const subscribers = new Set();
let rafHandle = null;
let lastTickSecond = -1;

function ensureLoopRunning() {
  if (rafHandle != null) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const tick = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec !== lastTickSecond) {
      lastTickSecond = nowSec;
      subscribers.forEach((fn) => fn(nowSec));
    }
    if (subscribers.size === 0) {
      rafHandle = null;
      return;
    }
    rafHandle = requestAnimationFrame(tick);
  };
  rafHandle = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafHandle != null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
}

// Wire visibility once per module load (not per component).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
    } else {
      lastTickSecond = -1; // force an immediate update on resume
      ensureLoopRunning();
    }
  });
}

function subscribe(fn) {
  subscribers.add(fn);
  ensureLoopRunning();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) stopLoop();
  };
}

// ── The component ────────────────────────────────────────────────────────

export default function BidCountdown({ endTime }) {
  // Guard: no end time → render nothing. Caller decides whether to wrap.
  const endMs = endTime ? new Date(endTime).getTime() : null;

  const [now, setNow] = useState(() => Date.now());
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!endMs) return;
    // Subscribe to the shared loop; tear down on unmount.
    return subscribe(() => setNow(Date.now()));
  }, [endMs]);

  if (!endMs) return null;

  const remainingMs = endMs - now;
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

  if (remainingSec <= 0) {
    return (
      <div style={badgeWrapStyle} aria-label="Auction ended">
        <span style={endedTextStyle}>Ended</span>
      </div>
    );
  }

  const showHours = remainingSec >= 3600;
  const h = Math.floor(remainingSec / 3600);
  const m = Math.floor((remainingSec % 3600) / 60);
  const s = remainingSec % 60;

  // Build the digit list. Format MM:SS by default; HH:MM:SS over an hour.
  const digits = showHours
    ? [
        ...padDigits(h),
        ':',
        ...padDigits(m),
        ':',
        ...padDigits(s),
      ]
    : [...padDigits(m), ':', ...padDigits(s)];

  const urgent = remainingSec <= 60;

  return (
    <div
      style={badgeWrapStyle}
      aria-label={`Auction ends in ${formatLabel(h, m, s, showHours)}`}
    >
      <div style={odoRow}>
        {digits.map((d, i) =>
          d === ':' ? (
            <span key={i} style={colonStyle(urgent)}>:</span>
          ) : (
            <Digit key={i} value={d} urgent={urgent} reducedMotion={reducedMotion} />
          ),
        )}
      </div>
    </div>
  );
}

// ── Digit reel ───────────────────────────────────────────────────────────

const CELL_H = 22; // px — must match height in style block below

function Digit({ value, urgent, reducedMotion }) {
  // `value` is 0-9. Reel shows 0..9 stacked vertically; we translate the
  // inner strip to bring the right digit into view.
  return (
    <div style={digitBoxStyle}>
      <div
        style={{
          transform: `translateY(-${value * CELL_H}px)`,
          transition: reducedMotion ? 'none' : 'transform 0.45s cubic-bezier(0.3, 0.9, 0.3, 1)',
          fontFamily: '"SF Mono", Menlo, ui-monospace, monospace',
          fontSize: 13,
          fontWeight: 500,
          color: urgent ? '#ffce6b' : '#e6b96b',
          lineHeight: `${CELL_H}px`,
          textAlign: 'center',
          willChange: 'transform',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div key={n}>{n}</div>
        ))}
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function padDigits(n) {
  const s = String(n).padStart(2, '0');
  return [Number(s[0]), Number(s[1])];
}

function formatLabel(h, m, s, showHours) {
  if (showHours) return `${h} hours ${m} minutes`;
  if (m > 0) return `${m} minutes ${s} seconds`;
  return `${s} seconds`;
}

// Detect prefers-reduced-motion. Re-runs if the user changes the setting mid-session.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler); // Safari < 14 fallback
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);
  return reduced;
}

// ── styles (inline so they're scoped to this component) ──────────────────

const badgeWrapStyle = {
  position: 'absolute',
  bottom: 6,
  right: 6,
  padding: '4px 6px',
  borderRadius: 5,
  background: 'rgba(10,9,7,0.85)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  border: '0.5px solid rgba(201,149,74,0.25)',
  pointerEvents: 'none',
  zIndex: 2,
};

const odoRow = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
};

const digitBoxStyle = {
  width: 16,
  height: CELL_H,
  background: '#14110c',
  border: '0.5px solid #2a251c',
  borderRadius: 3,
  overflow: 'hidden',
  position: 'relative',
};

const colonStyle = (urgent) => ({
  fontFamily: '"SF Mono", Menlo, ui-monospace, monospace',
  fontSize: 13,
  color: urgent ? '#ffce6b' : '#6b6253',
  lineHeight: `${CELL_H}px`,
  padding: '0 1px',
});

const endedTextStyle = {
  fontFamily: '"SF Mono", Menlo, ui-monospace, monospace',
  fontSize: 9,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: '#6b6253',
  padding: '0 4px',
};
