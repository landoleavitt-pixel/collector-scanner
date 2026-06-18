'use client';

// app/components/CardImageCarousel.js
//
// Swipeable image area inside the card frame, with a follow-the-
// cursor magnifying lens. Used inside CardModal. CONTROLLED — the
// parent owns the active index so the parent can also render the
// dots indicator outside the card frame (so the dots don't fly back
// to the grid alongside the card on close).
//
// Behaviors:
//   • Multiple images → swipe left/right (mobile) or arrow buttons
//     (desktop) to change image
//   • Single image  → renders flat, no swipe/arrows
//   • Desktop: hover over the card → circular lens follows the cursor,
//     showing a zoomed-in crop of the image at that point
//   • Mobile: long-press inside the card frame (~250ms) → lens engages,
//     drag your finger to move it; release to dismiss
//
// Props:
//   images          - array of image URLs (full eBay resolution preferred)
//   index           - controlled index of the currently visible image
//   onIndexChange   - parent callback to update index
//   borderColor     - hex used for the lens border tint
//   onSwipeStart    - optional, fires when a horizontal swipe begins
//   onLensActive    - optional, fires (true/false) when lens engages

import { useEffect, useRef, useState, useCallback } from 'react';

const MAGNIFIER_DIAM = 180;
const MAGNIFIER_ZOOM = 2.5;
const LONGPRESS_MS   = 250;
const SWIPE_THRESHOLD = 40;

export default function CardImageCarousel({
  images,
  index,
  onIndexChange,
  borderColor,
  onSwipeStart,
  onLensActive,
}) {
  const safeImages = Array.isArray(images) && images.length > 0 ? images : [null];
  const safeIndex = Math.max(0, Math.min(index || 0, safeImages.length - 1));
  const activeImg = safeImages[safeIndex];
  const hasMultiple = safeImages.length > 1;

  const [lensActive, setLensActive] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const longPressTimer = useRef(null);
  const touchStart = useRef(null);
  const isSwiping = useRef(false);

  useEffect(() => { onLensActive?.(lensActive); }, [lensActive, onLensActive]);

  const goPrev = useCallback(() => {
    onIndexChange?.((safeIndex - 1 + safeImages.length) % safeImages.length);
  }, [onIndexChange, safeIndex, safeImages.length]);
  const goNext = useCallback(() => {
    onIndexChange?.((safeIndex + 1) % safeImages.length);
  }, [onIndexChange, safeIndex, safeImages.length]);

  // ─ Desktop: cursor → lens ────────────────────────────────────────
  const handleMouseEnter = () => { if (activeImg) setLensActive(true); };
  const handleMouseMove = (e) => {
    if (!frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    setLensPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const handleMouseLeave = () => { setLensActive(false); };

  // ─ Mobile: long-press to engage, drag to pan, release to dismiss ─
  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t || !frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    isSwiping.current = false;
    longPressTimer.current = setTimeout(() => {
      setLensActive(true);
      setLensPos({ x: t.clientX - r.left, y: t.clientY - r.top });
    }, LONGPRESS_MS);
  };
  const handleTouchMove = (e) => {
    const t = e.touches?.[0];
    if (!t || !touchStart.current) return;
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (!lensActive && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      isSwiping.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      onSwipeStart?.();
      if (e.cancelable) e.preventDefault();
    }
    if (lensActive && frameRef.current) {
      const r = frameRef.current.getBoundingClientRect();
      setLensPos({ x: t.clientX - r.left, y: t.clientY - r.top });
      if (e.cancelable) e.preventDefault();
    }
  };
  const handleTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isSwiping.current && touchStart.current) {
      const t = e.changedTouches?.[0];
      if (t) {
        const dx = t.clientX - touchStart.current.x;
        if (Math.abs(dx) > SWIPE_THRESHOLD && hasMultiple) {
          if (dx < 0) goNext(); else goPrev();
        }
      }
    }
    isSwiping.current = false;
    touchStart.current = null;
    setLensActive(false);
  };

  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  // Compute lens background position so the point under the cursor
  // ends up centered in the lens at MAGNIFIER_ZOOM scale.
  let lensStyle = null;
  if (lensActive && activeImg && frameRef.current) {
    const r = frameRef.current.getBoundingClientRect();
    const bgW = r.width  * MAGNIFIER_ZOOM;
    const bgH = r.height * MAGNIFIER_ZOOM;
    const bgX = -lensPos.x * MAGNIFIER_ZOOM + MAGNIFIER_DIAM / 2;
    const bgY = -lensPos.y * MAGNIFIER_ZOOM + MAGNIFIER_DIAM / 2;
    lensStyle = {
      position: 'absolute',
      pointerEvents: 'none',
      width:  MAGNIFIER_DIAM,
      height: MAGNIFIER_DIAM,
      left: lensPos.x - MAGNIFIER_DIAM / 2,
      top:  lensPos.y - MAGNIFIER_DIAM / 2,
      borderRadius: '50%',
      border: `2px solid ${borderColor || '#c9954a'}`,
      boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 8px 24px -4px rgba(0,0,0,0.6), 0 0 12px -2px ${borderColor || '#c9954a'}`,
      backgroundImage: `url(${activeImg})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${bgW}px ${bgH}px`,
      backgroundPosition: `${bgX}px ${bgY}px`,
      WebkitMaskImage: 'radial-gradient(circle, #000 99%, transparent 100%)',
      maskImage: 'radial-gradient(circle, #000 99%, transparent 100%)',
      zIndex: 10,
    };
  }

  return (
    <div
      ref={frameRef}
      data-card-frame
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        cursor: lensActive ? 'none' : (activeImg ? 'crosshair' : 'default'),
        touchAction: hasMultiple || lensActive ? 'none' : 'auto',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-no-tilt
    >
      {activeImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeImg}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-serif italic text-5xl"
             style={{ color: 'var(--ink-600)' }}>◇</div>
      )}

      {lensStyle && <div style={lensStyle} aria-hidden="true" />}

      {hasMultiple && (
        <div className="absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase px-2 py-0.5 rounded"
             style={{ background: 'rgba(10,9,7,0.65)', backdropFilter: 'blur(4px)', color: 'var(--gold)', border: '0.5px solid rgba(201,149,74,0.3)' }}>
          {safeIndex + 1} / {safeImages.length}
        </div>
      )}
    </div>
  );
}
