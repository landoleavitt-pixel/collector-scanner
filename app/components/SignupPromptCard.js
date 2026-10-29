'use client';

// Sign-up prompt shown inside search results (after the 4th card) for
// visitors who aren't signed in. It's triggered by their search, sits in the
// list rather than over it, and "Not now" hides it for the rest of the visit.
// Sign-ups from it are tagged src=prompt for the funnel.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Gift } from 'lucide-react';
import { useUser } from '../../lib/useUser';
import { createClient } from '../../lib/supabaseClient';
import { isNativeApp, signInWithAppleNative } from '../../lib/native';
import { track } from '../../lib/track';
import { PAYMENTS_LIVE } from '../../lib/payments';
import { SIGNUP_BENEFITS } from './SignupBenefits';

const DISMISS_KEY = 'ffSignupPromptDismissed';

export default function SignupPromptCard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [native, setNative] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until we've checked
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNative(isNativeApp());
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1'); } catch { setDismissed(false); }
  }, []);

  if (loading || user || dismissed) return null;

  const notNow = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  async function apple() {
    setError(''); setBusy(true);
    try {
      await signInWithAppleNative(createClient());
      track('signed_up', undefined, 'prompt'); // the server only counts brand-new accounts
      router.refresh();
    } catch (e) {
      if (!/cancel/i.test(e?.message || '')) setError(e?.message || 'Apple sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  const btn = 'inline-flex items-center justify-center rounded-lg text-[12px] tracking-[0.12em] uppercase font-semibold px-4 py-2.5 no-underline';

  return (
    <div
      className="my-4 rounded-xl px-4 md:px-5 py-4"
      style={{ border: '1px solid var(--gold-deep)', background: 'linear-gradient(180deg, rgba(201,149,74,0.06), transparent)' }}
    >
      <div className="flex items-center gap-2.5 text-[15px] font-medium" style={{ color: 'var(--ink-100)' }}>
        <Bell className="w-[18px] h-[18px] flex-none" strokeWidth={1.75} style={{ color: 'var(--gold-bright)' }} aria-hidden="true" />
        Want to know when the next one lists?
      </div>
      <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--ink-400)' }}>
        A free account gets you {SIGNUP_BENEFITS[0][1].charAt(0).toLowerCase() + SIGNUP_BENEFITS[0][1].slice(1)}, a watchlist and bid reminders.
        {!PAYMENTS_LIVE && (
          <span className="inline-flex items-center gap-1 ml-1" style={{ color: 'var(--gold-bright)' }}>
            <Gift className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />Free during early access.
          </span>
        )}
      </p>
      {error && <p className="text-[12px] mt-2" style={{ color: 'var(--crit)' }}>{error}</p>}
      <div className="flex flex-wrap gap-2 mt-3.5">
        {native ? (
          <>
            <button type="button" onClick={apple} disabled={busy} className={btn} style={{ background: 'var(--ink-100)', color: 'var(--bg-base)', opacity: busy ? 0.6 : 1 }}>
              Sign in with Apple
            </button>
            <Link href="/signup?src=prompt" className={btn} style={{ color: 'var(--ink-100)', border: '1px solid rgba(232,226,213,0.2)' }}>
              Continue with email
            </Link>
          </>
        ) : (
          <Link href="/signup?src=prompt" className={btn} style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
            Create free account
          </Link>
        )}
        <button type="button" onClick={notNow} className={btn} style={{ color: 'var(--ink-200)', border: '1px solid rgba(232,226,213,0.2)' }}>
          Not now
        </button>
      </div>
    </div>
  );
}
