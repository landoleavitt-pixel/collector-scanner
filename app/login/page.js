'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import Seal from '../components/Seal';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handlePasswordSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicLinkSent(true);
  }

  async function handleOAuth(provider) {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0f0c0a' }}>
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-6 pt-8 opacity-70">
        <Seal className="w-6 h-6" />
        <span className="font-serif text-base" style={{ color: '#e8e2d5' }}>
          Fields &amp; Floors
        </span>
        <span className="ml-auto text-[10px] tracking-[0.12em] uppercase" style={{ color: '#6e675b' }}>
          Issue 001 · Est 2026
        </span>
      </div>

      {/* Centered card */}
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
            Welcome back.
          </h1>
          <p className="text-[13px] text-center mb-6" style={{ color: '#8a8275' }}>
            Sign in to view your saved searches.
          </p>

          {magicLinkSent ? (
            <div
              className="rounded-lg p-4 text-[13px] text-center"
              style={{
                background: '#221d1a',
                border: '0.5px solid rgba(212,175,92,0.3)',
                color: '#d4af5c',
              }}
            >
              Check your email — we sent a sign-in link to {email}.
            </div>
          ) : (
            <>
              {/* OAuth primary */}
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm mb-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  background: 'transparent',
                  border: '0.5px solid rgba(232,226,213,0.22)',
                  color: '#e8e2d5',
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
              {/* Apple sign-in temporarily hidden until the Apple Developer
                  account + Services ID are configured. Re-enable by uncommenting. */}
              {false && (
              <button
                type="button"
                onClick={() => handleOAuth('apple')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm mb-4 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  background: 'transparent',
                  border: '0.5px solid rgba(232,226,213,0.22)',
                  color: '#e8e2d5',
                }}
              >
                <AppleIcon />
                Continue with Apple
              </button>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(232,226,213,0.12)' }} />
                <span className="text-[11px] tracking-[0.08em] uppercase" style={{ color: '#8a8275' }}>
                  or
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(232,226,213,0.12)' }} />
              </div>

              {/* Email + password */}
              <form onSubmit={handlePasswordSignIn}>
                <div className="mb-2.5">
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

                <div className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <label htmlFor="password" className="text-[11px] tracking-wide" style={{ color: '#8a8275' }}>
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-serif italic"
                      style={{ color: '#d4af5c' }}
                    >
                      Forgot?
                    </Link>
                  </div>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-100"
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
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* Magic link option */}
              <div className="text-center text-[12px] mb-4" style={{ color: '#8a8275' }}>
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading}
                  className="font-serif italic transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ color: '#c4a558', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Email me a sign-in link instead →
                </button>
              </div>
            </>
          )}

          <div
            className="text-center text-[12px] pt-4"
            style={{ color: '#8a8275', borderTop: '0.5px solid rgba(232,226,213,0.08)' }}
          >
            New here?{' '}
            <Link href="/signup" className="font-serif italic" style={{ color: '#d4af5c' }}>
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
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
