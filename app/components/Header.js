'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Seal from './Seal';

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header className="relative z-20 border-b border-[var(--line-soft)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Seal />
          <span className="font-display text-xl tracking-tight leading-none">
            Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors{' '}
            <em className="text-[var(--gold)] not-italic">Collectors</em>
          </span>
        </Link>

        {isHome ? (
          <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)]">
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
      </div>
    </header>
  );
}
