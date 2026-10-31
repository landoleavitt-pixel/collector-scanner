'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Seal from './Seal';
import SideSwitch from './SideSwitch';
import { useUser } from '../../lib/useUser';
import { createClient } from '../../lib/supabaseClient';
import { isNativeApp, unregisterPush, openAppleSubscriptions } from '../../lib/native';
import { ArrowLeft } from 'lucide-react';
import { PAYMENTS_LIVE } from '../../lib/payments';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const isFables = pathname?.startsWith('/fables');
  const { user, loading } = useUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    const openFromTabBar = () => setMenuOpen(true);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('ff:open-account', openFromTabBar);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('ff:open-account', openFromTabBar);
    };
  }, []);

  // Tier for the Plan row. Fetched once per mount; the header is the only
  // place it's shown, so a missing value just hides the badge rather than
  // blocking anything.
  const [tier, setTier] = useState(null);
  const [billingSource, setBillingSource] = useState(null);
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  useEffect(() => {
    if (!user) { setTier(null); setBillingSource(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('tier, is_founding_member, billing_source')
          .eq('id', user.id)
          .single();
        if (cancelled) return;
        setTier(data?.is_founding_member ? 'founding' : (data?.tier || 'free'));
        setBillingSource(data?.billing_source || null);
      } catch {
        if (!cancelled) setTier(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const [portalBusy, setPortalBusy] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  async function handleSignOut() {
    await unregisterPush();
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  // Manage membership and billing history both open Stripe's hosted portal —
  // it covers payment method, plan changes, cancellation and invoices in one
  // place, so there's nothing to build or keep in sync on our side.
  async function openPortal() {
    if (portalBusy) return;
    setPortalBusy(true);
    // iOS app: Apple manages its own subscriptions; free users go to the
    // in-app purchase page. Stripe's portal is never opened inside the app.
    if (native) {
      try {
        if (billingSource === 'apple') await openAppleSubscriptions(user.id);
        else router.push('/subscribe');
      } catch {
        window.location.assign('https://apps.apple.com/account/subscriptions');
      } finally {
        setMenuOpen(false);
        setPortalBusy(false);
      }
      return;
    }
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      // No subscription yet → send them to the plans instead of erroring.
      router.push('/pricing');
      setMenuOpen(false);
    } catch {
      router.push('/pricing');
      setMenuOpen(false);
    } finally {
      setPortalBusy(false);
    }
  }

  const TIER_LABEL = { base: 'Base', founding: 'Founding', free: 'Free' };

  return (
    <header className="relative z-20 border-b border-[var(--line-soft)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-7 flex items-center justify-between">
        <div className="flex items-center gap-5 min-w-0">
        {isFables ? (
          <Link href="/fables" className="flex items-center gap-3 group" onClick={(e) => {
            // Same as the sports logo: always back to a fresh search.
            if (pathname === '/fables') { e.preventDefault(); window.location.assign('/fables'); }
          }}>
            <span className="w-8 h-8 rounded-full grid place-items-center font-display italic text-[15px] ff-foil-edge" style={{ color: 'var(--gold)' }} aria-hidden="true">F</span>
            <span className="font-display text-2xl md:text-3xl tracking-tight leading-none">
              Foils <em className="ff-foil-text not-italic">&amp;</em> Fables
            </span>
          </Link>
        ) : (
        <Link
          href="/"
          className="flex items-center gap-4 group"
          onClick={(e) => {
            // Already on the home route? Next's router treats this as a no-op,
            // so the search results stay on screen — the stage lives in React
            // state, not the URL. Force a real navigation so the brand always
            // means "back to a fresh search", which is what people expect from
            // a logo.
            if (pathname === '/') {
              e.preventDefault();
              window.location.assign('/');
            }
          }}
        >
          <span data-ff-seal className="inline-flex">
            <Seal size={32} />
          </span>
          <span className="font-display text-2xl md:text-3xl tracking-tight leading-none">
            <span data-ff-brand className="inline-block">
              Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors
            </span>{' '}
            <em data-ff-collectors className="text-[var(--gold)] not-italic">Collectors</em>
          </span>
        </Link>
        )}
        <SideSwitch fables={isFables} className="hidden lg:inline-flex" />
        </div>

        <div className="flex items-center gap-6">
          {/* Primary nav. These three are the whole product for a signed-in
              user, so they live on the bar rather than behind the account
              menu — one click from any page. Hidden for anonymous visitors
              because every destination would just bounce them to login. */}
          {user ? (
            !native && <nav className="hidden md:flex items-center gap-7">
              {[
                { href: '/watchlist-cards', label: 'Watchlist' },
                { href: '/watchlist', label: 'Saved searches' },
                { href: '/alerts', label: 'Alerts' },
              ].map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative py-1 text-[11px] uppercase tracking-[0.2em] transition-colors"
                    style={{ color: active ? 'var(--gold-bright)' : 'var(--ink-400)' }}
                  >
                    {item.label}
                    {active && (
                      <span
                        className="absolute left-0 right-0 -bottom-0.5"
                        style={{ height: 1, background: 'var(--gold)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : isHome ? (
            // Plain wayfinding for first-time visitors. Hidden in the iOS
            // app, which keeps its header free of nav links.
            !native && (
              <nav data-ff-home-nav className="hidden md:flex items-center gap-7 text-[11px] uppercase tracking-[0.2em]">
                {[
                  { href: '#why', label: 'How it works' },
                  { href: '/pricing', label: 'Pricing' },
                ].filter((item) => PAYMENTS_LIVE || item.href !== '/pricing').map((item) => (
                  <Link
                    key={item.href}
                    href={item.href === '#why' ? '/how-it-works' : item.href}
                    onClick={(e) => {
                      // "How it works" scrolls to that section on the home
                      // page; if it isn't there, the link opens the full page.
                      if (item.href !== '#why') return;
                      const el = document.getElementById('why');
                      if (!el) return;
                      e.preventDefault();
                      el.scrollIntoView({ block: 'start' });
                    }}
                    className="py-1 text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )
          ) : isFables ? null : (
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
            >
              <ArrowLeft className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />Back to search
            </Link>
          )}

          {/* Auth state */}
          {!loading && (
            <>
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] uppercase tracking-[0.18em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
                    style={{ border: '0.5px solid var(--line-soft)' }}
                    aria-label="Account menu"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-display"
                      style={{ background: 'var(--gold)', color: 'var(--ink-on-gold)' }}
                    >
                      {(user.email?.[0] || '?').toUpperCase()}
                    </span>
                    <span className="hidden sm:inline">Account</span>
                  </button>

                  {menuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 rounded-xl py-2 z-30"
                      style={{
                        background: 'var(--ink-on-gold)',
                        border: '0.5px solid rgba(232,226,213,0.12)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div
                        className="px-4 py-3 border-b"
                        style={{ borderColor: 'rgba(232,226,213,0.08)' }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-400)] mb-0.5">
                          Signed in as
                        </div>
                        <div className="text-[13px] text-[var(--ink-200)] truncate">
                          {user.email}
                        </div>
                      </div>

                      {/* Nav moved to the bar — this menu now holds only the
                          things that are genuinely about the account. */}
                      <div className="flex items-center justify-between px-4 py-2 text-[13px] text-[var(--ink-400)]">
                        <span>Plan</span>
                        {tier && (
                          <span
                            className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded"
                            style={{
                              color: 'var(--gold-bright)',
                              border: '0.5px solid var(--gold-deep)',
                            }}
                          >
                            {TIER_LABEL[tier] || tier}
                          </span>
                        )}
                      </div>
                      {!(native && billingSource === 'stripe' && tier !== 'free') && (PAYMENTS_LIVE || (tier && tier !== 'free')) && (
                      <button
                        onClick={openPortal}
                        disabled={portalBusy}
                        className="w-full text-left px-4 py-2 text-[13px] text-[var(--ink-400)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors disabled:opacity-60"
                      >
                        Manage membership
                      </button>
                      )}
                      {!native && (PAYMENTS_LIVE || (tier && tier !== 'free')) && (
                      <button
                        onClick={openPortal}
                        disabled={portalBusy}
                        className="w-full text-left px-4 py-2 text-[13px] text-[var(--ink-400)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors disabled:opacity-60"
                      >
                        Billing history
                      </button>
                      )}

                      <Link
                        href="/?tour=1"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-[13px] text-[var(--ink-400)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors"
                      >
                        Take the tour
                      </Link>
                      <div
                        className="border-t mt-1"
                        style={{ borderColor: 'rgba(232,226,213,0.08)' }}
                      >
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-[13px] text-[var(--ink-400)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors"
                        >
                          Sign out
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setCloseOpen(true); }}
                          className="w-full text-left px-4 py-2 text-[13px] transition-colors"
                          style={{ color: 'var(--ink-600)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--crit)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-600)'; }}
                        >
                          Close account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/login"
                    className="text-[12px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden sm:inline-block text-[11px] uppercase tracking-[0.2em] font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90"
                    style={{
                      background: 'var(--gold-bright)',
                      color: 'var(--ink-on-gold)',
                    }}
                  >
                    Get alerts
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Side switch on smaller screens: its own row, never hidden in a menu. */}
      <div className="lg:hidden flex justify-center px-4 pb-3 -mt-3">
        <SideSwitch fables={isFables} />
      </div>

      {/* Mobile nav — a scrollable pill row rather than a hamburger. Three
          destinations don't justify hiding them behind an extra tap. */}
      {user && !native && (
        <div className="md:hidden flex gap-2 overflow-x-auto px-6 pb-3 -mt-2">
          {[
            { href: '/watchlist-cards', label: 'Watchlist' },
            { href: '/watchlist', label: 'Saved searches' },
            { href: '/alerts', label: 'Alerts' },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-none rounded-full px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors"
                style={{
                  color: active ? 'var(--gold-bright)' : 'var(--ink-400)',
                  border: `0.5px solid ${active ? 'var(--gold-deep)' : 'var(--line)'}`,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {closeOpen && (
        <CloseAccountDialog
          onClose={() => setCloseOpen(false)}
          appleBilled={billingSource === 'apple' && tier !== 'free'}
        />
      )}
    </header>
  );
}

/* CloseAccountDialog — deliberate friction in front of an irreversible action.
 *
 * Requires typing the exact phrase rather than clicking a second button:
 * a confirm-button dialog is dismissed reflexively, but typing forces the
 * person to read what they're agreeing to. The same phrase is checked again
 * server-side, so the dialog is a UX guard rather than the security boundary.
 */
function CloseAccountDialog({ onClose, appleBilled }) {
  const CONFIRM = 'DELETE MY ACCOUNT';
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (typed !== CONFIRM || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not close your account.');
        setBusy(false);
        return;
      }
      // Sign out locally and go home — the server session is already gone.
      await unregisterPush();
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
      window.location.assign('/');
    } catch {
      setError('Could not close your account.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-xl p-6"
        style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display italic text-[24px] mb-3" style={{ color: 'var(--ink-100)' }}>
          Close your account?
        </h2>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--ink-400)' }}>
          This cancels any active subscription and permanently deletes your
          watchlist, saved searches, and profile. It can&rsquo;t be undone.
        </p>
        {appleBilled && (
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--gold-bright)' }}>
            Your subscription is billed by Apple, so we can&rsquo;t cancel it for you.
            Cancel it in Settings &gt; your name &gt; Subscriptions, or you&rsquo;ll keep being charged.
          </p>
        )}
        <label
          className="block text-[11px] uppercase tracking-[0.16em] mb-2"
          style={{ color: 'var(--ink-600)' }}
        >
          Type <span style={{ color: 'var(--crit)' }}>{CONFIRM}</span> to confirm
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="w-full px-3 py-2.5 rounded-lg text-[14px] mb-4 outline-none"
          style={{
            background: 'var(--bg-base)',
            border: '0.5px solid var(--line)',
            color: 'var(--ink-100)',
          }}
        />
        {error && (
          <div className="text-[13px] mb-3" style={{ color: 'var(--crit)' }}>
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.16em] disabled:opacity-60"
            style={{ border: '0.5px solid var(--line)', color: 'var(--ink-400)', background: 'transparent' }}
          >
            Keep my account
          </button>
          <button
            onClick={handleDelete}
            disabled={typed !== CONFIRM || busy}
            className="px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
            style={{ background: 'var(--crit)', color: 'var(--ink-on-gold)', border: 'none' }}
          >
            {busy ? 'Closing…' : 'Close account'}
          </button>
        </div>
      </div>
    </div>
  );
}
