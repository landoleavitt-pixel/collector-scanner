'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;

    // Light client-side validation. The server validates too.
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('That doesn\'t look like a valid email.');
      return;
    }

    setStatus('submitting');
    setError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Try again?');
      }

      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-[var(--gold-deep)] bg-[var(--bg-elev)] px-6 py-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)] mb-3">
          On the list
        </p>
        <p className="font-display text-2xl leading-tight tracking-tight">
          We'll be in touch.
        </p>
        <p className="mt-3 text-[var(--ink-200)] leading-relaxed">
          You'll get a single email when Alerts goes live. Until then, the search instrument is at your disposal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          placeholder="your@email.com"
          aria-label="Email address"
          className="flex-1 bg-[var(--bg-elev)] border border-[var(--line)] focus:border-[var(--gold-deep)] px-5 py-4 text-[var(--ink-100)] placeholder:text-[var(--ink-600)] transition-colors outline-none"
          disabled={status === 'submitting'}
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="group inline-flex items-center justify-center gap-2 px-6 py-4 bg-[var(--gold)] text-[var(--bg-base)] hover:bg-[var(--gold-bright)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium tracking-wide whitespace-nowrap"
        >
          {status === 'submitting' ? 'Adding…' : 'Join the waitlist'}
          {status !== 'submitting' && (
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-[var(--crit)]">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-[var(--ink-600)] leading-relaxed">
        One email when Alerts launches. No newsletter. No tracking. Unsubscribe with one click.
      </p>
    </form>
  );
}
