import Link from 'next/link';
import PageShell, { SectionHeading, Prose } from '../components/PageShell';
import { ArrowRight } from 'lucide-react';
import { PAYMENTS_LIVE } from '../../lib/payments';

export const metadata = {
  title: 'Alerts',
  description: 'Save a search. Get an email the moment a new listing matches. Part of Base.',
};

export default function AlertsPage() {
  return (
    <PageShell
      eyebrow={PAYMENTS_LIVE ? 'Base plan' : 'Free during early access'}
      title="Alerts."
      lede="Save a search. We watch eBay. The moment a new listing matches your filters, you get an email, usually within the hour."
    >
      <SectionHeading number="01" label="What it does">
        A search you save, that watches the marketplace for you.
      </SectionHeading>
      <Prose>
        <p>
          Find a card you'd buy if the price were right? Save the search.
          When a listing lands that matches every filter you set (the right
          player, the right print run, under your ceiling), we email you,
          usually within the hour.
        </p>
        <p>
          No more refreshing the same search five times a day. No more missing
          the listing that goes live at 11pm on a Tuesday and sells in nine
          minutes.
        </p>
      </Prose>

      <SectionHeading number="02" label="How it works">
        Hourly polling, deduplicated, gated by your filters.
      </SectionHeading>
      <Prose>
        <p>
          Every hour, we re-run each of your saved searches against eBay's
          public listing data. Any listing that matches and hasn't been seen
          before triggers an alert. You can pause or resume any saved search
          at any time from your watchlist page.
        </p>
        <p>
          Alerts run on up to five saved searches at once
          {PAYMENTS_LIVE ? ' on the Base plan' : ''}. Star an auction and set a
          bid reminder to get a heads-up before it ends: pick any of 3 hours,
          1 hour, 30, 15 or 5 minutes, and add a price if you only want it when
          the bid is under your limit.
        </p>
      </Prose>

      {PAYMENTS_LIVE ? (
      <>
      <SectionHeading number="03" label="What it costs">
        $6.99 a month, fourteen days free.
      </SectionHeading>
      <Prose>
        <p>
          Alerts are part of our Base plan: <strong>$6.99 CAD / month</strong> with a
          14-day free trial. A valid card is required to start the trial. Cancel anytime.
        </p>
        <p>
          Free-tier users still get the full search experience and watchlist,
          plus one live email alert. Base adds up to five alerts and bid reminders.
        </p>
      </Prose>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[11px] tracking-[0.22em] uppercase transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}
        >
          See pricing
        </Link>
        <Link
          href="/signup?next=/subscribe"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[11px] tracking-[0.22em] uppercase transition-colors"
          style={{
            background: 'transparent',
            border: '0.5px solid rgba(232,226,213,0.18)',
            color: 'var(--ink-200)',
          }}
        >
          Start free trial <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      </>
      ) : (
      <>
      <SectionHeading number="03" label="What it costs">
        Free during early access.
      </SectionHeading>
      <Prose>
        <p>
          Alerts are free while we're in early access: every account can turn them
          on for up to 5 saved searches, plus bid reminders.
        </p>
      </Prose>
      </>
      )}
    </PageShell>
  );
}
