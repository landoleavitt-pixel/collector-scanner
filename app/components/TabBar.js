'use client';

// app/components/TabBar.js
//
// iOS app only: a floating pill tab bar (Search · Watchlist · Alerts ·
// Account) at the bottom of the screen. Renders nothing on the website.
//
// The Capacitor web view uses contentInset "always", so the page already
// stops above the home indicator. The bar only needs a small gap from the
// bottom edge, not safe-area padding. Pages get matching bottom padding via
// the html.ff-tabbar class so the last row of content isn't hidden.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isNativeApp } from '../../lib/native';
import { useUser } from '../../lib/useUser';

const ICONS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" />,
  bell: <><path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 004 0" /></>,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5" /></>,
};

export default function TabBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [native, setNative] = useState(false);

  useEffect(() => {
    const on = isNativeApp();
    setNative(on);
    if (on) document.documentElement.classList.add('ff-tabbar');
    return () => document.documentElement.classList.remove('ff-tabbar');
  }, []);

  if (!native) return null;

  // Signed-out visitors land on sign-in for the account-only tabs.
  const gate = (href) => (user ? href : `/login?next=${encodeURIComponent(href)}`);
  // Search goes home on whichever side you're on (Foils & Fables lives at /fables).
  const home = pathname?.startsWith('/fables') ? '/fables' : '/';
  const tabs = [
    { key: 'search', label: 'Search', icon: 'search', href: home, active: pathname === home },
    { key: 'watch', label: 'Watchlist', icon: 'star', href: gate('/watchlist-cards'), active: pathname === '/watchlist-cards' },
    { key: 'alerts', label: 'Alerts', icon: 'bell', href: gate('/watchlist'), active: pathname === '/watchlist' },
    { key: 'account', label: 'Account', icon: 'user', href: user ? null : '/login', active: pathname === '/login' || pathname === '/subscribe' },
  ];

  return (
    <nav
      aria-label="App"
      className="fixed left-3.5 right-3.5 bottom-3 z-[35] grid grid-cols-4 h-[62px] rounded-[22px]"
      style={{
        background: 'rgba(26,22,15,0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid var(--line)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      }}
    >
      {tabs.map((t) => {
        const inner = (
          <>
            <span
              className="w-12 h-[30px] rounded-full grid place-items-center"
              style={{ background: t.active ? 'rgba(201,149,74,0.16)' : 'transparent' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[t.icon]}
              </svg>
            </span>
            <span className="text-[11px] font-medium">{t.label}</span>
          </>
        );
        const cls = 'flex flex-col items-center justify-center gap-1 min-h-[44px]';
        const style = { color: t.active ? 'var(--gold-bright)' : 'var(--ink-400)' };

        // Search on the home route forces a real reload, matching the logo:
        // the results stage lives in React state, so a plain link is a no-op.
        if (t.key === 'search') {
          return (
            <Link
              key={t.key}
              href={home}
              className={cls}
              style={style}
              aria-current={t.active ? 'page' : undefined}
              onClick={(e) => { if (pathname === home) { e.preventDefault(); window.location.assign(home); } }}
            >
              {inner}
            </Link>
          );
        }
        // Signed-in Account opens the existing header account menu.
        if (t.key === 'account' && user) {
          return (
            <button
              key={t.key}
              type="button"
              className={cls}
              style={style}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.dispatchEvent(new Event('ff:open-account'));
              }}
            >
              {inner}
            </button>
          );
        }
        return (
          <Link key={t.key} href={t.href} className={cls} style={style} aria-current={t.active ? 'page' : undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
