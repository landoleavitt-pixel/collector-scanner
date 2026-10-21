'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabaseClient';
import Seal from '../components/Seal';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Reset link must point straight to /reset-password so the page can
    // exchange the code and show the new-password form. Routing through
    // /auth/callback would log the user in and bounce them home.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center gap-3 px-6 pt-8 opacity-70">
        <Seal className="w-6 h-6" />
        <span className="font-serif text-base" style={{ color: 'var(--ink-200)' }}>
          Fields &amp; Floors
        </span>
        <span className="ml-auto text-[10px] tracking-[0.12em] uppercase" style={{ color: 'var(--ink-600)' }}>
          Issue 001 · Est 2026
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          className="w-full max-w-[400px] rounded-xl p-9"
          style={{
            background: 'var(--ink-on-gold)',
            border: '0.5px solid rgba(232,226,213,0.08)',
            color: 'var(--ink-200)',
          }}
        >
          <h1
            className="font-serif italic text-[26px] leading-tight text-center mb-1"
            style={{ color: 'var(--ink-200)' }}
          >
            Reset your password.
          </h1>
          <p className="text-[13px] text-center mb-6" style={{ color: 'var(--ink-400)' }}>
            Enter your email and we'll send a reset link.
          </p>

          {resetSent ? (
            <div
              className="rounded-lg p-4 text-[13px] text-center"
              style={{
                background: 'var(--bg-elev-2)',
                border: '0.5px solid rgba(212,175,92,0.3)',
                color: 'var(--gold-bright)',
              }}
            >
              Check your email — we sent a reset link to {email}.
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-[11px] mb-1.5 tracking-wide"
                  style={{ color: 'var(--ink-400)' }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg-elev-2)',
                    border: '0.5px solid rgba(232,226,213,0.15)',
                    color: 'var(--ink-200)',
                  }}
                />
              </div>

              {error && (
                <p className="text-[13px] mb-3 text-center" style={{ color: 'var(--crit)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mb-4"
                style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', border: 'none' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <div
            className="text-center text-[13px] pt-4"
            style={{ color: 'var(--ink-400)', borderTop: '0.5px solid rgba(232,226,213,0.08)' }}
          >
            <Link href="/login" className="font-serif italic" style={{ color: 'var(--gold-bright)' }}>
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
