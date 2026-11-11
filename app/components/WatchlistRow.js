'use client';

import { useState } from 'react';
import { toParams } from '../fables/data';
import { useRouter } from 'next/navigation';
import { buildShareUrl } from '../../lib/shareLink';
import { brandFilterLabels } from '../../lib/cardBrands';
import { teamFilterLabels } from '../../lib/teams';
import { isNativeApp } from '../../lib/native';
import { X } from 'lucide-react';
import { groupOf } from '../fables/rarity';
import useSetName from '../fables/useSetName';
import { usePushAsk } from './PushAsk';

const TIER_STYLES = {
  grail:   { bg: 'rgba(255,193,77,0.12)',  color: '#ffc14d', border: 'rgba(255,193,77,0.35)' },
  ultra:   { bg: 'rgba(200,212,224,0.1)',  color: '#c8d4e0', border: 'rgba(200,212,224,0.3)' },
  rare:    { bg: 'rgba(214,114,45,0.1)',   color: '#d6722d', border: 'rgba(214,114,45,0.3)' },
  scarce:  { bg: 'rgba(90,100,112,0.15)', color: '#9aa4b0', border: 'rgba(90,100,112,0.4)' },
  neutral: { bg: 'rgba(232,226,213,0.04)', color: '#a8a090', border: 'rgba(232,226,213,0.12)' },
};

// Foils & Fables saved searches use their own filters (app/fables/FablesHome.js).
const FABLES_GAMES = { pokemon: 'Pokémon', mtg: 'Magic', yugioh: 'Yu-Gi-Oh!', onepiece: 'One Piece', lorcana: 'Lorcana' };
const FABLES_LANGS = { en: 'English', ja: 'Japanese', other: 'Other languages' };
function buildFablesChips(f, setName) {
  const chips = [];
  if (FABLES_GAMES[f.game]) chips.push({ label: FABLES_GAMES[f.game], tier: 'neutral' });
  if (f.needOnly) chips.push({ label: 'Only ones I need', tier: 'neutral' });
  if (f.shiny === 'yes') chips.push({ label: 'Shiny', tier: 'neutral' });
  if (f.shiny === 'no') chips.push({ label: 'Not shiny', tier: 'neutral' });
  (f.rarity || []).forEach((k) => { const g = groupOf(k); chips.push({ label: g ? g.label : k, tier: 'neutral' }); });
  if (f.set) chips.push({ label: setName || 'One set', tier: 'neutral' });
  const lang = Array.isArray(f.lang) ? f.lang : f.lang ? String(f.lang).split(',') : [];
  lang.forEach((k) => chips.push({ label: FABLES_LANGS[k] || k, tier: 'neutral' }));
  if (f.graded === 'graded') chips.push({ label: [f.grader || 'Graded', f.grade ? (f.grade === '10' ? '10' : `${f.grade}+`) : ''].filter(Boolean).join(' '), tier: 'neutral' });
  if (f.graded === 'raw') chips.push({ label: 'Raw', tier: 'neutral' });
  if (f.firstEd) chips.push({ label: '1st Edition', tier: 'neutral' });
  if (f.serialOnly) chips.push({ label: 'Serial-numbered', tier: 'neutral' });
  if (f.listing === 'bin') chips.push({ label: 'Buy It Now', tier: 'neutral' });
  if (f.listing === 'auction') chips.push({ label: 'Auction', tier: 'neutral' });
  const min = f.priceMin || 0;
  const max = f.priceMax ?? 100000;
  if (min > 0 || max < 100000) chips.push({ label: max < 100000 ? `$${min}–$${max}` : `$${min} and up`, tier: 'neutral' });
  const more = (f.finish?.length || 0) + (f.art?.length || 0) + (f.cond?.length ? 1 : 0) + (f.promos && f.promos !== 'show' ? 1 : 0)
    + (f.freeShip ? 1 : 0) + (f.offers ? 1 : 0) + (f.shipFrom ? 1 : 0) + (f.returns ? 1 : 0);
  if (more) chips.push({ label: `+${more} more`, tier: 'neutral' });
  return chips;
}

function buildChips(filters) {
  if (!filters) return [];
  const chips = [];
  const selected = new Set(filters.selectedPrintRuns || []);
  const hasGrail  = ['/1', '/5', '/10', '/15', '/25'].some((r) => selected.has(r));
  const hasUltra  = ['/49', '/50', '/75', '/99'].some((r) => selected.has(r));
  const hasRare   = ['/100', '/125', '/150', '/175', '/199', '/249'].some((r) => selected.has(r));
  const hasScarce = ['/250', '/299', '/399', '/499', '/599', '/699', '/799', '/899', '/999'].some((r) => selected.has(r));

  if (filters.numberedCards) {
    if (hasGrail)  chips.push({ label: 'Grail · 1 to 25 made',      tier: 'grail' });
    if (hasUltra)  chips.push({ label: 'Ultra · 26 to 99 made',     tier: 'ultra' });
    if (hasRare)   chips.push({ label: 'Rare · 100 to 249 made',    tier: 'rare' });
    if (hasScarce) chips.push({ label: 'Scarce · 250 or more made', tier: 'scarce' });
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
  brandFilterLabels(filters.brands, filters.brandLines).forEach((label) => chips.push({ label, tier: 'neutral' }));
  teamFilterLabels(filters.teams).forEach((label) => chips.push({ label, tier: 'neutral' }));

  const min = filters.priceMin || 0;
  const max = filters.priceMax ?? 1000;
  if (min > 0 || max < 1000) chips.push({ label: `$${min}–$${max}`, tier: 'neutral' });

  return chips;
}

// Paywall modal — shown when a free user taps the alert toggle.
// Calls /api/create-checkout to get a unique LS checkout URL with the
// user's ID embedded, then opens it in a new tab.
function PaywallModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    // iOS app: Apple in-app purchase lives on /subscribe.
    if (isNativeApp()) {
      window.location.assign('/subscribe');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' });
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
        className="relative w-full max-w-[400px] rounded-lg p-8 text-center"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--accent-deep)',
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
          <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        </button>

        <p
          className="text-fine mb-4"
          style={{ color: 'var(--accent)' }}
        >
          Base Plan
        </p>
        <h3
          className="font-display italic text-price leading-tight mb-3"
          style={{ color: 'var(--ink-100)' }}
        >
          Never miss a card.
        </h3>
        <p
          className="text-meta leading-relaxed mb-2"
          style={{ color: 'var(--ink-400)' }}
        >
          Alerts on up to 5 saved searches + bid reminders.
          We check eBay every hour. eBay's own saved searches email once a day.
        </p>
        <p
          className="text-meta mb-7"
          style={{ color: 'var(--accent)' }}
        >
          $6.99 / month · 14-day free trial
        </p>

        {error && (
          <p className="text-fine mb-4" style={{ color: 'var(--crit)' }}>{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full min-h-[48px] rounded-lg text-fine font-bold transition-opacity disabled:opacity-60"
            style={{
              background: 'var(--accent-bright)',
              color: 'var(--ink-on-accent)',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Opening checkout…' : 'Start free trial'}
          </button>
          <button
            onClick={onClose}
            className="w-full min-h-[40px] text-fine"
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
  const pushAsk = usePushAsk(); // iPhone app: explain, then ask for notifications when an alert is first turned on
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  // Inline message when the server rejects turning this search on because
  // the user already has the max number of searches actively watching.
  const [limitMsg, setLimitMsg] = useState('');
  const [shareMsg, setShareMsg] = useState('');

  // True only when this search will actually send email. Drives the gold
  // outline so "armed" is the state we visually mark, rather than dimming
  // everything that isn't.
  const alertsLive = canUseAlerts && notifyEnabled;

  const fables = search.side === 'fables';
  const setName = useSetName(fables ? search.filters?.game : null, fables ? search.filters?.set : null);
  const chips = fables ? buildFablesChips(search.filters || {}, setName) : buildChips(search.filters);

  async function toggleNotify() {
    // Free users (non-founding-members) hit the paywall instead of toggling
    if (!canUseAlerts) {
      setShowPaywall(true);
      return;
    }

    setBusy(true);
    setLimitMsg('');
    const newValue = !notifyEnabled;
    setNotifyEnabled(newValue);
    const res = await fetch(`/api/saved-searches/${search.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify_enabled: newValue }),
    });
    if (!res.ok) {
      setNotifyEnabled(!newValue);
      // 409 = hit the active-watch cap. Show the reason inline rather than
      // silently snapping the toggle back, which looks like a bug.
      const detail = await res.json().catch(() => ({}));
      if (detail?.code === 'WATCH_LIMIT') {
        setLimitMsg(detail.error || 'Watch limit reached. Pause one to watch this.');
      }
    }
    setBusy(false);
    if (res.ok && newValue) await pushAsk.ask();
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

  // Foils & Fables searches run on their own side, straight from the saved criteria.
  const fablesUrl = () => `/fables?${toParams(search.query, search.filters || {})}`;

  function handleView() {
    router.push(search.side === 'fables' ? `/fables?savedSearch=${search.id}` : `/?savedSearch=${search.id}`);
  }

  async function handleShare() {
    // Share the saved search's CRITERIA (not its id) so the recipient gets
    // a link that runs the same search under their own account.
    const url = search.side === 'fables' ? `${window.location.origin}${fablesUrl()}` : buildShareUrl(search.query, search.filters || {});
    const text = `Check out this ${search.name} search on ${search.side === 'fables' ? 'Foils & Fables' : 'Fields & Floors'}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: search.name, text, url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Copied');
      setTimeout(() => setShareMsg(''), 1800);
    } catch {
      setShareMsg('Copy failed');
      setTimeout(() => setShareMsg(''), 2200);
    }
  }

  function handleEdit() {
    router.push(search.side === 'fables' ? `/fables?editSearch=${search.id}` : `/?editSearch=${search.id}`);
  }

  // Each row wears its own side's colours: data-side="fables" swaps the
  // shared tokens to Night foil for just this row (globals.css).
  const accentRgb = fables ? '143,211,232' : '201,149,74';

  return (
    <>
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {pushAsk.node}

      <div
        data-side={fables ? 'fables' : undefined}
        className="rounded-xl p-5 md:p-6 grid gap-5 lg:gap-6 grid-cols-1 lg:grid-cols-[1fr_auto_auto] items-start lg:items-center"
        style={{
          background: 'var(--ink-on-accent)',
          // Alerts live → gold outline + faint glow. Everything else gets
          // the neutral border at full opacity. Marking the ACTIVE state
          // rather than dimming the inactive one means free users and
          // paused subscribers both see a normal, healthy-looking list
          // instead of a greyed-out one.
          border: alertsLive
            ? '0.5px solid var(--accent)'
            : '0.5px solid rgba(232,226,213,0.08)',
          boxShadow: alertsLive
            ? `0 0 0 1px rgba(${accentRgb},0.18), 0 0 18px -6px rgba(${accentRgb},0.35)`
            : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <div className="min-w-0">
          <div
            className="font-serif italic text-h3 mb-2 truncate"
            style={{ color: 'var(--ink-200)' }}
          >
            {search.name}
          </div>
          <div className="flex items-center gap-1.5 text-fine mb-1.5" style={{ color: 'var(--ink-400)' }}>
            <span className="w-[7px] h-[7px] rounded-full inline-block" aria-hidden="true"
                  style={{ background: search.side === 'fables' ? 'linear-gradient(135deg,#9fe3f5,#b6a8f0,#f0b3d0,#f3d9a0)' : '#e6b96b' }} />
            {search.side === 'fables' ? 'Foils & Fables' : 'Sports'}
          </div>
          <div
            className="text-meta font-serif italic mb-2.5 truncate"
            style={{ color: 'var(--ink-400)' }}
          >
            "{search.query}"
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.length === 0 ? (
              <span
                className="text-fine px-2 py-1 rounded"
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
                    className="text-fine px-2 py-1 rounded"
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

        {/* Toggle + actions share one row on narrow screens. `lg:contents`
            dissolves this wrapper at desktop widths so both children drop
            back into their own grid columns. */}
        <div className="flex items-center justify-between gap-3 flex-wrap lg:contents">

        {/* Alert toggle — shows paywall for free users */}
        <div className="flex flex-col items-start lg:items-end gap-1">
        <div className="flex items-center gap-2.5">
          <span
            className="text-fine"
            style={{ color: alertsLive ? 'var(--accent-bright)' : 'var(--ink-600)' }}
          >
            {!canUseAlerts ? 'Notify' : notifyEnabled ? 'Watching' : 'Paused'}
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
              background: alertsLive ? 'var(--accent-bright)' : (fables ? 'var(--line)' : '#3a3530'),
            }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
              style={{
                background: 'var(--ink-on-accent)',
                left: alertsLive ? 'calc(100% - 14px)' : '2px',
              }}
            />
          </button>
        </div>
        {limitMsg && (
          <span
            className="text-fine leading-tight text-left lg:text-right max-w-[220px]"
            style={{ color: 'var(--crit)' }}
          >
            {limitMsg}
          </span>
        )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="px-3 py-1.5 rounded-full text-fine transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--crit)', color: 'var(--ink-on-accent)', border: 'none' }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="px-3 py-1.5 rounded-full text-fine"
                style={{
                  background: 'transparent',
                  border: '0.5px solid rgba(232,226,213,0.18)',
                  color: 'var(--ink-400)',
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="px-3.5 py-1.5 rounded-full text-fine transition-colors"
                style={{
                  background: 'transparent',
                  border: `0.5px solid rgba(${accentRgb},0.40)`,
                  color: 'var(--accent)',
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleView}
                className="px-3.5 py-1.5 rounded-full text-fine transition-colors hover:text-[var(--accent)]"
                style={{
                  background: 'transparent',
                  border: '0.5px solid rgba(232,226,213,0.18)',
                  color: 'var(--ink-400)',
                }}
              >
                View
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="px-3.5 py-1.5 rounded-full text-fine transition-colors hover:text-[var(--accent)]"
                style={{
                  background: 'transparent',
                  border: '0.5px solid rgba(232,226,213,0.18)',
                  color: shareMsg ? 'var(--accent)' : 'var(--ink-400)',
                }}
              >
                {shareMsg || 'Share'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete saved search"
                className="p-1.5 rounded-full transition-colors hover:text-[var(--crit)]"
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-600)', cursor: 'pointer' }}
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
      </div>
    </>
  );
}
