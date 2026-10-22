import Link from 'next/link';
import EarlyAccessBanner from './EarlyAccessBanner';
import { Check, Plus } from 'lucide-react';

export const metadata = {
  title: 'Pricing',
  description:
    'Searching is always free. Turn on alerts for your saved searches with a 14-day free trial of Base, then $6.99 CAD a month.',
};

/* Single tier card. `hero` = the paid plan we want most visible.
   `soon` = greyed future tier: one "Coming soon" (the ribbon), no price, no button. */
function Tier({ name, tagline, price, per, cta, fineprint, features, hero = false, soon = false, ribbon }) {
  const cardStyle = hero
    ? { border: '2px solid var(--gold-bright)', background: '#1d1710', boxShadow: '0 0 48px -10px rgba(230,185,107,0.45)' }
    : { border: '1px solid var(--line)', background: soon ? '#100e0a' : 'var(--bg-elev)' };

  return (
    <div className={`relative flex flex-col rounded p-6 lg:p-7 ${hero ? 'lg:-translate-y-2' : ''}`} style={cardStyle}>
      {ribbon && (
        <span
          className="absolute top-0 left-6 -translate-y-1/2 text-[10px] uppercase tracking-[0.16em] px-[11px] py-[5px] rounded"
          style={
            hero
              ? { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', fontWeight: 700 }
              : { background: 'var(--bg-elev-2)', color: 'var(--ink-400)', border: '1px solid var(--line)', fontWeight: 600 }
          }
        >
          {ribbon}
        </span>
      )}

      <div className="font-display italic text-[26px] leading-none mb-1.5" style={{ color: hero ? '#ffe6a8' : 'var(--ink-100)' }}>
        {name}
      </div>
      <p className="text-[13px] leading-snug min-h-[34px]" style={{ color: hero ? '#d8c9a4' : 'var(--ink-400)' }}>
        {tagline}
      </p>

      <div className="flex items-baseline gap-1.5 mt-4 mb-0.5">
        {soon ? (
          <span className="font-display text-2xl leading-none" style={{ color: 'var(--ink-600)' }}>—</span>
        ) : (
          <>
            <span className="font-display leading-none" style={{ color: hero ? '#ffe6a8' : 'var(--ink-100)', fontSize: hero ? 52 : 44 }}>
              {price}
            </span>
            <span className="text-xs" style={{ color: 'var(--ink-400)', letterSpacing: '0.04em' }}>{per}</span>
          </>
        )}
      </div>

      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 w-full text-center rounded-lg uppercase tracking-[0.12em] flex items-center justify-center transition-[filter] hover:brightness-105"
          style={
            hero
              ? { minHeight: 54, background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', fontWeight: 700, fontSize: 13, boxShadow: '0 8px 24px -10px rgba(217,156,20,0.6)' }
              : { minHeight: 48, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-200)', fontWeight: 600, fontSize: 13 }
          }
        >
          {cta.label}
        </Link>
      ) : (
        <div style={{ minHeight: 48 }} className="mt-4" />
      )}

      <p className="text-[11px] text-center mt-2 mb-4 min-h-[14px]" style={{ color: hero ? 'var(--ink-400)' : 'var(--ink-600)' }}>
        {fineprint || '\u00a0'}
      </p>

      <ul className="list-none p-0 m-0 pt-4 space-y-[11px]" style={{ borderTop: '1px solid var(--line-soft)' }}>
        {features.map((f, i) => (
          <li key={i} className="flex gap-2.5 items-start text-[13px] leading-snug" style={{ color: f.muted ? '#8a8071' : 'var(--ink-200)' }}>
            <span className="flex-none mt-px font-bold" style={{ color: f.muted ? 'var(--gold-deep)' : 'var(--gold-bright)' }}>
              {f.muted ? <Plus className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" /> : <Check className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />}
            </span>
            <span>{f.node}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="relative min-h-screen z-10">
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-16">
        {/* Header — mirrors PageShell's eyebrow/title/lede styling */}
        <header className="text-center mb-12 lg:mb-16">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mb-6 rise" style={{ animationDelay: '0ms' }}>
            Pricing
          </p>
          <h1 className="font-display text-5xl lg:text-6xl leading-[1.05] tracking-tight text-balance rise" style={{ animationDelay: '80ms' }}>
            Searching is always <em className="italic text-[var(--gold-bright)]">free.</em>
          </h1>
          <p className="mt-6 text-lg text-[var(--ink-200)] leading-relaxed max-w-[56ch] mx-auto text-pretty rise" style={{ animationDelay: '160ms' }}>
            Search every numbered, autographed and rookie card on eBay for free. Alerts start at $6.99 a month.
          </p>
        </header>

        {/* Same three plans as the home page: Free · Base (raised) · Premium (coming soon) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch rise" style={{ animationDelay: '240ms' }}>
          <Tier
            name="Free"
            tagline="Everything you need to hunt, by hand."
            price="$0"
            per="forever"
            cta={{ label: 'Start free', href: '/signup' }}
            fineprint="No account needed to search"
            features={[
              { node: 'Unlimited search' },
              { node: 'All filters & print-run tiers' },
              { node: 'Watchlist & sold tracking' },
              { node: 'Unlimited saved searches' },
              { node: 'Alerts on 1 saved search' },
            ]}
          />
          <Tier
            hero
            ribbon="14-day free trial"
            name="Base"
            tagline="Email alerts on up to 5 saved searches."
            price="$6.99"
            per="/ month"
            cta={{ label: 'Start 14-day free trial', href: '/signup?next=/subscribe' }}
            fineprint="or $59/yr, over 3 months free · 14-day free trial"
            features={[
              { node: 'Everything in Free' },
              { node: <>Alerts on up to <b className="text-[var(--ink-100)]">5 saved searches</b> at a time (free has 1)</> },
              { node: 'Bid reminders' },
              { node: 'Cancel anytime' },
            ]}
          />
          <Tier
            soon
            ribbon="Coming soon"
            name="Premium"
            tagline="Coming soon. Tell us what you'd want in it."
            features={[
              { node: <>Ideas welcome at <Link href="/contact" className="underline decoration-[var(--gold-deep)] underline-offset-2 hover:text-[var(--gold-bright)]">Support</Link></>, muted: true },
            ]}
          />
        </div>

        {/* Premium waitlist: emails go to /api/waitlist. */}
        <div className="mt-10"><EarlyAccessBanner /></div>

        <p className="text-center text-[var(--ink-600)] text-xs mt-12 leading-relaxed">
          Prices in CAD, plus applicable taxes. Cancel anytime.
        </p>
      </div>
    </main>
  );
}
