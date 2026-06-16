import Link from 'next/link';
import Seal from './Seal';
import { PRODUCT_LINKS, HOBBY_LINKS } from './navLinks';

function FilterLabel({ children }) {
  return (
    <h3 className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-4">
      {children}
    </h3>
  );
}

function NavList({ links }) {
  return (
    <ul className="space-y-2 text-sm text-[var(--ink-200)]">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="hover:text-[var(--gold)] transition-colors"
          >
            {link.label}
            {link.badge && (
              <span className="text-[var(--ink-600)] text-[10px] uppercase tracking-wider ml-2">
                {link.badge}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group w-fit">
              <Seal size={20} />
              <span className="font-display text-lg">
                Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors Collectors
              </span>
            </Link>
            <p className="text-sm text-[var(--ink-400)] max-w-xs leading-relaxed">
              A search instrument for serious collectors. Built for the hobby, not the algorithm.
            </p>
          </div>
          <div>
            <FilterLabel>Product</FilterLabel>
            <NavList links={PRODUCT_LINKS} />
          </div>
          <div>
            <FilterLabel>Hobby</FilterLabel>
            <NavList links={HOBBY_LINKS} />
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-8 border-t border-[var(--line-soft)] text-[10px] uppercase tracking-[0.22em] text-[var(--ink-600)]">
          <div className="flex gap-6">
            <span>Est. 2026</span>
            <span>Issue №&nbsp;001</span>
          </div>
          <div className="flex gap-6 items-center flex-wrap">
            <Link href="/contact" className="hover:text-[var(--gold)] transition-colors">Support</Link>
            <Link href="/privacy" className="hover:text-[var(--gold)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--gold)] transition-colors">Terms</Link>
            <span>Listing data via eBay — not affiliated with eBay Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
