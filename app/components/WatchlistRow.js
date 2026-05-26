'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIER_STYLES = {
  grail: { bg: 'rgba(255,193,77,0.12)', color: '#ffc14d', border: 'rgba(255,193,77,0.35)' },
  ultra: { bg: 'rgba(200,212,224,0.1)', color: '#c8d4e0', border: 'rgba(200,212,224,0.3)' },
  rare: { bg: 'rgba(214,114,45,0.1)', color: '#d6722d', border: 'rgba(214,114,45,0.3)' },
  scarce: { bg: 'rgba(90,100,112,0.15)', color: '#9aa4b0', border: 'rgba(90,100,112,0.4)' },
  neutral: { bg: 'rgba(232,226,213,0.04)', color: '#a8a090', border: 'rgba(232,226,213,0.12)' },
};

// Mirrors buildSaveChips in app/page.js so the watchlist row reflects what
// the user actually selected on the search page.
function buildChips(filters) {
  if (!filters) return [];
  const chips = [];
  const selected = new Set(filters.selectedPrintRuns || []);
  const hasGrail = ['/1', '/5', '/10', '/15', '/25'].some((r) => selected.has(r));
  const hasUltra = ['/49', '/50', '/75', '/99'].some((r) => selected.has(r));
  const hasRare = ['/100', '/125', '/150', '/175', '/199', '/249'].some((r) => selected.has(r));
  const hasScarce = ['/250', '/299', '/399', '/499', '/599', '/699', '/799', '/899', '/999'].some((r) => selected.has(r));

  if (filters.numberedCards) {
    if (hasGrail) chips.push({ label: 'Grail · /1—25', tier: 'grail' });
    if (hasUltra) chips.push({ label: 'Ultra · /26—99', tier: 'ultra' });
    if (hasRare) chips.push({ label: 'Rare · /100—249', tier: 'rare' });
    if (hasScarce) chips.push({ label: 'Scarce · /250—999', tier: 'scarce' });
    if (filters.customPrintRuns?.length) {
      chips.push({ label: `+${filters.customPrintRuns.length} custom`, tier: 'neutral' });
    }
  }

  if (filters.autoCards) chips.push({ label: 'Auto', tier: 'neutral' });
  if (filters.rookieCards) chips.push({ label: 'Rookie', tier: 'neutral' });
  if (filters.condition === 'graded') chips.push({ label: 'Graded', tier: 'neutral' });
  if (filters.condition === 'raw') chips.push({ label: 'Raw', tier: 'neutral' });
  if (filters.listingType === 'buyItNow') chips.push({ label: 'Buy It Now', tier: 'neutral' });
  if (filters.listingType === 'auction') chips.push({ label: 'Auction', tier: 'neutral' });

  const min = filters.priceMin || 0;
  const max = filters.priceMax ?? 1000;
  if (min > 0 || max < 1000) {
    chips.push({ label: `$${min}—$${max}`, tier: 'neutral' });
  }

  return chips;
}

export default function WatchlistRow({ search }) {
  const router = useRouter();
  const [notifyEnabled, setNotifyEnabled] = useState(search.notify_enabled);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const chips = buildChips(search.filters);

  async function toggleNotify() {
    setBusy(true);
    const newValue = !notifyEnabled;
    setNotifyEnabled(newValue);
    const res = await fetch(`/api/saved-searches/${search.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify_enabled: newValue }),
    });
    if (!res.ok) setNotifyEnabled(!newValue);
    setBusy(false);
  }

  async function handleDelete() {
    setBusy(true);
    const res = await fetch(`/api/saved-searches/${search.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  function handleView() {
    router.push(`/?savedSearch=${search.id}`);
  }

  return (
    <div
      className="rounded-[10px] p-5 md:p-6 grid gap-6 items-center"
      style={{
        background: '#1a1614',
        border: '0.5px solid rgba(232,226,213,0.08)',
        gridTemplateColumns: '1fr auto auto',
        opacity: notifyEnabled ? 1 : 0.55,
        transition: 'opacity 0.2s',
      }}
    >
      <div className="min-w-0">
        <div
          className="font-serif italic text-[19px] mb-2 truncate"
          style={{ color: '#e8e2d5' }}
        >
          {search.name}
        </div>
        <div
          className="text-[12px] font-serif italic mb-2.5 truncate"
          style={{ color: '#8a8275' }}
        >
          "{search.query}"
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.length === 0 ? (
            <span
              className="text-[9px] tracking-[0.18em] uppercase px-2 py-1 rounded"
              style={TIER_STYLES.neutral}
            >
              No filters
            </span>
          ) : (
            chips.map((chip, i) => {
              const style = TIER_STYLES[chip.tier] || TIER_STYLES.neutral;
              return (
                <span
                  key={i}
                  className="text-[9px] tracking-[0.18em] uppercase px-2 py-1 rounded"
                  style={{
                    background: style.bg,
                    color: style.color,
                    border: `0.5px solid ${style.border}`,
                  }}
                >
                  {chip.label}
                </span>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className="text-[10px] tracking-[0.18em] uppercase hidden sm:inline"
          style={{ color: notifyEnabled ? '#d4af5c' : '#6e675b' }}
        >
          {notifyEnabled ? 'Live' : 'Paused'}
        </span>
        <button
          type="button"
          onClick={toggleNotify}
          disabled={busy}
          aria-label={notifyEnabled ? 'Pause notifications' : 'Resume notifications'}
          className="relative w-7 h-4 rounded-full transition-colors disabled:opacity-50"
          style={{ background: notifyEnabled ? '#d4af5c' : '#3a3530' }}
        >
          <div
            className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
            style={{
              background: '#1a1614',
              left: notifyEnabled ? 'calc(100% - 14px)' : '2px',
            }}
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="px-3 py-1.5 rounded-full text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#d97757', color: '#1a1614', border: 'none' }}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="px-3 py-1.5 rounded-full text-[10px] tracking-[0.18em] uppercase"
              style={{
                background: 'transparent',
                border: '0.5px solid rgba(232,226,213,0.18)',
                color: '#8a8275',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleView}
              className="px-3.5 py-1.5 rounded-full text-[10px] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]"
              style={{
                background: 'transparent',
                border: '0.5px solid rgba(232,226,213,0.18)',
                color: '#8a8275',
              }}
            >
              View
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete saved search"
              className="p-1.5 rounded-full transition-colors hover:text-[#d97757]"
              style={{ background: 'transparent', border: 'none', color: '#6e675b', cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
