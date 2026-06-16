'use client';

// /subscribe — a thin landing page that opens the Lemon Squeezy checkout for the
// authenticated user. The pricing CTA routes here after signup so the path from
// "I want to subscribe" to "checkout open" is one redirect, not four manual steps.
//
// Flow on this page:
//   1. On mount, confirm the user is signed in (middleware should have already
//      done this, but we double-check on the client to handle edge cases).
//   2. POST /api/create-checkout to mint a unique LS checkout URL with the
//      user's Supabase ID embedded as custom_data (so the webhook can resolve
//      them when the subscription_created event fires).
//   3. Redirect the browser to that URL.
//
// On error, surface a friendly message with a back-to-pricing link. Never blank.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import Seal from '../components/Seal';

export default function SubscribePage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('checking'); // 'checking' | 'opening' | 'error'

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        router.replace('/signup?next=/subscribe');
        return;
      }

      setStage('opening');

      try {
        const res = await fetch('/api/create-checkout', { method: 'POST' });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data.url) {
          throw new Error(data?.error || 'Could not open checkout');
        }

        // Same-tab navigation (not new tab) — they came here intending to subscribe,
        // so taking them to LS feels right; LS sends them back via redirect_url.
        window.location.assign(data.url);
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
        setStage('error');
      }
    })();

    return () => { cancelled = true; };
  }, [router, supabase]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0f0c0a', color: '#e8e2d5' }}
    >
      <div className="flex items-center gap-3 mb-10 opacity-70">
        <Seal className="w-6 h-6" />
        <span className="font-serif text-base">Fields &amp; Floors</span>
      </div>

      <div
        className="w-full max-w-[400px] rounded-2xl p-8 text-center"
        style={{ background: '#1a1614', border: '0.5px solid rgba(232,226,213,0.08)' }}
      >
        {stage === 'error' ? (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: '#d97757' }}>
              Something went wrong
            </p>
            <h1
              className="font-serif italic text-[24px] leading-tight mb-3"
              style={{ color: '#e8e2d5' }}
            >
              We couldn't open checkout.
            </h1>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: '#8a8275' }}>
              {error}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full min-h-[44px] rounded-[8px] text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{
                  background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
                  color: '#1a1612',
                  border: 'none',
                }}
              >
                Try again
              </button>
              <Link
                href="/pricing"
                className="block w-full min-h-[40px] py-3 text-[11px] tracking-[0.14em] uppercase"
                style={{ color: '#8a8275' }}
              >
                Back to pricing
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: '#d4af5c' }}>
              Base Plan
            </p>
            <h1
              className="font-serif italic text-[24px] leading-tight mb-3"
              style={{ color: '#e8e2d5' }}
            >
              Opening secure checkout…
            </h1>
            <p className="text-[13px] leading-relaxed" style={{ color: '#8a8275' }}>
              You'll be redirected to Lemon Squeezy to start your 14-day free trial.
              Hang tight — should be a second.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
