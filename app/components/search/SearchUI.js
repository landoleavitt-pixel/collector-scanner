'use client';

// Search and results building blocks shared by Fields & Floors (app/page.js)
// and Foils & Fables (app/fables): filter sidebar and phone drawer, sort,
// the "Search with new filters?" prompt, price range, loading and empty
// states. Colours come from the side's tokens (globals.css), so each side
// keeps its own look with the same behaviour.

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowUp, Check, X } from 'lucide-react';

// Price filter value meaning "no maximum".
export const PRICE_NO_MAX = 100000;

export const SPORTS_SORT_OPTIONS = [
  ['printrun-rarest', 'Rarest first'],
  ['printrun-common', 'Most common first'],
  ['price-low', 'Price: low to high'],
  ['price-high', 'Price: high to low'],
  ['ending-soon', 'Ending soonest'],
  ['newest', 'Newest first'],
];

/* Section label — small uppercase eyebrow above each filter section */
export function SectionLabel({ children, className = '' }) {
  return (
    <h3 className={`text-fine text-[var(--ink-400)] mb-4 font-medium ${className}`}>
      {children}
    </h3>
  );
}

export function SectionDivider() {
  return <div className="h-px bg-[var(--line-soft)]" />;
}

/* PriceRangeSlider — quick "Under $X" picks plus typeable min and max boxes.
   A quick pick only fills in the max; the min stays whatever the user typed.
   PRICE_NO_MAX means no maximum. Typed amounts can be anything (no $5,000
   cap), and min/max swap if entered backwards. */
const PRICE_QUICK_PICKS = [50, 100, 250, 500, 1000];

function PriceBox({ label, value, placeholder, onCommit }) {
  const shown = value == null ? '' : String(value);
  const [draft, setDraft] = useState(shown);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(shown); }, [shown, editing]);
  // Read the box's own value, not state, so a fast type-then-leave can't
  // commit a stale draft.
  function commit(raw) {
    setEditing(false);
    const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
    onCommit(Number.isFinite(n) ? n : null);
  }
  return (
    <label className="flex-1 min-w-0 flex items-center gap-1.5 h-12 px-3 rounded-lg focus-within:border-[var(--gold-bright)]"
           style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <span className="text-lede" style={{ color: 'var(--ink-400)' }}>$</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={editing ? draft : (value == null ? '' : Number(value).toLocaleString('en-US'))}
        placeholder={placeholder}
        onFocus={(e) => { setEditing(true); setDraft(shown); requestAnimationFrame(() => e.target.select()); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
        aria-label={label}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-lede"
        style={{ color: 'var(--ink-100)' }}
      />
    </label>
  );
}

export function priceRangeLabel(min, max) {
  const fmt = (n) => `$${Number(n).toLocaleString('en-US')}`;
  const noMax = max == null || max >= PRICE_NO_MAX;
  if (!min && noMax) return 'Any price';
  if (!min) return `Under ${fmt(max)}`;
  if (noMax) return `${fmt(min)} and up`;
  return `${fmt(min)} to ${fmt(max)}`;
}

export function PriceRangeSlider({ min, max, onChange }) {
  const lo = min || 0;
  const hi = max ?? PRICE_NO_MAX;

  // Keep min ≤ max whichever way the user enters them.
  const set = (a, b) => {
    const x = a ?? 0;
    const y = b ?? PRICE_NO_MAX;
    if (x > y) onChange(y >= PRICE_NO_MAX ? 0 : y, x);
    else onChange(x, y);
  };

  const pick = (cap) => set(lo, cap);
  const chip = (label, cap) => {
    const on = cap === hi;
    return (
      <button key={label} type="button" onClick={() => pick(cap)} aria-pressed={on}
              className="h-10 px-3.5 rounded-full text-body whitespace-nowrap transition-colors"
              style={on
                ? { border: '1px solid var(--gold-bright)', color: 'var(--gold-bright)', background: 'var(--ff-chip-on-bg, rgba(230,185,107,0.08))' }
                : { border: '1px solid var(--line)', color: 'var(--ink-200)', background: 'var(--bg-elev)' }}>
        {label}
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRICE_QUICK_PICKS.map((cap) => chip(`Under $${cap.toLocaleString('en-US')}`, cap))}
        {chip('No max', PRICE_NO_MAX)}
      </div>
      <div className="flex items-center gap-2.5">
        <PriceBox label="Minimum price" value={lo > 0 ? lo : null} placeholder="No min" onCommit={(v) => set(v, hi)} />
        <span className="text-body" style={{ color: 'var(--ink-400)' }}>to</span>
        <PriceBox label="Maximum price" value={hi >= PRICE_NO_MAX ? null : hi} placeholder="No max" onCommit={(v) => set(lo, v ?? PRICE_NO_MAX)} />
      </div>
      <p className="mt-3 text-meta" style={{ color: 'var(--ink-400)' }}>
        Showing <span style={{ color: 'var(--ink-100)' }}>{priceRangeLabel(lo, hi)}</span>
      </p>
    </div>
  );
}

/* "More filters" — the extra filters fold away behind one button, so the
   first screen keeps Game / Rarity / Graded / Price (the grandparent test).
   Opens on its own when one of the filters inside is in use. */
export function MoreFilters({ active = 0, children }) {
  const [open, setOpen] = useState(active > 0);
  useEffect(() => { if (active > 0) setOpen(true); }, [active]);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className="w-full flex items-center justify-between text-meta font-medium py-2"
              style={{ color: 'var(--ink-200)' }}>
        <span>More filters{active ? ` (${active})` : ''}</span>
        <span aria-hidden="true" style={{ color: 'var(--ink-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>⌄</span>
      </button>
      {open && <div className="pt-4 space-y-7">{children}</div>}
    </div>
  );
}

/* Toggle chip for the More filters section (both sides). */
export function FilterChip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
            className="text-meta inline-flex items-center rounded-full transition-all whitespace-nowrap"
            style={{ minHeight: 36, padding: '0 14px', ...(on
              ? { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', border: '1px solid var(--gold-bright)', fontWeight: 600 }
              : { border: '1px solid var(--line)', background: 'var(--bg-elev-2)', color: 'var(--ink-200)', fontWeight: 500 }) }}>
      {children}
    </button>
  );
}

/* Shipping and offers — eBay's own filters, the same on both sides.
   filters: { freeShip, offers, shipFrom: '' | 'US' | 'CA', returns } */
export const SHIPPING_DEFAULTS = { freeShip: false, offers: false, shipFrom: '', returns: false };
export const shippingActive = (f) => (f.freeShip ? 1 : 0) + (f.offers ? 1 : 0) + (f.shipFrom ? 1 : 0) + (f.returns ? 1 : 0);
export function shippingLabels(f) {
  const out = [];
  if (f.freeShip) out.push({ label: 'Free shipping' });
  if (f.offers) out.push({ label: 'Accepts offers' });
  if (f.shipFrom === 'US') out.push({ label: 'Ships from the US' });
  if (f.shipFrom === 'CA') out.push({ label: 'Ships from Canada' });
  if (f.returns) out.push({ label: 'Returns accepted' });
  return out;
}
export function ShippingFilters({ filters, setFilter }) {
  return (
    <div>
      <SectionLabel>Shipping and offers</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <FilterChip on={!!filters.freeShip} onClick={() => setFilter('freeShip', !filters.freeShip)}>Free shipping</FilterChip>
        <FilterChip on={!!filters.offers} onClick={() => setFilter('offers', !filters.offers)}>Accepts offers</FilterChip>
        <FilterChip on={filters.shipFrom === 'US'} onClick={() => setFilter('shipFrom', filters.shipFrom === 'US' ? '' : 'US')}>Ships from the US</FilterChip>
        <FilterChip on={filters.shipFrom === 'CA'} onClick={() => setFilter('shipFrom', filters.shipFrom === 'CA' ? '' : 'CA')}>Ships from Canada</FilterChip>
        <FilterChip on={!!filters.returns} onClick={() => setFilter('returns', !filters.returns)}>Returns accepted</FilterChip>
      </div>
      {filters.offers && <p className="text-fine mt-2" style={{ color: 'var(--ink-600)' }}>Offers are only on Buy It Now listings.</p>}
    </div>
  );
}

/* Segmented group — used for Listing Type and Condition rows */
export function SegmentedGroup({ value, onChange, options, vertical = false }) {
  if (vertical) {
    // Vertical mode — used in the sidebar where horizontal segmented controls
    // would cramp the column. Each option is its own bordered card stacked
    // top-to-bottom.
    return (
      <div className="flex flex-col gap-1.5">
        {options.map(([v, l]) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="px-3.5 py-2.5 text-meta tracking-[0.04em] text-left transition-all border"
              style={
                active
                  ? {
                      borderColor: 'var(--ff-seg-on-line, #c9a447)',
                      background: 'var(--ff-seg-on-bg, linear-gradient(135deg, rgba(201,164,71,0.10), rgba(201,164,71,0.02)))',
                      color: 'var(--ff-seg-on-ink, #f5efe0)',
                      fontWeight: 500,
                    }
                  : {
                      borderColor: 'rgba(255,255,255,0.06)',
                      background: 'var(--ff-seg-off-bg, rgba(20,17,13,0.6))',
                      color: 'var(--ink-400)',
                    }
              }
            >
              {l}
            </button>
          );
        })}
      </div>
    );
  }
  // Horizontal mode — original segmented control for Stage 2 panel.
  return (
    <div className="flex border border-[var(--line-soft)] bg-[var(--bg-elev)]/50">
      {options.map(([v, l], idx) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 px-3 py-3 text-meta tracking-[0.06em] transition-colors text-center ${
              idx !== options.length - 1 ? 'border-r border-[var(--line-soft)]' : ''
            }`}
            style={
              active
                ? {
                    background: 'var(--gold-bright)',
                    color: 'var(--ink-on-gold)',
                    fontWeight: 600,
                    borderRightColor: 'transparent',
                  }
                : { color: 'var(--ink-400)' }
            }
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ResultsSidebar — Stage 3 left sidebar containing all filters + Search.
   Uses FilterControls in compact mode (toggles + tier picker + listing/
   condition stacked vertically, price slider full-width within column).
   The Search button sits at the bottom of the sidebar with the pending
   pulse animation when filters have unapplied changes.
   ───────────────────────────────────────────── */
export function ResultsSidebar({ children, onSearch, hasPending }) {
  return (
    <aside className="border border-[var(--line-soft)] bg-[var(--bg-elev)]/30 px-5 py-6">
      <h2 className="text-fine text-[var(--gold)] mb-5 pb-4 border-b border-[var(--line-soft)]">
        Filters
      </h2>

      {children}

      {/* Search button — bottom of sidebar */}
      <div className="mt-7 pt-5 border-t border-[var(--line-soft)]">
        <button
          onClick={onSearch}
          className={`group block w-full px-5 py-3 transition-all text-fine font-semibold text-center ${
            hasPending ? 'pending-pulse' : ''
          }`}
          style={{
            background: 'var(--gold-bright)',
            color: 'var(--ink-on-gold)',
          }}
        >
          Search <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
        </button>
        {hasPending && (
          <p className="text-fine text-[var(--gold)] italic text-center mt-3 leading-tight">
            Filters changed. Press Search to update.
          </p>
        )}
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────
   Mobile filter + sort (lg:hidden). Desktop keeps ResultsSidebar.
   - MobileFilterBar: sticky Sort + Filters pills above the results grid.
   - MobileSheet: shared bottom-sheet shell (scrim, grabber, body lock).
   - MobileFilterDrawer: reuses FilterControls + a Search button.
   - MobileSortSheet: instant client-side resort (no search).
   ───────────────────────────────────────────── */

export function MobileFilterBar({ activeCount, onOpenFilters, onOpenSort }) {
  const pill =
    'flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full text-fine font-medium text-[var(--ink-100)]';
  const pillStyle = { border: '1px solid var(--line)', background: 'var(--bg-elev)' };
  return (
    <div
      className="lg:hidden sticky top-0 z-30 flex items-center gap-3 py-3 mb-6"
      style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--line-soft)' }}
    >
      <button onClick={onOpenSort} className={pill} style={pillStyle}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink-400)" strokeWidth="1.4">
          <path d="M3 4h8M4 7h6M5 10h4" />
        </svg>
        Sort
      </button>
      <button onClick={onOpenFilters} className={pill} style={pillStyle}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink-400)" strokeWidth="1.4">
          <path d="M1 3h12M3 7h8M5 11h4" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center text-fine font-bold rounded-full"
            style={{ minWidth: 18, height: 18, padding: '0 5px', background: 'var(--gold)', color: 'var(--ink-on-gold)', letterSpacing: 0 }}
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}

export function MobileSheet({ open, onClose, title, children, footer, full = false }) {
  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="lg:hidden" aria-hidden={!open}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(5,4,3,0.62)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.32s ease',
        }}
      />
      {/* Sheet — bottom-anchored. CSS Grid (auto / auto / 1fr [/ auto]) gives
          the scroll body exactly the leftover space and never collapses. dvh
          on the height handles mobile browser chrome reliably. */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          zIndex: 50,
          display: 'grid',
          gridTemplateRows: footer ? 'auto auto 1fr auto' : 'auto auto 1fr',
          // minmax(0, …) so wide content scrolls or wraps inside the sheet
          // instead of stretching it past the screen edge.
          gridTemplateColumns: 'minmax(0, 1fr)',
          height: full ? '94dvh' : 'auto',
          maxHeight: full ? '94dvh' : '80vh',
          background: 'var(--bg-elev)',
          borderTop: '1px solid var(--line)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.5)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <button onClick={onClose} aria-label="Close" className="w-full flex justify-center pt-2.5 pb-1">
          <span style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line)', display: 'block' }} />
        </button>
        <div className="flex items-center justify-between px-6 pb-4 pt-1" style={{ borderBottom: '1px solid var(--line-soft)' }}>
          <span className="font-display italic text-price text-[var(--ink-100)]">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--ink-400)]"
            style={{ border: '1px solid var(--line-soft)' }}
          >
            <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <div className="px-6 pt-4" style={{ borderTop: '1px solid var(--line)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function MobileFilterDrawer({ open, onClose, filters, onSearch, onCloseWithChanges, children }) {
  // Snapshot filters the moment the drawer opens so we can detect changes
  // at the point of any close gesture (scrim / grabber / ✕).
  const snapshotRef = useRef(null);
  useEffect(() => {
    if (open) snapshotRef.current = JSON.stringify(filters);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCloseRequest() {
    const changed = snapshotRef.current && snapshotRef.current !== JSON.stringify(filters);
    if (changed && onCloseWithChanges) {
      onCloseWithChanges();   // caller shows the modal; drawer stays mounted
    } else {
      onClose();              // no changes — close immediately
    }
  }

  return (
    <MobileSheet
      open={open}
      onClose={handleCloseRequest}
      title="Filters"
      full
      footer={
        <button
          onClick={onSearch}
          className="w-full text-meta font-bold"
          style={{
            minHeight: 52,
            borderRadius: 12,
            background: 'var(--gold-bright)',
            color: 'var(--ink-on-gold)',
          }}
        >
          Search <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      {children}
    </MobileSheet>
  );
}

export function MobileSortSheet({ open, onClose, value, onChange, options = SPORTS_SORT_OPTIONS, note = 'Sort is instant. It reorders the cards you already have without a new search.' }) {
  return (
    <MobileSheet open={open} onClose={onClose} title="Sort">
      <div>
        {options.map(([v, l]) => {
          const sel = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="w-full flex items-center justify-between text-left text-body"
              style={{ minHeight: 50, borderBottom: '1px solid var(--line-soft)', color: sel ? 'var(--gold-bright)' : 'var(--ink-200)' }}
            >
              <span>{l}</span>
              {sel && <span style={{ color: 'var(--gold-bright)' }}><Check className="inline-block w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" /></span>}
            </button>
          );
        })}
      </div>
      <p className="text-fine italic mt-3 leading-relaxed" style={{ color: 'var(--ink-600)' }}>
        {note}
      </p>
    </MobileSheet>
  );
}

/* ─────────────────────────────────────────────
   SortDropdown — placed top-right of results header.
   Sort updates instantly via client-side resort (no API call).
   ───────────────────────────────────────────── */
export function SortDropdown({ value, onChange, options = SPORTS_SORT_OPTIONS }) {
  return (
    <label className="inline-flex items-center gap-2 text-fine text-[var(--ink-400)]">
      <span>Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-b border-[var(--line)] focus:border-[var(--gold)] outline-none pb-1 pr-6 text-[var(--ink-100)] tracking-[0.04em] cursor-pointer appearance-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%23a89870' stroke-width='1.4' d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0 center',
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-[var(--bg-base)] text-[var(--ink-100)]">
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}


/* "Search with new filters?" modal — fires when filters drift from the
   active search and the user closes the filter drawer or tries to interact
   with stale results. Strongly nudges the user to either rerun the search
   or revert their filter changes. */
// `floating` = desktop variant: the prompt floats centered with NO blocking
// backdrop and NO scroll lock, so the filter sidebar behind it stays fully
// editable. The user can adjust as many filters as they like, then press
// Search. The mobile variant (floating=false) keeps the dimmed, click-to-cancel
// scrim since its filter drawer is already closed.
export function PendingSearchModal({ open, onSearch, onCancel, onDismiss, floating = false }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (!floating) document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => {
      if (!floating) document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel, floating]);
  if (!open) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center px-6 ${floating ? 'pointer-events-none' : ''}`}
      aria-modal={floating ? undefined : 'true'}
      role="dialog"
    >
      {/* Blocking scrim — mobile only. The floating desktop variant omits it
          entirely so clicks pass through to the filters underneath. */}
      {!floating && (
        <div
          onClick={onCancel}
          className="absolute inset-0"
          style={{ background: 'rgba(5,4,3,0.7)', backdropFilter: 'blur(3px)' }}
        />
      )}
      <div
        className={`relative w-full max-w-[400px] rounded-lg p-7 text-center ${floating ? 'pointer-events-auto' : ''}`}
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--gold-deep)',
          boxShadow: floating
            ? '0 40px 100px -20px rgba(0,0,0,0.85), 0 0 40px -8px var(--ff-glow, rgba(230,185,107,0.4))'
            : '0 30px 80px -20px rgba(0,0,0,0.6), 0 0 32px -10px var(--ff-glow, rgba(230,185,107,0.3))',
        }}
      >
        {/* Dismiss × — closes the modal but keeps the user’s filter edits
            so they can keep tweaking before searching. */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
            style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-base)' }}
          >
            <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <p className="text-fine mb-4" style={{ color: 'var(--gold)' }}>
          Filters changed
        </p>
        <h3 className="font-display italic text-price leading-tight mb-3" style={{ color: 'var(--ink-100)' }}>
          Search with new filters?
        </h3>
        <p className="text-meta leading-relaxed mb-6" style={{ color: 'var(--ink-400)' }}>
          You’ve adjusted your filters since your last search. Run it again to see updated results.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onSearch}
            className="w-full min-h-[48px] rounded-lg text-fine font-bold"
            style={{
              background: 'var(--gold-bright)',
              color: 'var(--ink-on-gold)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Search <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            onClick={onCancel}
            className="w-full min-h-[40px] text-fine"
            style={{ background: 'transparent', color: 'var(--ink-400)', border: 'none', cursor: 'pointer' }}
          >
            Cancel · keep previous filters
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Floating button that appears after scrolling down, returns to top on click.
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
      style={{
        background: 'var(--bg-elev)',
        border: '0.5px solid var(--gold-deep)',
        color: 'var(--gold)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <ArrowUp className="w-4 h-4" strokeWidth={1.6} />
    </button>
  );
}

export function LoadingState({ phrase }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lede">Searching</span>
        <span className="font-mono text-fine text-[var(--gold)] tracking-wider shimmer">●</span>
      </div>
      <p key={phrase} className="font-display italic text-price text-[var(--ink-200)] rise" style={{ animationDuration: '0.5s' }}>
        {phrase}…
      </p>
      <div className="mt-10 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-6 opacity-50">
            <div className="w-[120px] md:w-[160px] aspect-[3/4] bg-[var(--bg-elev)] shimmer" style={{ animationDelay: `${i * 200}ms` }} />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-5 bg-[var(--bg-elev)] w-3/4 shimmer" style={{ animationDelay: `${i * 200 + 100}ms` }} />
              <div className="h-3 bg-[var(--bg-elev)] w-1/3 shimmer" style={{ animationDelay: `${i * 200 + 200}ms` }} />
              <div className="h-3 bg-[var(--bg-elev)] w-1/2 shimmer" style={{ animationDelay: `${i * 200 + 300}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoResultsState({ onSuggested, appliedFilters, nameFix = null, onNameFix, emptyText = 'No results found with your current filters. Adjust them and try again.' }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lede">No matches</span>
        <span className="font-mono text-fine text-[var(--ink-600)] tracking-wider">00</span>
      </div>
      {nameFix ? (
        <>
          <p className="font-display italic text-price text-[var(--ink-200)] leading-snug text-balance max-w-md">
            Nothing found. Did you mean <span style={{ color: 'var(--gold-bright)' }}>{nameFix}</span>?
          </p>
          <button
            type="button"
            onClick={() => onNameFix?.(nameFix)}
            className="mt-5 inline-flex items-center gap-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90"
            style={{ minHeight: 44, padding: '0 18px', background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}
          >
            Search {nameFix} <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </>
      ) : (
        <p className="font-display italic text-price text-[var(--ink-200)] leading-snug text-balance max-w-md">
          {emptyText}
        </p>
      )}
    </div>
  );
}
