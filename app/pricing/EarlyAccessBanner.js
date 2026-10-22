'use client';

// app/pricing/EarlyAccessBanner.js
//
// Small banner that sits between the pricing hero and the tier cards. Tells
// visitors that paid subscriptions are about to go live, and captures their
// email so we can notify them — preventing rare high-intent visitors from
// dead-ending when they discover paid features aren't quite ready.
//
// Posts to the existing /api/waitlist endpoint which adds the email to a
// Resend Audience. Three states: idle (form), success (thank-you), error.

import { useState } from 'react';

export default function EarlyAccessBanner() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data?.error || 'Something went wrong. Try again?');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMessage('Network error. Try again?');
      setStatus('error');
    }
  }

  return (
    <div
      className="rise max-w-[680px] mx-auto mb-12 lg:mb-16 px-5 py-5 rounded-lg"
      style={{
        animationDelay: '220ms',
        background: 'linear-gradient(180deg, rgba(212,175,92,0.06) 0%, rgba(212,175,92,0.02) 100%)',
        border: '0.5px solid rgba(212,175,92,0.28)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold-bright)] mb-1.5 font-medium">
            Premium
          </p>
          <p className="text-[13px] leading-relaxed text-[var(--ink-200)]">
            Premium is in the works. Leave your email and we&apos;ll tell you when it&apos;s ready.
          </p>
        </div>

        {status === 'success' ? (
          <div
            className="flex-none px-4 py-2.5 rounded text-[13px] tracking-[0.06em]"
            style={{
              background: 'rgba(212,175,92,0.10)',
              color: 'var(--gold-bright)',
              border: '0.5px solid rgba(212,175,92,0.3)',
              minWidth: '180px',
              textAlign: 'center',
            }}
          >
            You&apos;re on the list.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-none flex gap-2 w-full sm:w-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={status === 'submitting'}
              className="flex-1 sm:w-[220px] px-3 py-2.5 rounded text-[13px] text-[var(--ink-100)] outline-none transition-colors"
              style={{
                background: 'rgba(10,9,7,0.5)',
                border: '0.5px solid rgba(232,226,213,0.12)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,92,0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(232,226,213,0.12)'; }}
            />
            <button
              type="submit"
              disabled={status === 'submitting' || !email}
              className="px-4 py-2.5 rounded text-[11px] uppercase tracking-[0.14em] font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{
                background: 'var(--gold-bright)',
                color: 'var(--ink-on-gold)',
              }}
            >
              {status === 'submitting' ? 'Adding…' : 'Notify me'}
            </button>
          </form>
        )}
      </div>

      {status === 'error' && (
        <p className="text-[13px] mt-3" style={{ color: '#e57373' }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
