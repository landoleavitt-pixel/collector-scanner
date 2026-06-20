'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// /admin/usage — eBay API call quota dashboard for admins.
//
// Calls /api/admin/usage which gates on ADMIN_USER_IDS env. The page itself
// doesn't gate — it just renders whatever the route returns. A non-admin
// gets a 403 and sees the access-denied state below.

export default function AdminUsagePage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/admin/usage');
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push('/login?next=/admin/usage');
        return;
      }
      if (!res.ok) {
        setState({ loading: false, data: null, error: data.error || `Error ${res.status}` });
        return;
      }
      setState({ loading: false, data, error: null });
    } catch (e) {
      setState({ loading: false, data: null, error: e.message });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[calc(100vh-200px)] py-12 md:py-16">
      <div className="max-w-[900px] mx-auto px-6 lg:px-10">

        {/* Header */}
        <div className="mb-10 md:mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div
              className="text-[10px] tracking-[0.22em] uppercase mb-3"
              style={{ color: 'var(--gold)' }}
            >
              Admin · eBay API
            </div>
            <h1
              className="font-display italic text-[36px] md:text-[44px] leading-[1.05]"
              style={{ color: 'var(--ink-100)' }}
            >
              Quota usage.
            </h1>
            <p
              className="text-[13px] mt-2 max-w-[460px] leading-[1.5]"
              style={{ color: 'var(--ink-400)' }}
            >
              Live from eBay's Developer Analytics API. Daily windows only.
              Resets are in UTC.
            </p>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-full text-[11px] tracking-[0.18em] uppercase transition-colors"
            style={{
              background: 'transparent',
              border: '0.5px solid var(--gold)',
              color: 'var(--gold)',
            }}
          >
            {state.loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Body */}
        {state.loading && !state.data && <LoadingState />}
        {state.error && <ErrorState error={state.error} />}
        {state.data && <UsageTable data={state.data} />}

      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div
      className="rounded-[10px] p-10 text-center"
      style={{ background: '#1a1614', border: '0.5px solid rgba(232,226,213,0.08)' }}
    >
      <div className="font-serif italic text-[18px]" style={{ color: 'var(--ink-300)' }}>
        Asking eBay…
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  // Friendlier copy for the common case: non-admin user hitting the page.
  const isForbidden = /not authorized/i.test(error);
  return (
    <div
      className="rounded-[10px] p-8 text-center"
      style={{
        background: '#1a1614',
        border: '0.5px solid rgba(217,119,87,0.3)',
        color: '#d97757',
      }}
    >
      <div className="font-serif italic text-[18px] mb-2" style={{ color: '#e8e2d5' }}>
        {isForbidden ? 'Not authorized.' : 'Could not load usage.'}
      </div>
      <div className="text-[12px]" style={{ color: '#8a8275' }}>
        {error}
      </div>
    </div>
  );
}

function UsageTable({ data }) {
  const summary = data.summary || [];

  if (summary.length === 0) {
    return (
      <div
        className="rounded-[10px] p-8 text-center"
        style={{ background: '#1a1614', border: '0.5px solid rgba(232,226,213,0.08)' }}
      >
        <div className="font-serif italic text-[18px] mb-2" style={{ color: 'var(--ink-200)' }}>
          No daily quotas to show.
        </div>
        <div className="text-[12px]" style={{ color: 'var(--ink-500)' }}>
          eBay returned zero rate-limited resources for the buy context.
          {' '}This sometimes means the call worked but the data is empty.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Last refreshed */}
      <div
        className="text-[10px] uppercase tracking-[0.18em] mb-4"
        style={{ color: 'var(--ink-500)' }}
      >
        Fetched {new Date(data.fetchedAt).toLocaleString()}
      </div>

      <div className="flex flex-col gap-2">
        {summary.map((row) => (
          <UsageRow key={`${row.apiName}:${row.resource}`} row={row} />
        ))}
      </div>

      {/* Caveat: eBay's endpoint has a known reliability issue */}
      <div
        className="text-[11px] mt-8 p-4 rounded-[8px]"
        style={{
          background: 'rgba(255,217,122,0.04)',
          border: '0.5px solid rgba(255,217,122,0.12)',
          color: 'var(--ink-300)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--gold)' }}>Sanity check:</strong> if every
        row above shows {`"remaining = limit"`} after you've clearly made
        searches today, eBay's analytics endpoint is returning stale data
        (a known issue). Use eBay's own developer dashboard as a fallback,
        or build a local counter.
      </div>
    </div>
  );
}

function UsageRow({ row }) {
  const limit = row.limit ?? 0;
  const used = row.used ?? 0;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  // Color the bar by burn rate — green under 50%, gold under 80%, red above.
  let barColor = '#6e9a5b';
  if (pct >= 80) barColor = '#d97757';
  else if (pct >= 50) barColor = '#d4af5c';

  const resetDate = row.reset ? new Date(row.reset) : null;
  const resetLabel = resetDate
    ? resetDate.toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div
      className="rounded-[8px] p-4"
      style={{ background: '#1a1614', border: '0.5px solid rgba(232,226,213,0.08)' }}
    >
      <div className="flex items-baseline justify-between mb-2 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--ink-500)' }}>
            {row.apiName}
          </div>
          <div className="font-serif italic text-[15px]" style={{ color: 'var(--ink-100)' }}>
            {row.resource}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display italic text-[20px]" style={{ color: 'var(--gold)' }}>
            {used.toLocaleString()} <span style={{ color: 'var(--ink-500)' }} className="text-[12px]">/ {limit.toLocaleString()}</span>
          </div>
          <div className="text-[10px]" style={{ color: 'var(--ink-500)' }}>
            resets {resetLabel}
          </div>
        </div>
      </div>

      {/* Bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(232,226,213,0.06)' }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
  );
}
