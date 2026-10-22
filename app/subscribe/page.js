'use client';

// /subscribe — a thin landing page that opens the Stripe checkout for the
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
import { isNativeApp, getPurchases, purchaseBase, restorePurchases, enablePush } from '../../lib/native';
import Seal from '../components/Seal';

function PlanToggle({ plan, setPlan, prices, native }) {
  const opts = [
    { id: 'annual', label: 'Annual', sub: native ? (prices.annual || '') : '$59 CAD / year', note: 'Over 3 months free' },
    { id: 'monthly', label: 'Monthly', sub: native ? (prices.monthly || '') : '$6.99 CAD / month' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mb-6">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setPlan(o.id)}
          className="min-h-[64px] rounded-lg px-3 py-2 text-center"
          style={{
            background: plan === o.id ? 'rgba(212,175,92,0.12)' : 'transparent',
            border: plan === o.id ? '1px solid #d4af5c' : '0.5px solid rgba(232,226,213,0.15)',
            color: 'var(--ink-200)',
          }}
        >
          <span className="block text-[12px] font-bold uppercase tracking-[0.12em]">{o.label}</span>
          <span className="block text-[13px]" style={{ color: 'var(--ink-400)' }}>{o.sub}</span>
          {o.note && <span className="block text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--gold-bright)' }}>{o.note}</span>}
        </button>
      ))}
    </div>
  );
}

export default function SubscribePage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('checking'); // 'checking' | 'choose' | 'opening' | 'error' | 'app' | 'buying' | 'done'
  const [userId, setUserId] = useState(null);
  const [prices, setPrices] = useState({ monthly: null, annual: null });
  const [plan, setPlan] = useState('annual');
  const price = prices[plan];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        router.replace('/signup?next=/subscribe');
        return;
      }

      // Inside the iOS app Base is sold through Apple in-app purchase —
      // Apple doesn't allow Stripe checkout there.
      if (isNativeApp()) {
        setUserId(session.user.id);
        setStage('app');
        try {
          const Purchases = await getPurchases(session.user.id);
          const { current } = await Purchases.getOfferings();
          const m = current?.monthly || current?.availablePackages?.[0];
          const a = current?.annual;
          if (!cancelled) setPrices({
            monthly: m?.product?.priceString || null,
            annual: a?.product?.priceString || null,
          });
        } catch (e) {
          console.warn('Could not load App Store price:', e?.message);
        }
        return;
      }

      setStage('choose');
    })();

    return () => { cancelled = true; };
  }, [router, supabase]);

  async function handleWebCheckout() {
    setStage('opening');
    setError(null);
    {
      try {
        const res = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();

        if (data?.code === 'ANNUAL_UNAVAILABLE') {
          setPlan('monthly');
          setError('Annual billing is coming soon. Monthly is available now.');
          setStage('choose');
          return;
        }

        if (!res.ok || !data.url) {
          throw new Error(data?.error || 'Could not open checkout');
        }

        // Same-tab navigation (not new tab) — they came here intending to subscribe,
        // so taking them to LS feels right; LS sends them back via redirect_url.
        window.location.assign(data.url);
      } catch (e) {
        setError(e.message);
        setStage('error');
      }
    }
  }

  async function handleBuy() {
    setStage('buying');
    setError(null);
    try {
      const result = await purchaseBase(userId, plan);
      if (result?.cancelled) { setStage('app'); return; }
      if (result?.tier !== 'base') throw new Error('Purchase went through but we could not confirm it yet. Tap Restore purchases in a minute.');
      setStage('done');
      enablePush((path) => router.push(path)).catch(() => {});
    } catch (e) {
      setError(e?.message || 'Purchase failed');
      setStage('app');
    }
  }

  async function handleRestore() {
    setStage('buying');
    setError(null);
    try {
      const result = await restorePurchases(userId);
      if (result?.tier === 'base') {
        setStage('done');
        enablePush((path) => router.push(path)).catch(() => {});
      } else {
        setError('No active subscription found for this Apple ID.');
        setStage('app');
      }
    } catch (e) {
      setError(e?.message || 'Restore failed');
      setStage('app');
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-base)', color: 'var(--ink-200)' }}
    >
      <div className="flex items-center gap-3 mb-10 opacity-70">
        <Seal className="w-6 h-6" />
        <span className="font-serif text-base">Fields &amp; Floors</span>
      </div>

      <div
        className="w-full max-w-[400px] rounded-xl p-8 text-center"
        style={{ background: 'var(--ink-on-gold)', border: '0.5px solid rgba(232,226,213,0.08)' }}
      >
        {(stage === 'app' || stage === 'buying') ? (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--gold-bright)' }}>
              Base Plan
            </p>
            <h1
              className="font-serif italic text-[24px] leading-tight mb-3"
              style={{ color: 'var(--ink-200)' }}
            >
              Get alerted the moment a card lists.
            </h1>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              Save unlimited searches. Get push and email alerts on up to 5 at a time, plus bid reminders.
              14 days free, then {price || 'the listed price'} per {plan === 'annual' ? 'year' : 'month'}.
            </p>
            <PlanToggle plan={plan} setPlan={setPlan} prices={prices} native />
            {error && (
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: 'var(--crit)' }}>{error}</p>
            )}
            <button
              onClick={handleBuy}
              disabled={stage === 'buying'}
              className="w-full min-h-[44px] rounded-lg text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-60"
              style={{
                background: 'var(--gold-bright)',
                color: 'var(--ink-on-gold)',
                border: 'none',
              }}
            >
              {stage === 'buying' ? 'One moment…' : 'Start 14-day free trial'}
            </button>
            <button
              onClick={handleRestore}
              disabled={stage === 'buying'}
              className="block w-full min-h-[40px] py-3 text-[11px] tracking-[0.14em] uppercase disabled:opacity-60"
              style={{ color: 'var(--ink-400)' }}
            >
              Restore purchases
            </button>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--ink-600)' }}>
              Payment is charged to your Apple ID when the trial ends. The subscription
              renews {plan === 'annual' ? 'yearly' : 'monthly'} unless cancelled at least 24 hours before the end of the
              current period. Manage or cancel any time in your App Store account
              settings.{' '}
              <Link href="/terms" style={{ textDecoration: 'underline' }}>Terms</Link>
              {' · '}
              <Link href="/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link>
            </p>
          </>
        ) : stage === 'choose' ? (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--gold-bright)' }}>
              Base Plan
            </p>
            <h1 className="font-serif italic text-[24px] leading-tight mb-3" style={{ color: 'var(--ink-200)' }}>
              Get alerted the moment a card lists.
            </h1>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              Save unlimited searches. Get email alerts on up to 5 at a time, plus bid reminders. 14 days free, cancel anytime.
            </p>
            <PlanToggle plan={plan} setPlan={setPlan} prices={prices} />
            <p className="text-[11px] -mt-4 mb-6" style={{ color: 'var(--ink-600)' }}>Plus applicable taxes.</p>
            {error && (
              <p className="text-[13px] mb-4 leading-relaxed" style={{ color: '#d97757' }}>{error}</p>
            )}
            <button
              onClick={handleWebCheckout}
              className="w-full min-h-[44px] rounded-lg text-[12px] font-bold uppercase tracking-[0.14em]"
              style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', border: 'none' }}
            >
              Start 14-day free trial
            </button>
          </>
        ) : stage === 'done' ? (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--gold-bright)' }}>
              Base Plan
            </p>
            <h1
              className="font-serif italic text-[24px] leading-tight mb-3"
              style={{ color: 'var(--ink-200)' }}
            >
              You're in.
            </h1>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              Turn on alerts for any saved search and we'll notify you the moment a match lists.
            </p>
            <Link
              href="/watchlist"
              className="block w-full min-h-[44px] py-3 rounded-lg text-[12px] font-bold uppercase tracking-[0.14em]"
              style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}
            >
              Go to saved searches
            </Link>
          </>
        ) : stage === 'error' ? (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--crit)' }}>
              Something went wrong
            </p>
            <h1
              className="font-serif italic text-[24px] leading-tight mb-3"
              style={{ color: 'var(--ink-200)' }}
            >
              We couldn't open checkout.
            </h1>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              {error}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full min-h-[44px] rounded-lg text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{
                  background: 'var(--gold-bright)',
                  color: 'var(--ink-on-gold)',
                  border: 'none',
                }}
              >
                Try again
              </button>
              <Link
                href="/pricing"
                className="block w-full min-h-[40px] py-3 text-[11px] tracking-[0.14em] uppercase"
                style={{ color: 'var(--ink-400)' }}
              >
                Back to pricing
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--gold-bright)' }}>
              Base Plan
            </p>
            <h1
              className="font-serif italic text-[24px] leading-tight mb-3"
              style={{ color: 'var(--ink-200)' }}
            >
              Opening secure checkout…
            </h1>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              You'll be redirected to secure checkout to start your 14-day free trial.
              One moment.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
