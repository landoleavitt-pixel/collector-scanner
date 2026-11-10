'use client';

// The sign-up ask when a signed-out visitor taps "Save this search", on both
// sides. Everyone comes back to the same search afterwards (returnPath).
// Web: Google + email, and Apple only once NEXT_PUBLIC_APPLE_WEB=1. iOS app: Google blocks sign-in inside app web
// views, so native Apple + email only; native Apple signs in without leaving.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X } from 'lucide-react';
import { isNativeApp } from '../../../lib/native';
import { track } from '../../../lib/track';

const APPLE_ON_WEB = process.env.NEXT_PUBLIC_APPLE_WEB === '1';
export default function SaveSearchPrompt({ query, returnPath, onClose }) {
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef(null);
  const showApple = native || APPLE_ON_WEB;
  useEffect(() => {
    setNative(isNativeApp());
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function continueWith(provider) {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const { createClient } = await import('../../../lib/supabaseClient');
      const supabase = createClient();
      if (native && provider === 'apple') {
        const { signInWithAppleNative } = await import('../../../lib/native');
        await signInWithAppleNative(supabase);
        track('signed_up', undefined, 'alert'); // server only counts brand-new accounts
        window.location.assign(returnPath);
        return;
      }
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath)}&src=alert` },
      });
      if (oauthError) throw oauthError;
    } catch (e) {
      // Closing Apple's sheet isn't an error worth showing.
      if (!/cancel/i.test(e?.message || '')) setError('Sign-in didn’t go through. Try again, or use email.');
      setBusy(false);
    }
  }

  const btn = 'w-full h-11 rounded-lg flex items-center justify-center gap-2 text-meta font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="save-search-title" className="relative w-full max-w-[400px] rounded-xl p-6"
           style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--gold-deep)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
           onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-400)] hover:text-[var(--ink-100)]">
          <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="font-mono text-fine" style={{ color: 'var(--gold)' }}>Free account</div>
        <h2 id="save-search-title" className="font-display italic text-price leading-tight mt-2">Save this search</h2>
        {query && <p className="mt-2 text-meta leading-snug line-clamp-2" style={{ color: 'var(--ink-200)' }}>{query}</p>}
        <p className="mt-2 text-meta leading-relaxed" style={{ color: 'var(--ink-400)' }}>
          We’ll email you when a new match lists, and bring you right back here. No credit card.
        </p>
        <div className="mt-5 grid gap-2">
          {showApple && (
            <button type="button" disabled={busy} onClick={() => continueWith('apple')} className={btn} style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
              Continue with Apple
            </button>
          )}
          {!native && (
            <button type="button" disabled={busy} onClick={() => continueWith('google')} className={btn} style={showApple ? { background: 'transparent', color: 'var(--ink-100)', border: '0.5px solid var(--ink-600)' } : { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
              Continue with Google
            </button>
          )}
          <Link href={`/signup?next=${encodeURIComponent(returnPath)}&src=alert`} className={btn} style={{ background: 'transparent', color: 'var(--ink-200)', border: '0.5px solid var(--line)' }}>
            Use email instead
          </Link>
        </div>
        {error && <p className="mt-3 text-meta text-[var(--crit)]">{error}</p>}
        <p className="mt-4 text-fine text-center" style={{ color: 'var(--ink-600)' }}>
          Already have an account?{' '}
          <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="underline underline-offset-2 hover:text-[var(--gold-bright)]">Sign in</Link>
        </p>
      </div>
    </div>,
    document.body,
  );
}
