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
    <main className="min-h-screen flex flex-col" style={{ background: '#0f0c0a' }}>
      <div className="flex items-center gap-3 px-6 pt-8 opacity-70">
        <Seal className="w-6 h-6" />
        <span className="font-serif text-base" style={{ color: '#e8e2d5' }}>
          Fields &amp; Floors
        </span>
        <span className="ml-auto text-[10px] tracking-[0.12em] uppercase" style={{ color: '#6e675b' }}>
          Issue 001 · Est 2026
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          className="w-full max-w-[400px] rounded-2xl p-9"
          style={{
            background: '#1a1614',
            border: '0.5px solid rgba(232,226,213,0.08)',
            color: '#e8e2d5',
          }}
        >
          <h1
            className="font-serif italic text-[26px] leading-tight text-center mb-1"
            style={{ color: '#e8e2d5' }}
          >
            Reset your password.
          </h1>
          <p className="text-[13px] text-center mb-6" style={{ color: '#8a8275' }}>
            Enter your email and we'll send a reset link.
          </p>

          {resetSent ? (
            <div
              className="rounded-lg p-4 text-[13px] text-center"
              style={{
                background: '#221d1a',
                border: '0.5px solid rgba(212,175,92,0.3)',
                color: '#d4af5c',
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
                  style={{ color: '#8a8275' }}
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
                    background: '#221d1a',
                    border: '0.5px solid rgba(232,226,213,0.15)',
                    color: '#e8e2d5',
                  }}
                />
              </div>

              {error && (
                <p className="text-[12px] mb-3 text-center" style={{ color: '#d97757' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mb-4"
                style={{ background: '#d4af5c', color: '#1a1614', border: 'none' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <div
            className="text-center text-[12px] pt-4"
            style={{ color: '#8a8275', borderTop: '0.5px solid rgba(232,226,213,0.08)' }}
          >
            <Link href="/login" className="font-serif italic" style={{ color: '#d4af5c' }}>
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
