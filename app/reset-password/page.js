'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import Seal from '../components/Seal';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchanging, setExchanging] = useState(true);
  const [exchangeFailed, setExchangeFailed] = useState(false);

  // On mount: if there's a ?code= in the URL, exchange it for a session.
  // This is what the reset link in the email contains. After exchange the
  // user has a temporary authenticated session and can set a new password.
  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      // No code in URL — they might already have a session (e.g., refreshed
      // the page). Verify by checking the user.
      supabase.auth.getUser().then(({ data, error }) => {
        if (error || !data.user) {
          setExchangeFailed(true);
        }
        setExchanging(false);
      });
      return;
    }

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setExchangeFailed(true);
      } else {
        // Strip the code from the URL so refreshes don't try to reuse it
        router.replace('/reset-password', { scroll: false });
      }
      setExchanging(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpdate(e) {
    e.preventDefault();
    setError('');

    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
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
          {exchanging ? (
            <p className="text-center text-[13px]" style={{ color: '#8a8275' }}>
              Verifying your reset link…
            </p>
          ) : exchangeFailed ? (
            <>
              <h1
                className="font-serif italic text-[26px] leading-tight text-center mb-1"
                style={{ color: '#e8e2d5' }}
              >
                Reset link expired.
              </h1>
              <p className="text-[13px] text-center mb-6" style={{ color: '#8a8275' }}>
                Request a fresh one to continue.
              </p>
              <a
                href="/forgot-password"
                className="block w-full py-3 rounded-lg text-sm font-medium text-center transition-opacity hover:opacity-90"
                style={{ background: '#d4af5c', color: '#1a1614', textDecoration: 'none' }}
              >
                Request new link
              </a>
            </>
          ) : (
            <>
              <h1
                className="font-serif italic text-[26px] leading-tight text-center mb-1"
                style={{ color: '#e8e2d5' }}
              >
                Set a new password.
              </h1>
              <p className="text-[13px] text-center mb-6" style={{ color: '#8a8275' }}>
                Choose something at least ten characters long.
              </p>

              <form onSubmit={handleUpdate}>
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="block text-[11px] mb-1.5 tracking-wide"
                    style={{ color: '#8a8275' }}
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm focus:outline-none"
                      style={{
                        background: '#221d1a',
                        border: '0.5px solid rgba(232,226,213,0.15)',
                        color: '#e8e2d5',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: 'none', border: 'none', color: '#8a8275', cursor: 'pointer', padding: 0, lineHeight: 0 }}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] mb-3 text-center" style={{ color: '#d97757' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mb-3"
                  style={{ background: '#d4af5c', color: '#1a1614', border: 'none' }}
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>

              <div
                className="text-center text-[12px] pt-4"
                style={{ color: '#8a8275', borderTop: '0.5px solid rgba(232,226,213,0.08)' }}
              >
                You'll be signed in once it's saved.
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
