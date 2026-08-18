'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/* NotifyFrequency — account-wide control for how often alert digests arrive.
 *
 * Sits above the saved-search list. One setting for the whole account rather
 * than per search: the poller already rolls all of a user's new matches into
 * a single email per run, so cadence is inherently an account-level idea.
 *
 * The 15-minute option carries an upgrade note that disappears entirely once
 * the user is entitled — a locked option a subscriber still sees marked
 * "upgrade" reads like the product forgot they paid.
 */

const OPTIONS = [
  { value: '15min',  label: 'Every 15 minutes', hint: 'For the fastest movers',       pro: true },
  { value: 'hourly', label: 'Hourly',           hint: 'eBay itself only emails daily', pro: false },
  { value: 'daily',  label: 'Daily digest',     hint: 'One email, once a day',         pro: false },
  { value: 'weekly', label: 'Weekly digest',    hint: 'One email, once a week',        pro: false },
];

export default function NotifyFrequency({ initialFrequency = 'hourly', canUsePro = false }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState(initialFrequency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function choose(value) {
    if (value === frequency || busy) return;
    const previous = frequency;
    setFrequency(value);
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/profile/notify-frequency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: value }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setFrequency(previous);
        if (detail?.code === 'UPGRADE_REQUIRED') {
          setError('Faster alerts need an upgrade.');
        } else {
          setError(detail?.error || 'Could not save that.');
        }
        return;
      }
      router.refresh();
    } catch {
      setFrequency(previous);
      setError('Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-[10px] p-5 md:p-6 mb-8"
      style={{ background: '#1a1614', border: '0.5px solid rgba(232,226,213,0.08)' }}
    >
      <div
        className="font-mono uppercase mb-1"
        style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)' }}
      >
        Alert frequency
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--ink-400)' }}>
        How often we email you about new matches. Applies to all your watched searches.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {OPTIONS.map((opt) => {
          const selected = frequency === opt.value;
          // The upgrade note vanishes for entitled users — they shouldn't be
          // reminded of a gate they've already cleared.
          const showProNote = opt.pro && !canUsePro;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              disabled={busy}
              className="text-left rounded-lg px-3.5 py-3 transition-colors disabled:opacity-60"
              style={{
                background: selected ? 'rgba(201,149,74,0.07)' : 'transparent',
                border: selected
                  ? '0.5px solid var(--gold)'
                  : '0.5px solid rgba(232,226,213,0.14)',
              }}
            >
              <div
                className="text-[13px] mb-0.5"
                style={{ color: selected ? 'var(--gold-bright)' : 'var(--ink-200)' }}
              >
                {opt.label}
              </div>
              <div className="text-[11px] leading-snug" style={{ color: 'var(--ink-500)' }}>
                {opt.hint}
              </div>
              {showProNote && (
                <div
                  className="mt-1.5 font-mono uppercase inline-block px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: 8.5,
                    letterSpacing: '0.16em',
                    color: 'var(--gold-bright)',
                    background: 'rgba(201,149,74,0.06)',
                    border: '0.5px solid var(--gold-deep)',
                  }}
                >
                  Higher tier
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 text-[11.5px]" style={{ color: '#d97757' }}>
          {error}
        </div>
      )}
    </div>
  );
}
