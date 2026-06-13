'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIER_STYLES = {
  grail:   { bg: 'rgba(255,193,77,0.12)',  color: '#ffc14d', border: 'rgba(255,193,77,0.35)' },
  ultra:   { bg: 'rgba(200,212,224,0.1)',  color: '#c8d4e0', border: 'rgba(200,212,224,0.3)' },
  rare:    { bg: 'rgba(214,114,45,0.1)',   color: '#d6722d', border: 'rgba(214,114,45,0.3)' },
  scarce:  { bg: 'rgba(90,100,112,0.15)', color: '#9aa4b0', border: 'rgba(90,100,112,0.4)' },
  neutral: { bg: 'rgba(232,226,213,0.04)', color: '#a8a090', border: 'rgba(232,226,213,0.12)' },
};

function buildChips(filters) {
  if (!filters) return [];
  const chips = [];
  const selected = new Set(filters.selectedPrintRuns || []);
  const hasGrail  = ['/1', '/5', '/10', '/15', '/25'].some((r) => selected.has(r));
  const hasUltra  = ['/49', '/50', '/75', '/99'].some((r) => selected.has(r));
  const hasRare   = ['/100', '/125', '/150', '/175', '/199', '/249'].some((r) => selected.has(r));
  const hasScarce = ['/250', '/299', '/399', '/499', '/599', '/699', '/799', '/899', '/999'].some((r) => selected.has(r));

  if (filters.numberedCards) {
    if (hasGrail)  chips.push({ label: 'Grail · /1—25',      tier: 'grail' });
    if (hasUltra)  chips.push({ label: 'Ultra · /26—99',      tier: 'ultra' });
    if (hasRare)   chips.push({ label: 'Rare · /100—249',     tier: 'rare' });
    if (hasScarce) chips.push({ label: 'Scarce · /250—999',   tier: 'scarce' });
    if (filters.customPrintRuns?.length) {
      chips.push({ label: `+${filters.customPrintRuns.length} custom`, tier: 'neutral' });
    }
  }

  if (filters.autoCards)  chips.push({ label: 'Auto',    tier: 'neutral' });
  if (filters.rookieCards) chips.push({ label: 'Rookie', tier: 'neutral' });
  if (filters.condition === 'graded') chips.push({ label: 'Graded', tier: 'neutral' });
  if (filters.condition === 'raw')    chips.push({ label: 'Raw',    tier: 'neutral' });
  if (filters.listingType === 'buyItNow') chips.push({ label: 'Buy It Now', tier: 'neutral' });
  if (filters.listingType === 'auction')  chips.push({ label: 'Auction',    tier: 'neutral' });

  const min = filters.priceMin || 0;
  const max = filters.priceMax ?? 1000;
  if (min > 0 || max < 1000) chips.push({ label: `$${min}—$${max}`, tier: 'neutral' });

  return chips;
}

// Paywall modal — shown when a free user taps the alert toggle.
// Calls /api/create-checkout to get a unique LS checkout URL with the
// user's ID embedded, then opens it in a new tab.
function PaywallModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open checkout');
      window.open(data.url, '_blank', 'noopener');
      onClose();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      aria-modal="true"
      role="dialog"
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(5,4,3,0.75)', backdropFilter: 'blur(3px)' }}
      />

      <div
        className="relative w-full max-w-[400px] rounded-[6px] p-8 text-center"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--gold-deep)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), 0 0 32px -10px rgba(230,185,107,0.25)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{
            border: '1px solid var(--line-soft)',
            background: 'var(--bg-base)',
            color: 'var(--ink-400)',
          }}
        >
          ✕
        </button>

        <p
          className="text-[10px] tracking-[0.3em] uppercase mb-4"
          style={{ color: 'var(--gold)' }}
        >
          Base Plan
        </p>
        <h3
          className="font-display italic text-[26px] leading-tight mb-3"
          style={{ color: 'var(--ink-100)' }}
        >
          Never miss a card.
        </h3>
        <p
          className="text-[13px] leading-relaxed mb-2"
          style={{ color: 'var(--ink-400)' }}
        >
          Alerts on up to 5 saved searches + bid reminders.
          We check eBay every fifteen minutes — you'll know the moment it lists.
        </p>
        <p
          className="text-[12px] mb-7"
          style={{ color: 'var(--gold)' }}
        >
          $5 / month · 14-day free trial
        </p>

        {error && (
          <p className="text-[11px] mb-4" style={{ color: '#d97757' }}>{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full min-h-[48px] rounded-[8px] text-[12px] font-bold uppercase tracking-[0.14em] transition-opacity disabled:opacity-60"
            style={{
              background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
              color: '#1a1612',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Opening checkout…' : 'Start free trial →'}
          </button>
          <button
            onClick={onClose}
            className="w-full min-h-[40px] text-[11px] tracking-[0.14em] uppercase"
            style={{ background: 'transparent', color: 'var(--ink-400)', border: 'none', cursor: 'pointer' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WatchlistRow({ search, canUseAlerts }) {
  const router = useRouter();
  const [notifyEnabled, setNotifyEnabled] = useState(search.notify_enabled);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const chips = buildChips(search.filters);

  async function toggleNotify() {
    // Free users (non-founding-members) hit the paywall instead of toggling
    if (!canUseAlerts) {
      setShowPaywall(true);
      return;
    }

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
    <>
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

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

        {/* Alert toggle — shows paywall for free users */}
        <div className="flex items-center gap-2.5">
          <span
            className="text-[10px] tracking-[0.18em] uppercase hidden sm:inline"
            style={{ color: notifyEnabled && canUseAlerts ? '#d4af5c' : '#6e675b' }}
          >
            {!canUseAlerts ? 'Base' : notifyEnabled ? 'Live' : 'Paused'}
          </span>
          <button
            type="button"
            onClick={toggleNotify}
            disabled={busy}
            aria-label={
              !canUseAlerts
                ? 'Upgrade to enable alerts'
                : notifyEnabled
                ? 'Pause notifications'
                : 'Resume notifications'
            }
            className="relative w-7 h-4 rounded-full transition-colors disabled:opacity-50"
            style={{
              background: notifyEnabled && canUseAlerts ? '#d4af5c' : '#3a3530',
            }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
              style={{
                background: '#1a1614',
                left: notifyEnabled && canUseAlerts ? 'calc(100% - 14px)' : '2px',
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
    </>
  );
}
