'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Seal from './Seal';
import { useUser } from '../../lib/useUser';
import { createClient } from '../../lib/supabaseClient';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="relative z-20 border-b border-[var(--line-soft)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-7 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 group">
          <Seal size={32} />
          <span className="font-display text-2xl md:text-3xl tracking-tight leading-none">
            Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors{' '}
            <em className="text-[var(--gold)] not-italic">Collectors</em>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {/* Existing right-side meta */}
          {isHome ? (
            <div className="hidden md:flex items-center gap-8 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-400)]">
              <span>Issue №&nbsp;001</span>
              <span className="text-[var(--ink-600)]">·</span>
              <span>Est. 2026</span>
            </div>
          ) : (
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
            >
              ← Back to search
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
                      style={{ background: 'var(--gold)', color: '#1a1614' }}
                    >
                      {(user.email?.[0] || '?').toUpperCase()}
                    </span>
                    <span className="hidden sm:inline">Account</span>
                  </button>

                  {menuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 rounded-xl py-2 z-30"
                      style={{
                        background: '#1a1614',
                        border: '0.5px solid rgba(232,226,213,0.12)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div
                        className="px-4 py-3 border-b"
                        style={{ borderColor: 'rgba(232,226,213,0.08)' }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)] mb-0.5">
                          Signed in as
                        </div>
                        <div className="text-[13px] text-[var(--ink-200)] truncate">
                          {user.email}
                        </div>
                      </div>

                      <Link
                        href="/watchlist-cards"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-[13px] text-[var(--ink-300)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors"
                      >
                        Watchlist
                      </Link>
                      <Link
                        href="/watchlist"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-[13px] text-[var(--ink-300)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors"
                      >
                        Saved searches
                      </Link>
                      <Link
                        href="/alerts"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-[13px] text-[var(--ink-300)] hover:text-[var(--gold)] hover:bg-[rgba(212,175,92,0.05)] transition-colors"
                      >
                        Notification settings
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
                    className="hidden sm:inline-block text-[12px] uppercase tracking-[0.22em] px-4 py-2 rounded-full transition-colors"
                    style={{
                      background: 'var(--gold)',
                      color: '#1a1614',
                    }}
                  >
                    Join
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
