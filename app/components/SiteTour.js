'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import Seal from './Seal';
import { tierChipStyle, OUTLINE_CHIP_STYLE } from './rarityUtils';
import { isNativeApp } from '../../lib/native';

/* SiteTour — a five-step walkthrough for first-time visitors.
 *
 * When it shows:
 *   - Automatically, once per browser (or app install), on a plain landing on
 *     "/" (no query string). A first visit that's a deep link (/?card=,
 *     /share/…, /watchlist) doesn't get it — they came for something specific.
 *   - On demand at /?tour=1, from the "Take the tour" links (account menu,
 *     footer, How it works). page.js skips its intro for that URL.
 *
 * It waits for the home-page intro to finish: page.js sets
 * window.__ffIntroDone and fires 'ff:intro-done' when the intro ends or is
 * skipped.
 *
 * Two presentations of the same steps:
 *   - Web: a centred modal (bottom sheet on phones).
 *   - iOS app (isNativeApp()): a full-height sheet with 44pt+ targets and
 *     swipe between steps. App Store rules shape its copy: no Stripe, no
 *     web prices, no "subscribe on the website". Step 4's "Start free trial"
 *     goes to /subscribe, which shows Apple's in-app purchase sheet (and the
 *     price) inside the app. The tour must never call Capacitor APIs —
 *     in particular it must NOT trigger the notification permission prompt;
 *     NativeBridge asks for that once someone has Base.
 *     No safe-area padding here: the web view already sits between the
 *     status bar and the home indicator (contentInset "always").
 */

const SEEN_KEY = 'ffTourSeen';
const INTRO_SETTLE_MS = 400;
const SWIPE_PX = 50;

// Backstop for when localStorage is blocked: never auto-show more than once
// per page load, even if the "seen" write failed.
let autoShownThisLoad = false;

function hasSeenTour() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return autoShownThisLoad;
  }
}

function markTourSeen() {
  autoShownThisLoad = true;
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable — autoShownThisLoad covers this page load */
  }
}

function afterIntro(fn) {
  let timer;
  const go = () => { timer = setTimeout(fn, INTRO_SETTLE_MS); };
  if (window.__ffIntroDone) {
    go();
    return () => clearTimeout(timer);
  }
  window.addEventListener('ff:intro-done', go, { once: true });
  return () => {
    window.removeEventListener('ff:intro-done', go);
    clearTimeout(timer);
  };
}

/* ── Step artwork ─────────────────────────────────────────────────────── */
// `lg` is the app sheet's larger sizing.

function SearchArt({ lg }) {
  return (
    <div
      className={`w-full flex items-center gap-2 pl-3.5 pr-1.5 ${lg ? 'h-[52px] rounded-xl' : 'max-w-[320px] h-[46px] rounded-lg'}`}
      style={{ background: 'var(--bg-base)', border: '0.5px solid var(--gold-deep)' }}
    >
      <span className={`flex-1 text-[var(--ink-100)] ${lg ? 'text-[17px]' : 'text-[14px]'}`}>
        Cooper Flagg<span className="ff-tour-caret text-[var(--gold)]">|</span>
      </span>
      {!lg && (
        <span
          className="text-[11px] font-semibold rounded-[5px] px-3 py-2"
          style={{ background: 'var(--gold)', color: 'var(--ink-on-gold, #1a1612)' }}
        >
          Search
        </span>
      )}
    </div>
  );
}

const TOUR_TIERS = [
  { tier: 'grail', label: 'The Grail' },
  { tier: 'ultra', label: 'Ultra Rare' },
  { tier: 'rare', label: 'Rare' },
  { tier: 'scarce', label: 'Scarce' },
];

function FilterArt({ lg }) {
  const chip = `font-mono tracking-[0.04em] rounded-full ${lg ? 'text-[13px] px-3 py-2' : 'text-[11px] px-2.5 py-1.5'}`;
  return (
    <div className={`flex flex-wrap justify-center ${lg ? 'gap-2' : 'gap-1.5 max-w-[330px]'}`}>
      {['Autographed', 'Rookie', 'Numbered'].map((label) => (
        <span key={label} className={chip} style={OUTLINE_CHIP_STYLE}>{label}</span>
      ))}
      {TOUR_TIERS.map(({ tier, label }) => (
        <span key={tier} className={chip} style={tierChipStyle(tier)}>{label}</span>
      ))}
      {!lg && (
        <span className={chip} style={{ color: 'var(--ink-400)', border: '0.5px solid var(--line)' }}>
          Under $300
        </span>
      )}
    </div>
  );
}

function WatchlistArt({ lg }) {
  return (
    <div
      className={`w-full flex items-center gap-3 ${lg ? 'p-3 rounded-xl' : 'max-w-[330px] p-2.5 rounded-lg'}`}
      style={{ background: 'var(--bg-base)', border: '0.5px solid var(--line)' }}
    >
      <div
        className={`rounded-[3px] flex-none ${lg ? 'w-[46px] h-16' : 'w-10 h-14'}`}
        style={{ background: 'linear-gradient(145deg, var(--line), var(--gold-deep) 50%, var(--line-soft))' }}
      />
      <div className={`flex-1 leading-snug text-[var(--ink-200)] ${lg ? 'text-[14px]' : 'text-[12px]'}`}>
        2025 Bowman Chrome Cooper Flagg Auto /10
        <span className={`block font-mono text-[var(--gold)] mt-1 ${lg ? 'text-[12px]' : 'text-[11px]'}`}>$1,240 · 2h 14m left</span>
      </div>
      <span className={`ff-tour-star text-[var(--gold)] ${lg ? 'text-[24px] w-11 text-center' : 'text-[20px]'}`} aria-hidden="true">★</span>
    </div>
  );
}

function AlertArt() {
  return (
    <div
      className="w-full max-w-[320px] p-3.5 rounded-lg"
      style={{ background: 'var(--bg-base)', border: '0.5px solid var(--line)' }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gold)] mb-2">Saved search</div>
      <div className="text-[13px] text-[var(--ink-100)] mb-2.5">Cooper Flagg · Auto · ≤/25 · under $300</div>
      <div className="flex gap-1.5">
        {['Hourly', 'Daily', 'Weekly'].map((f, i) => (
          <span
            key={f}
            className="font-mono text-[11px] rounded px-2 py-1"
            style={i === 0
              ? { color: 'var(--gold-bright)', border: '0.5px solid var(--gold)' }
              : { color: 'var(--ink-400)', border: '0.5px solid var(--line)' }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// App variant of step 4: a lock-screen style notification.
function PushArt() {
  return (
    <div
      className="w-full flex gap-2.5 rounded-[18px] px-3.5 py-3"
      style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--line)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8)' }}
    >
      <div
        className="w-[38px] h-[38px] rounded-[9px] flex-none flex items-center justify-center"
        style={{ background: 'var(--bg-base)', border: '0.5px solid var(--gold-deep)' }}
      >
        <Seal size={26} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[14px] font-semibold text-[var(--ink-100)]">
          Fields &amp; Floors <span className="font-normal text-[12px] text-[var(--ink-400)]">now</span>
        </div>
        <div className="text-[13.5px] leading-snug text-[var(--ink-200)] mt-0.5">
          New match: Cooper Flagg Auto /25 · $280 · Buy It Now
        </div>
      </div>
    </div>
  );
}

function DoneArt({ lg }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3"><Seal size={lg ? 84 : 64} /></div>
      <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--ink-400)]">YOU&rsquo;RE SET</span>
    </div>
  );
}

/* ── Steps ────────────────────────────────────────────────────────────── */
// `app` overrides apply inside the iOS app. Keep app copy free of prices,
// Stripe, and any pointer to subscribing on the website.

const STEPS = [
  {
    label: 'Search',
    title: 'Start with a player.',
    // True: verifyPlayerName in app/api/search requires every word of the
    // name to appear in the listing title.
    text: 'Type any name. We only show listings where that player is actually in the title, so no keyword-stuffed junk.',
    Art: SearchArt,
  },
  {
    label: 'Filters',
    title: 'Stack what eBay won’t.',
    text: 'Autographed, rookie, numbered to 25 or lower, under $300, all at once. Print runs are sorted into tiers from Scarce up to The Grail.',
    Art: FilterArt,
  },
  {
    label: 'Watchlist',
    title: 'Star the ones you like.',
    text: 'Tap the star on any card to save it. Your watchlist keeps price and status fresh, so you know when a card has sold or is ending. It’s free with an account.',
    Art: WatchlistArt,
  },
  {
    label: 'Alerts',
    title: 'Let the cards come to you.',
    text: 'Save a search and we’ll email you when new matches list, plus bid reminders before auctions end. Alerts are part of the Base plan, which has a 14-day free trial.',
    Art: AlertArt,
    app: {
      title: 'Get a ping when it lists.',
      text: 'Save a search and we’ll send a notification to your phone (plus an email) when a new match lists, and remind you before auctions end. Alerts are part of Base, which has a 14-day free trial.',
      Art: PushArt,
      // /subscribe shows Apple's in-app purchase sheet in the app. Never
      // hard-code a price here — Apple shows it on the purchase sheet.
      trialHref: '/subscribe',
    },
  },
  {
    label: 'Buy',
    title: 'Checkout happens on eBay.',
    // "We never take a cut" is true only while there are no affiliate links.
    // If eBay Partner Network (or any affiliate) links are ever added, this
    // copy MUST change.
    text: 'Every listing is a real eBay listing. Open a card for details, then click through to buy there. We never take a cut.',
    Art: DoneArt,
    app: {
      text: 'Every listing is a real eBay listing. Open a card, then tap through to buy it on eBay. We never take a cut.',
    },
  },
];

function stepFor(index, native) {
  const base = STEPS[index];
  return native && base.app ? { ...base, ...base.app } : base;
}

const MOTION_CSS = `
  @media (prefers-reduced-motion: no-preference) {
    .ff-tour-backdrop { animation: ffTourFade .25s ease-out; }
    .ff-tour-panel { animation: ffTourRise .35s cubic-bezier(.2,.8,.2,1); }
    .ff-tour-caret { animation: ffTourBlink 1s steps(1) infinite; }
    .ff-tour-star { display: inline-block; animation: ffTourPop 1.6s ease-in-out infinite; }
  }
  @keyframes ffTourFade { from { opacity: 0 } }
  @keyframes ffTourRise { from { opacity: 0; transform: translateY(16px) } }
  @keyframes ffTourBlink { 50% { opacity: 0 } }
  @keyframes ffTourPop { 50% { transform: scale(1.25) } }
`;

/* ── Dialog ───────────────────────────────────────────────────────────── */

function TourDialog({ native, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const panelRef = useRef(null);
  const primaryRef = useRef(null);
  const swipeStart = useRef(null);
  const last = step === STEPS.length - 1;
  const { label, title, text, Art, trialHref } = stepFor(step, native);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  // Focus: move into the dialog, restore to wherever it was on close.
  useEffect(() => {
    const previous = document.activeElement;
    primaryRef.current?.focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => { primaryRef.current?.focus({ preventScroll: true }); }, [step]);

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') back();
    if (e.key !== 'Tab') return;
    // Focus trap
    const focusable = panelRef.current?.querySelectorAll('button:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const end = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
    else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
  }

  // Swipe between steps (app sheet). Horizontal only, so vertical drags
  // still scroll the copy on small phones.
  function onPointerDown(e) {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else back();
  }

  function startTrial() {
    onClose();
    router.push(trialHref);
  }

  const dots = (
    <div className={`flex ${native ? 'gap-[7px] justify-center' : 'gap-1.5'}`} aria-hidden="true">
      {STEPS.map((s, i) => (
        <span
          key={s.label}
          className="rounded-full transition-all"
          style={{
            height: native ? 7 : 6,
            width: i === step ? (native ? 22 : 18) : (native ? 7 : 6),
            background: i === step ? 'var(--gold)' : 'var(--line)',
          }}
        />
      ))}
    </div>
  );

  const primaryLabel = last ? 'Start searching' : 'Next';
  const primaryStyle = { background: 'var(--gold)', color: 'var(--ink-on-gold, #1a1612)' };

  const dialogProps = {
    ref: panelRef,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'ff-tour-title',
    'aria-describedby': 'ff-tour-text',
  };

  const backdropProps = {
    className: `ff-tour-backdrop fixed inset-0 z-[60] flex justify-center ${native ? 'items-end' : 'items-end sm:items-center sm:p-4'}`,
    style: { background: 'rgba(5,4,3,0.72)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' },
    onMouseDown: (e) => { if (!native && e.target === e.currentTarget) onClose(); },
    onKeyDown,
  };

  if (native) {
    return (
      <div {...backdropProps}>
        <style>{MOTION_CSS}</style>
        <div
          {...dialogProps}
          className="ff-tour-panel w-full flex flex-col overflow-y-auto select-none"
          style={{
            height: 'calc(100% - 20px)',
            background: 'var(--bg-elev-2)',
            borderTop: '0.5px solid var(--gold-deep)',
            borderRadius: '22px 22px 0 0',
            touchAction: 'pan-y',
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { swipeStart.current = null; }}
        >
          <div className="w-[38px] h-[5px] rounded-full mx-auto mt-2 flex-none" style={{ background: 'var(--line)' }} aria-hidden="true" />
          <div className="flex items-center justify-between pl-[22px] pr-3 h-[52px] flex-none">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">
              {step + 1} of {STEPS.length} · {label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[64px] min-h-[44px] text-[15px] font-medium text-[var(--ink-400)]"
              style={{ visibility: last ? 'hidden' : 'visible' }}
              disabled={last}
            >
              Skip
            </button>
          </div>

          <div
            className="flex-1 min-h-[200px] mx-4 rounded-2xl flex items-center justify-center px-[22px] py-4"
            style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line)' }}
            aria-hidden="true"
          >
            <Art lg />
          </div>

          <div className="px-6 pt-[22px] pb-2 flex-none">
            <h2 id="ff-tour-title" className="font-display italic text-[34px] leading-[1.05] tracking-[-0.01em] mb-3">
              {title}
            </h2>
            <p id="ff-tour-text" className="text-[16px] leading-[1.55] text-[var(--ink-200)] m-0" aria-live="polite">
              {text}
            </p>
          </div>

          <div className="py-3.5 flex-none">{dots}</div>

          <div className="px-4 pb-6 flex flex-col gap-2.5 flex-none">
            {trialHref && (
              <button
                type="button"
                onClick={startTrial}
                className="min-h-[48px] rounded-[14px] text-[16px] font-medium text-[var(--gold-bright)]"
                style={{ border: '0.5px solid var(--gold-deep)' }}
              >
                Start free trial
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={() => (last ? onClose() : next())}
              className="min-h-[52px] rounded-[14px] text-[17px] font-semibold"
              style={primaryStyle}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...backdropProps}>
      <style>{MOTION_CSS}</style>
      <div
        {...dialogProps}
        className="ff-tour-panel w-full sm:max-w-[440px] overflow-hidden rounded-t-[14px] sm:rounded-xl pb-[env(safe-area-inset-bottom)]"
        style={{
          background: 'var(--bg-elev-2)',
          border: '0.5px solid var(--gold-deep)',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div
          className="h-[170px] sm:h-[190px] flex items-center justify-center p-5"
          style={{ background: 'var(--bg-elev)', borderBottom: '0.5px solid var(--line)' }}
          aria-hidden="true"
        >
          <Art />
        </div>

        <div className="px-6 pt-5 pb-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--gold)] mb-2.5">
            Step {step + 1} of {STEPS.length} · {label}
          </div>
          <h2 id="ff-tour-title" className="font-display italic text-[30px] leading-[1.05] tracking-[-0.01em] mb-2.5">
            {title}
          </h2>
          <p id="ff-tour-text" className="text-[13.5px] leading-relaxed text-[var(--ink-200)] m-0" aria-live="polite">
            {text}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-5">
          {dots}
          <div className="flex items-center gap-2">
            {!last && (
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-400)] hover:text-[var(--gold)] px-2 py-2 transition-colors"
              >
                Skip
              </button>
            )}
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-md px-3.5 py-2 text-[12.5px] font-medium text-[var(--ink-200)] hover:text-[var(--gold)] transition-colors"
                style={{ border: '0.5px solid var(--line)' }}
              >
                Back
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={() => (last ? onClose() : next())}
              className="rounded-md px-4 py-2 text-[12.5px] font-semibold transition-colors hover:brightness-110"
              style={primaryStyle}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteTourInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState(false);
  // Decided once, from the URL the visitor landed on. Later client-side
  // navigation back to "/" doesn't make them eligible.
  const autoEligible = useRef(null);
  const requested = pathname === '/' && searchParams.get('tour') === '1';

  useEffect(() => { setNative(isNativeApp()); }, []);

  // Auto-show: plain landing on "/" only, once per browser / app install.
  useEffect(() => {
    if (autoEligible.current === null) {
      autoEligible.current = window.location.pathname === '/'
        && !window.location.search
        && !hasSeenTour();
    }
    if (!autoEligible.current) return;
    return afterIntro(() => {
      autoEligible.current = false;
      markTourSeen();
      setOpen(true);
    });
  }, []);

  // Replay via /?tour=1.
  useEffect(() => {
    if (!requested) return;
    return afterIntro(() => setOpen(true));
  }, [requested]);

  const close = useCallback(() => {
    setOpen(false);
    markTourSeen();
    // Drop ?tour=1 so a refresh doesn't reopen it. Done on close, not on
    // open: changing the URL re-runs the replay effect and would cancel the
    // pending open.
    if (new URLSearchParams(window.location.search).has('tour')) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  return open ? <TourDialog native={native} onClose={close} /> : null;
}

export default function SiteTour() {
  // useSearchParams needs a Suspense boundary when used from the root layout.
  return (
    <Suspense fallback={null}>
      <SiteTourInner />
    </Suspense>
  );
}

/* Replay link for the footer and How it works. Web only: in the iOS app the
 * replay lives in the account menu. Decided after mount so server and client
 * markup match. */
export function TourLink({ className, style, children = 'Site tour' }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!isNativeApp()); }, []);
  if (!show) return null;
  return (
    <Link href="/?tour=1" className={className} style={style}>
      {children}
    </Link>
  );
}
