'use client';

// app/components/CardModal.js
//
// Card detail modal triggered by tapping a search result. The card
// "lifts" forward, background dims and blurs, shimmer sweeps across
// the card, and a tap (mobile) or mouse-move (desktop) tilts the card
// toward the cursor position.
//
// Layout: Variant A — card on left, meta panel on right, tree opens
// inline below the CTAs when "Rarity tree ▾" is tapped.
//
// Props:
//   item          - the search-result item object, or null (closed)
//                   { id, title, price, image, url, condition, isAuction,
//                     endTime, bidCount, seller }
//   printRun      - integer serial-number print run detected in the
//                   title by the parent (page.js), or null
//   onClose       - parent callback to clear selection + URL param
//   expired       - boolean: if true, render the "listing expired" state
//                   instead of normal modal content (used when ?card=<id>
//                   loads but the listing is no longer in results)

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowUpRight, X, Star } from 'lucide-react';
import RarityTree from './RarityTree';
import CardImageCarousel from './CardImageCarousel';
import { parseSetFromTitle } from '../../lib/parseSetFromTitle';
import { getSet, getParallel } from '../../lib/parallelData';
import { gradientCss } from './rarityUtils';
import { useWatchlist } from '../../lib/watchlistContext';
import { useUser } from '../../lib/useUser';

// Upscale an eBay thumbnail URL to a higher-resolution variant so the
// magnifier reveals real detail. eBay encodes the size as `s-l\d+`
// in the filename; swap it. Safe no-op for non-eBay URLs.
function upscalePrimary(url) {
  if (!url) return url;
  return url.replace(/\/s-l\d+\.(\w+)/, '/s-l1600.$1');
}

export default function CardModal({ item, printRun, onClose, expired = false }) {
  const cardRef = useRef(null);       // inner card — handles tilt (rotateX/Y)
  const flipRef = useRef(null);       // wrapper — handles flight (translate/scale)
  const overlayRef = useRef(null);
  const flightAnim = useRef(null);    // active Web Animation instance, if any
  const [treeOpen, setTreeOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  // The mobile tap-to-tilt mechanic needs to know whether the device
  // is touch-primary. matchMedia('(hover: none)').matches is reliable
  // enough and avoids assumptions about screen width.
  const [isTouchPrimary, setIsTouchPrimary] = useState(false);

  // ─ Fetched images for the carousel ───────────────────────────────
  // Starts as the single primary image from the search result, then
  // gets replaced by the full image array once /api/listing/<id>
  // returns. If the fetch fails or the listing is expired, we fall
  // back to the primary only.
  const [carouselImages, setCarouselImages] = useState(
    item?.image ? [upscalePrimary(item.image)] : []
  );
  // Active image index. Hoisted here so the dots indicator (rendered
  // outside the flying flipRef wrapper) and the in-frame carousel
  // share a single source of truth.
  const [carouselIndex, setCarouselIndex] = useState(0);
  // Tilt is suppressed while the user is actively swiping the carousel
  // or holding the magnifier lens. Using a ref (not state) so tilt
  // handlers can check the latest value without re-subscribing.
  const tiltSuppressed = useRef(false);

  // Reset the active image whenever a different listing is opened
  useEffect(() => { setCarouselIndex(0); }, [item?.id]);

  // ─ Watchlist integration ─────────────────────────────────────────
  // Read saved state from the same WatchlistContext that powers the grid
  // star, so the modal button and grid star stay in sync. If we're
  // somehow rendered outside the provider (shouldn't happen, but
  // defensive), useWatchlist() returns null and we hide the button.
  const watchlist = useWatchlist();
  const { user } = useUser();
  const [watchBusy, setWatchBusy] = useState(false);
  const isWatched = watchlist && item ? watchlist.isSaved(item.id) : false;

  async function toggleWatch(e) {
    e?.stopPropagation();
    if (!item || watchBusy || !watchlist) return;
    // Logged-out users get sent to login (same behavior as WatchStar)
    if (!user) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    setWatchBusy(true);
    const wasSaved = watchlist.isSaved(item.id);
    // Optimistic update so the button changes instantly
    if (wasSaved) watchlist.markUnsaved(item.id);
    else watchlist.markSaved(item.id);
    try {
      if (wasSaved) {
        await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      } else {
        // Mirror WatchStar's payload shape exactly so the row created
        // by the modal looks the same as one created from the grid star.
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: item.id,
            title: item.title,
            price: item.price,
            currency: item.currency || 'USD',
            image_url: item.image,
            listing_url: item.url,
            is_auction: !!item.isAuction,
            end_time: item.endTime || null,
          }),
        });
      }
    } catch {
      // Revert on failure
      if (wasSaved) watchlist.markSaved(item.id);
      else watchlist.markUnsaved(item.id);
    } finally {
      setWatchBusy(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsTouchPrimary(window.matchMedia('(hover: none)').matches);
  }, []);

  // ─ FLIP animation helpers ────────────────────────────────────────
  // Look up the grid card that opened the modal so we can fly to/from
  // its exact position. The grid card is tagged with data-listing-id;
  // we re-query on close so scroll-since-open doesn't matter.
  const findOriginRect = useCallback(() => {
    if (!item?.id || typeof document === 'undefined') return null;
    const el = document.querySelector(`[data-listing-id="${CSS.escape(String(item.id))}"]`);
    if (!el) return null;
    return el.getBoundingClientRect();
  }, [item]);

  // Run a flight animation on the flip wrapper between the modal card's
  // current rect and the grid card's rect. Direction 'in' means we're
  // opening (grid → center); 'out' means closing (center → grid).
  // Resolves when the animation finishes.
  const runFlight = useCallback((direction) => {
    return new Promise((resolve) => {
      const flip = flipRef.current;
      const origin = findOriginRect();
      if (!flip || !origin || origin.width === 0) {
        // Origin no longer in DOM (user scrolled it offscreen, ran a new
        // search, or arrived via ?card URL with no matching card). Fall
        // back to a simple scale/fade so the close still feels intentional.
        const fallback = flip?.animate(
          direction === 'in'
            ? [{ transform: 'scale(0.85)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]
            : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.92)', opacity: 0 }],
          { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' }
        );
        if (fallback) fallback.onfinish = () => resolve(); else resolve();
        return;
      }

      // Measure the modal card's current centered position, then compute
      // the transform delta needed to land it on the origin rect.
      const finalRect = flip.getBoundingClientRect();
      const tx = (origin.left + origin.width  / 2) - (finalRect.left + finalRect.width  / 2);
      const ty = (origin.top  + origin.height / 2) - (finalRect.top  + finalRect.height / 2);
      // Use the smaller axis for uniform scale to avoid stretching
      const s  = Math.min(origin.width / finalRect.width, origin.height / finalRect.height);

      // Cancel any running flight before starting a new one (defensive
      // against React strict-mode double-mount in dev)
      if (flightAnim.current) flightAnim.current.cancel();

      const frames = direction === 'in'
        ? [
            { transform: `translate(${tx}px, ${ty}px) scale(${s})`, opacity: 0 },
            { transform: 'translate(0, 0) scale(1)',                opacity: 1 },
          ]
        : [
            { transform: 'translate(0, 0) scale(1)',                opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(${s})`, opacity: 0 },
          ];

      // Defensive: Web Animations API is supported everywhere modern but
      // we should not crash if it isn't (e.g. very old browsers).
      if (typeof flip.animate !== 'function') { resolve(); return; }
      const anim = flip.animate(frames, {
        duration: direction === 'in' ? 420 : 460,
        easing:   direction === 'in' ? 'cubic-bezier(0.2, 0.85, 0.3, 1)' : 'cubic-bezier(0.4, 0, 0.4, 1)',
        fill: 'forwards',
      });
      flightAnim.current = anim;
      anim.onfinish = () => { flightAnim.current = null; resolve(); };
      anim.oncancel = () => { flightAnim.current = null; resolve(); };
    });
  }, [findOriginRect]);

  // ─ Fly the card IN on mount (and re-fly if item changes) ─────────
  useEffect(() => {
    if (!item || expired) return;
    // Wait one paint so the modal DOM is laid out before we measure
    requestAnimationFrame(() => { runFlight('in'); });
    // No cleanup — the close handler runs the flight-out explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // ─ Fetch additional images on open ───────────────────────────────
  // The search endpoint only returns the primary thumbnail, so we hit
  // /api/listing/<id> for the full image array. Starts with the primary
  // already populated, then upgrades to the full array on success.
  // If the listing has expired (404) or the fetch fails, we silently
  // keep the primary-only carousel.
  useEffect(() => {
    if (!item?.id || expired) return;
    // Reset to the primary image while the fetch is in flight, so the
    // carousel is never stale when the user opens a different card.
    setCarouselImages(item.image ? [upscalePrimary(item.image)] : []);

    const ctrl = new AbortController();
    fetch(`/api/listing/${encodeURIComponent(item.id)}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data || data.ok === false) return;
        if (Array.isArray(data.images) && data.images.length > 0) {
          setCarouselImages(data.images);
        }
      })
      .catch(() => {
        // Swallow — primary image is already showing, no need to surface
      });
    return () => ctrl.abort();
  }, [item?.id, item?.image, expired]);


  // ─ Identify the set + parallel from the listing title ─────────────
  // Done once per item open. parseSetFromTitle returns null when the
  // set isn't in our database, which RarityTree handles gracefully.
  const detection = item && !expired ? parseSetFromTitle(item.title || '') : null;
  const setData = detection ? getSet(detection.setKey) : null;
  const parallel = detection ? getParallel(detection.setKey, detection.parallelKey) : null;
  // Border color for the card frame. Prefer the matched parallel's color;
  // fall back to a warm gold so unknown-set cards still get the treatment.
  const borderColor = parallel?.color || '#c9954a';
  const borderGradient = parallel ? gradientCss(parallel.gradient) : null;

  // ─ Tilt handling — desktop mouse + mobile tap-anywhere ────────────
  // We mutate the card's transform directly (not via state) to keep
  // the response cheap; 60fps mousemove through React state would stutter.
  const applyTilt = useCallback((clientX, clientY) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Normalize the offset by half the viewport so extreme screen corners
    // give the maximum tilt. Clamp to ±1 so a tap far off-screen doesn't
    // try to rotate past sensible bounds.
    const dx = (clientX - cx) / (window.innerWidth  / 2);
    const dy = (clientY - cy) / (window.innerHeight / 2);
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const maxRot = isTouchPrimary ? 20 : 12;
    const ry =  clamp(dx) * maxRot;
    const rx = -clamp(dy) * maxRot;
    card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }, [isTouchPrimary]);

  const resetTilt = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }, []);

  // ─ Wire up tilt listeners while modal is open ────────────────────
  // Desktop: mousemove inside the overlay only — outside-modal mouse
  // shouldn't influence the card.
  // Mobile:  touchstart anywhere on the document, but skip when the
  // user is mid-swipe/long-press inside the carousel (tiltSuppressed
  // is set by the carousel via its callbacks). Also skip if the
  // touch originated on a control or inside the carousel frame
  // itself — those have their own gestures.
  useEffect(() => {
    if (!item || closing) return;

    if (isTouchPrimary) {
      const handler = (e) => {
        const t = e.touches?.[0] || e;
        if (!t) return;
        if (tiltSuppressed.current) return;
        if (e.target && e.target.closest?.('button, a, [data-no-tilt]')) return;
        applyTilt(t.clientX, t.clientY);
      };
      // touchstart only — not touchmove. A swipe is a sequence of moves
      // and re-tilting on each one would feel chaotic.
      document.addEventListener('touchstart', handler, { passive: true });
      return () => document.removeEventListener('touchstart', handler);
    } else {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const handler = (e) => {
        // Skip tilt when the cursor is over interactive UI (buttons,
        // links, the rarity tree) — those have their own behavior.
        if (e.target && e.target.closest?.('button, a, [data-no-tilt]')) {
          return;
        }
        // Skip tilt when hovering directly on the card frame — the
        // card surface belongs to the magnifier. Tilt fires when the
        // mouse is anywhere ELSE in the modal (meta panel, dark gutter,
        // tree, etc.), so users still drive the tilt from the
        // surrounding area.
        if (e.target && e.target.closest?.('[data-card-frame]')) {
          return;
        }
        // Also skip while the magnifier lens is active (extra safety
        // for fast cursor movement across the card edge).
        if (tiltSuppressed.current) return;
        applyTilt(e.clientX, e.clientY);
      };
      overlay.addEventListener('mousemove', handler);
      overlay.addEventListener('mouseleave', resetTilt);
      return () => {
        overlay.removeEventListener('mousemove', handler);
        overlay.removeEventListener('mouseleave', resetTilt);
      };
    }
  }, [item, closing, isTouchPrimary, applyTilt, resetTilt]);

  // ─ Close handling — fly card back to grid, then close ────────────
  // The close sequence is: reset tilt → fly back to origin rect →
  // unmount. Overlay opacity fades in parallel with the flight so the
  // whole transition feels like one coordinated motion (~480ms total).
  const handleClose = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    resetTilt();
    // Wait a frame so the tilt reset transition starts visibly before
    // the flight begins; otherwise on desktop the flat-tilt frame
    // would never paint.
    await new Promise((r) => requestAnimationFrame(r));
    await runFlight('out');
    setClosing(false);
    setTreeOpen(false);
    onClose?.();
  }, [closing, resetTilt, runFlight, onClose]);

  // ─ Keyboard + scroll lock ────────────────────────────────────────
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while open. Saves the previous overflow style
    // so we don't clobber anything the page was doing.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, handleClose]);

  if (!item) return null;

  // ── EXPIRED STATE — shown when ?card=<id> loads with no matching item.
  if (expired) {
    return (
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${closing ? 'animate-out' : 'animate-in'}`}
        style={overlayStyle}
        onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
      >
        <div
          className="relative max-w-md w-full rounded-lg p-8 text-center"
          style={{
            background: 'rgba(14,11,7,0.96)',
            border: '0.5px solid rgba(212,175,92,0.35)',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.85)',
          }}
        >
          <button onClick={handleClose} data-no-tilt
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(20,17,12,0.7)', border: '0.5px solid rgba(232,226,213,0.18)', color: 'var(--ink-200)' }}>
            <X size={14} />
          </button>
          <p className="text-[9px] uppercase tracking-[0.26em] mb-3" style={{ color: 'var(--gold)' }}>
            Listing unavailable
          </p>
          <p className="font-serif italic text-[22px] mb-2" style={{ color: 'var(--ink-100)' }}>
            This listing has ended.
          </p>
          <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--ink-300)' }}>
            The card you&apos;re trying to view is no longer available on eBay —
            it may have sold, been removed by the seller, or expired.
          </p>
          <button onClick={handleClose} data-no-tilt
                  className="text-[10px] uppercase tracking-[0.18em] font-semibold px-5 py-2.5 rounded"
                  style={{ background: 'linear-gradient(180deg,#ffd97a,#d99c14)', color: '#1a1612' }}>
            ← Back to search
          </button>
        </div>
      </div>
    );
  }

  // ── NORMAL STATE ───────────────────────────────────────────────────
  const formattedPrice = item.price != null
    ? `$${Number(item.price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
    : '—';

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[100] overflow-y-auto px-4 py-6 ${closing ? 'animate-out' : 'animate-in'}`}
      style={overlayStyle}
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      <div className="min-h-full flex items-start lg:items-center justify-center">
        <div
          className="relative w-full max-w-5xl rounded-lg p-6 lg:p-10"
          style={{
            background: 'rgba(14,11,7,0.96)',
            border: '0.5px solid rgba(232,226,213,0.08)',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.85), 0 16px 32px -8px rgba(0,0,0,0.6)',
          }}
        >
          {/* Close button */}
          <button onClick={handleClose} data-no-tilt
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ background: 'rgba(20,17,12,0.7)', border: '0.5px solid rgba(232,226,213,0.18)', color: 'var(--ink-200)' }}
                  aria-label="Close">
            <X size={14} />
          </button>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-14">
            {/* ─── Card column ─── */}
            {/* Two nested wrappers by design:
                • The OUTER (flipRef) carries the FLIP flight transform
                  (translate + scale, animated via Web Animations API).
                • The INNER (cardRef) carries the live tilt (rotateX/Y),
                  mutated directly on mousemove/touchstart.
                Keeping them on separate elements means the two transforms
                compose cleanly and don't fight each other. */}
            <div className="flex-none mx-auto lg:mx-0 relative" style={{ perspective: 1200 }}>
              {/* Prev/next arrows — adjacent to the card, in the dark
                  gutter between the card column and the meta column.
                  Hidden when there's only one image. Desktop only;
                  mobile uses swipe + dots. The wider gap (lg:gap-14
                  on the row above) gives them clearance not to touch
                  the meta panel. */}
              {carouselImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselIndex((carouselIndex - 1 + carouselImages.length) % carouselImages.length);
                    }}
                    data-no-tilt
                    aria-label="Previous image"
                    className="hidden lg:flex absolute z-20 items-center justify-center transition-colors"
                    style={{
                      left: -44, top: '50%', transform: 'translateY(-50%)',
                      width: 32, height: 64,
                      background: 'transparent',
                      color: 'var(--ink-300)',
                      border: 'none',
                      fontSize: 28, lineHeight: 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold-bright)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-300)'; }}
                  >‹</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselIndex((carouselIndex + 1) % carouselImages.length);
                    }}
                    data-no-tilt
                    aria-label="Next image"
                    className="hidden lg:flex absolute z-20 items-center justify-center transition-colors"
                    style={{
                      right: -44, top: '50%', transform: 'translateY(-50%)',
                      width: 32, height: 64,
                      background: 'transparent',
                      color: 'var(--ink-300)',
                      border: 'none',
                      fontSize: 28, lineHeight: 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold-bright)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-300)'; }}
                  >›</button>
                </>
              )}

              <div
                ref={flipRef}
                className="aspect-[3/4] w-[280px] lg:w-[400px]"
                style={{ willChange: 'transform, opacity', opacity: 0 /* start invisible — fly-in sets to 1 */ }}
              >
                <div
                  ref={cardRef}
                  className="ff-card-lift relative w-full h-full rounded-lg overflow-hidden"
                  style={{
                    border: `2px solid ${borderColor}`,
                    boxShadow: `0 0 0 1px rgba(0,0,0,0.4) inset, 0 0 30px -8px ${borderColor}, 0 30px 60px -20px rgba(0,0,0,0.7)`,
                    background: '#0e0a06',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                    transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.3, 1)',
                  }}
                >
                  <CardImageCarousel
                    images={carouselImages}
                    index={carouselIndex}
                    onIndexChange={setCarouselIndex}
                    borderColor={borderColor}
                    onSwipeStart={() => { tiltSuppressed.current = true; }}
                    onLensActive={(active) => { tiltSuppressed.current = active; }}
                  />
                  {/* Shimmer sweep — uses the existing ff-sheen keyframes */}
                  <div className="ff-card-shimmer pointer-events-none absolute inset-0" />
                  {borderGradient && (
                    <div className="absolute inset-0 pointer-events-none"
                         style={{
                           background: `linear-gradient(135deg, transparent 40%, ${borderColor}22 60%, transparent 80%)`,
                           mixBlendMode: 'overlay',
                         }} />
                  )}
                </div>
              </div>
              {/* Dots indicator — sits below the flying flipRef wrapper so
                  it doesn't accompany the card on close (the grid card
                  has no dots). Hidden until additional images load. */}
              {carouselImages.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3" data-no-tilt>
                  {carouselImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }}
                      aria-label={`Image ${i + 1}`}
                      className="rounded-full transition-all"
                      style={{
                        width:  i === carouselIndex ? 16 : 6,
                        height: 6,
                        background: i === carouselIndex ? borderColor : 'rgba(232,226,213,0.2)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ─── Meta + CTAs + tree column ─── */}
            <div className="flex-1 min-w-0">
              {detection && parallel && (
                <p className="text-[9px] uppercase tracking-[0.26em] mb-1.5"
                   style={{ color: 'var(--gold)' }}>
                  {setData.label} · {parallel.name}
                </p>
              )}
              {!detection && (
                <p className="text-[9px] uppercase tracking-[0.26em] mb-1.5"
                   style={{ color: 'var(--gold)' }}>
                  eBay listing
                </p>
              )}

              <h2 className="font-serif italic text-[20px] lg:text-[24px] leading-tight mb-3 pr-8"
                  style={{ color: 'var(--ink-100)' }}>
                {item.title}
              </h2>

              {/* Badges */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {printRun && (
                  <span className="text-[9px] uppercase tracking-[0.16em] font-bold px-2 py-1 rounded"
                        style={{ background: 'linear-gradient(180deg,#ffd97a,#d99c14)', color: '#1a1612' }}>
                    /{printRun}
                  </span>
                )}
                {item.isAuction && (
                  <span className="text-[9px] uppercase tracking-[0.16em] font-medium px-2 py-1 rounded"
                        style={{ background: 'rgba(201,122,58,0.10)', color: '#e6a86b', border: '0.5px solid rgba(201,122,58,0.4)' }}>
                    Live auction
                  </span>
                )}
                {item.condition && item.condition !== 'Unknown' && (
                  <span className="text-[9px] uppercase tracking-[0.16em] px-2 py-1 rounded"
                        style={{ background: 'rgba(232,226,213,0.04)', color: 'var(--ink-200)', border: '0.5px solid rgba(232,226,213,0.16)' }}>
                    {item.condition}
                  </span>
                )}
              </div>

              {/* Price block */}
              <p className="font-serif italic text-[28px] lg:text-[32px] leading-none mb-1"
                 style={{ color: 'var(--gold-bright)' }}>
                {formattedPrice}
              </p>
              {item.isAuction ? (
                <p className="text-[11px] tracking-[0.06em] mb-4" style={{ color: 'var(--ink-300)' }}>
                  {item.bidCount != null ? `${item.bidCount} BID${item.bidCount === 1 ? '' : 'S'}` : 'CURRENT BID'}
                  {item.endTime ? ' · ENDS SOON' : ''}
                </p>
              ) : (
                <p className="text-[11px] tracking-[0.06em] mb-4" style={{ color: 'var(--ink-300)' }}>
                  BUY IT NOW
                </p>
              )}

              {/* CTA row */}
              <div className="flex gap-2 mb-4">
                <a href={item.url} target="_blank" rel="noopener noreferrer" data-no-tilt
                   className="flex-1 inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold rounded px-4 py-2.5"
                   style={{ background: 'linear-gradient(180deg,#ffd97a,#d99c14)', color: '#1a1612' }}>
                  View on eBay
                  <ArrowUpRight size={12} strokeWidth={2} />
                </a>
                {/* Watch button — reads from WatchlistContext to show
                    saved state (filled gold star + "Watching" when saved,
                    outline + "Watch" when not). Stays in sync with the
                    grid star because they share the same context. */}
                <button onClick={toggleWatch} data-no-tilt disabled={watchBusy}
                        aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                        aria-pressed={isWatched}
                        className="flex-none inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium rounded px-4 py-2.5 transition-colors"
                        style={{
                          background: isWatched ? 'rgba(212,175,92,0.10)' : 'transparent',
                          color: isWatched ? 'var(--gold-bright)' : 'var(--ink-100)',
                          border: `0.5px solid ${isWatched ? 'rgba(212,175,92,0.5)' : 'rgba(232,226,213,0.18)'}`,
                          opacity: watchBusy ? 0.6 : 1,
                          cursor: watchBusy ? 'wait' : 'pointer',
                        }}>
                  <Star size={12} strokeWidth={2}
                        fill={isWatched ? 'currentColor' : 'transparent'} />
                  {isWatched ? 'Watching' : 'Watch'}
                </button>
              </div>

              {/* Rarity tree toggle */}
              <button onClick={() => setTreeOpen((v) => !v)} data-no-tilt
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] rounded px-3.5 py-2"
                      style={{ background: 'transparent', color: 'var(--gold-bright)', border: '0.5px solid rgba(212,175,92,0.35)' }}>
                Rarity tree <span style={{ fontSize: 9, opacity: 0.7 }}>{treeOpen ? '▴' : '▾'}</span>
              </button>

              {treeOpen && (
                <div className="mt-4 ff-tree-reveal" data-no-tilt>
                  <RarityTree
                    setData={setData}
                    parallelKey={detection?.parallelKey || null}
                    printRun={printRun}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Inline styles for the modal-specific animations.
            The shimmer reuses the same easing as the grid sheen so the
            two animations feel like the same brand element.
            ff-tree-reveal slides in slightly on expand.
            animate-in / animate-out fade + scale the overlay. */}
      <style jsx>{`
        @keyframes ffOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ffOverlayOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .animate-in {
          animation: ffOverlayIn 0.28s cubic-bezier(0.2, 0.8, 0.3, 1);
        }
        .animate-out {
          animation: ffOverlayOut 0.46s cubic-bezier(0.4, 0, 0.4, 1) forwards;
        }
        @keyframes ffCardShimmer {
          0%   { transform: translateX(-120%) skewX(-22deg); opacity: 0; }
          18%  { opacity: 0.45; }
          50%  { opacity: 0.45; }
          100% { transform: translateX(250%) skewX(-22deg); opacity: 0; }
        }
        :global(.ff-card-shimmer) {
          background: linear-gradient(110deg, transparent 30%, rgba(255,232,180,0.5) 50%, transparent 70%);
          animation: ffCardShimmer 3.2s cubic-bezier(0.4, 0, 0.4, 1) infinite;
          z-index: 5;
        }
        @keyframes ffTreeReveal {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        :global(.ff-tree-reveal) {
          animation: ffTreeReveal 0.26s cubic-bezier(0.2, 0.8, 0.3, 1);
        }
      `}</style>
    </div>
  );
}

const overlayStyle = {
  background: 'rgba(0,0,0,0.78)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
