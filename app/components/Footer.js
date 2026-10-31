import Link from 'next/link';
import Seal from './Seal';
import { PRODUCT_LINKS, HOBBY_LINKS } from './navLinks';
import { TourLink } from './SiteTour';
import { PAYMENTS_LIVE } from '../../lib/payments';

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
    <footer data-ff-footer className="relative z-10 mt-24 border-t border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16">
        <div data-ff-footer-main className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/fables" data-fables-only className="flex items-center gap-3 mb-4 group w-fit">
              <span className="font-display text-lg">Foils <em className="ff-foil-text not-italic">&amp;</em> Fables</span>
            </Link>
            <p data-fables-only className="text-sm text-[var(--ink-400)] max-w-xs leading-relaxed">
              Search trading card listings on eBay by rarity, language and grade, rarest first.
            </p>
            <Link href="/" data-sports-only className="flex items-center gap-3 mb-4 group w-fit">
              <Seal size={20} />
              <span className="font-display text-lg">
                Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors Collectors
              </span>
            </Link>
            <p data-sports-only className="text-sm text-[var(--ink-400)] max-w-xs leading-relaxed">
              Search every numbered sports card on eBay by print run, autograph and price.
            </p>
          </div>
          <div>
            <FilterLabel>Product</FilterLabel>
            <NavList links={PAYMENTS_LIVE ? PRODUCT_LINKS : PRODUCT_LINKS.filter((l) => l.href !== '/pricing')} />
          </div>
          <div>
            <FilterLabel>Hobby</FilterLabel>
            <NavList links={HOBBY_LINKS} />
          </div>
        </div>
        <div data-ff-footer-legal className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-8 border-t border-[var(--line-soft)] text-[12px] text-[var(--ink-600)]">
          <div><span data-sports-only>© 2026 Fields &amp; Floors</span><span data-fables-only>© 2026 Foils &amp; Fables, a Fields &amp; Floors site</span></div>
          <div className="flex gap-6 items-center flex-wrap">
            <TourLink className="hover:text-[var(--gold)] transition-colors">Site tour</TourLink>
            <Link href="/contact" className="hover:text-[var(--gold)] transition-colors">Support</Link>
            <Link href="/privacy" className="hover:text-[var(--gold)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--gold)] transition-colors">Terms</Link>
            <span>A search tool only. Purchases happen on eBay between you and the seller. Listing data via eBay. <span data-sports-only>Not affiliated with eBay Inc.</span><span data-fables-only>Not affiliated with eBay or any game publisher.</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
