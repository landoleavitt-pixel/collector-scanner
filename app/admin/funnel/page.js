'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// /admin/funnel: how many people reach each step, last 1 / 7 / 30 days.
// The route (/api/admin/funnel) does the admin check; non-admins see the
// access-denied message.

const LABELS = {
  landed: 'Visited the site',
  searched: 'Ran a search',
  card_opened: 'Opened a card',
  starred: 'Starred a card',
  signed_up: 'Created an account',
  watch_limit_hit: 'Hit their alert limit',
  trial_started: 'Started a free trial',
};

export default function AdminFunnelPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/funnel');
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { router.push('/login?next=/admin/funnel'); return; }
        if (!res.ok) { setState({ loading: false, data: null, error: data.error || `Error ${res.status}` }); return; }
        setState({ loading: false, data, error: null });
      } catch (e) {
        setState({ loading: false, data: null, error: e.message });
      }
    })();
  }, [router]);

  const rows = state.data?.windows?.[days] || [];
  const top = rows[0]?.people || 0;

  return (
    <main className="min-h-[calc(100vh-200px)] py-12 md:py-16">
      <div className="max-w-[900px] mx-auto px-6 lg:px-10">
        <div className="text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: 'var(--gold)' }}>
          Admin · Funnel
        </div>
        <h1 className="font-display italic text-[36px] md:text-[44px] leading-[1.05]" style={{ color: 'var(--ink-100)' }}>
          Who gets where.
        </h1>
        <p className="text-[13px] mt-2 max-w-[520px] leading-[1.5]" style={{ color: 'var(--ink-400)' }}>
          People who reached each step. Anonymous: no emails, names or search text are stored.
        </p>

        <div className="flex gap-2 mt-8 mb-6" role="tablist" aria-label="Time range">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={days === d}
              onClick={() => setDays(d)}
              className="text-[11px] tracking-[0.14em] uppercase px-4 py-2 rounded-full"
              style={{
                color: days === d ? 'var(--bg-base)' : 'var(--ink-200)',
                background: days === d ? 'var(--gold-bright)' : 'transparent',
                border: '1px solid var(--line)',
              }}
            >
              {d === 1 ? 'Last day' : `Last ${d} days`}
            </button>
          ))}
        </div>

        {state.loading && <p style={{ color: 'var(--ink-400)' }}>Loading…</p>}
        {state.error && (
          <p role="alert" className="text-[14px]" style={{ color: 'var(--ink-200)' }}>{state.error}</p>
        )}

        {!state.loading && !state.error && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <table className="w-full text-[14px]" style={{ color: 'var(--ink-200)', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-400)', background: 'var(--bg-elev-2)' }}>
                  <th className="text-left p-3">Step</th>
                  <th className="text-right p-3">People</th>
                  <th className="text-right p-3">% of visitors</th>
                  <th className="text-right p-3 hidden sm:table-cell">Total events</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.step} style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="p-3">{LABELS[r.step] || r.step}</td>
                    <td className="p-3 text-right" style={{ color: 'var(--ink-100)' }}>{r.people.toLocaleString('en-US')}</td>
                    <td className="p-3 text-right">{top ? `${Math.round((r.people / top) * 100)}%` : '–'}</td>
                    <td className="p-3 text-right hidden sm:table-cell" style={{ color: 'var(--ink-400)' }}>{r.events.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!state.loading && !state.error && state.data?.health && (
          <div className="mt-8" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', color: 'var(--ink-200)' }}>
            <div className="text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-400)' }}>
              Is free the right size? (all time, accounts older than 14 days)
            </div>
            <p className="text-[14px] leading-[1.6]">
              <strong style={{ color: 'var(--ink-100)' }}>{state.data.health.freeStillOnAlert}</strong> of{' '}
              {state.data.health.freeOlderThan14Days} free accounts still have their one alert on.
            </p>
            <p className="text-[14px] leading-[1.6]">
              <strong style={{ color: 'var(--ink-100)' }}>{state.data.health.trialsNowPaying}</strong> of{' '}
              {state.data.health.trialsOlderThan14Days} free trials that began 14+ days ago are now paying.
            </p>
          </div>
        )}
        <p className="text-[12px] mt-4 leading-[1.5]" style={{ color: 'var(--ink-600)' }}>
          Your own browsers are left out (any browser where you've signed in as admin, or opened ?internal=1), counted from Oct 23 on. Account and trial steps are counted per signed-in user; the rest per browser, so the
          percentages are a guide rather than an exact conversion rate.
        </p>
      </div>
    </main>
  );
}
