import Link from 'next/link';
import PageShell, { SectionHeading, Prose } from '../components/PageShell';

export const metadata = {
  title: 'Alerts — Fields & Floors Collectors',
  description: 'Save a search. Get an email the moment a new listing matches. Part of Base.',
};

export default function AlertsPage() {
  return (
    <PageShell
      eyebrow="Now live · Base plan"
      title="Alerts."
      lede="Save a search. We watch eBay. The moment a new listing matches your filters, you get an email — usually within the hour."
    >
      <SectionHeading number="01" label="What it does">
        A search you save, that watches the marketplace for you.
      </SectionHeading>
      <Prose>
        <p>
          Find a card you'd buy if the price were right? Save the search.
          When a listing lands that matches every filter you set &mdash; the right
          player, the right print run, under your ceiling &mdash; we email you
          immediately.
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
          Alerts run on up to five saved searches at once on the Base plan. If
          you have an auction tracked with a bid reminder armed, you'll also
          get a heads-up email in the auction's final three hours so you have
          time to bid.
        </p>
      </Prose>

      <SectionHeading number="03" label="What it costs">
        Five dollars a month, fourteen days free.
      </SectionHeading>
      <Prose>
        <p>
          Alerts are part of our Base plan: <strong>$5 / month</strong> with a
          14-day free trial. A valid card is required to start the trial; we'll
          email you a reminder before it converts. Cancel anytime.
        </p>
        <p>
          Free-tier users still get the full search experience and watchlist &mdash;
          everything except the automated alerts and bid reminders.
        </p>
      </Prose>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[11px] tracking-[0.22em] uppercase transition-opacity hover:opacity-90"
          style={{ background: '#d4af5c', color: '#1a1614' }}
        >
          See pricing
        </Link>
        <Link
          href="/signup?next=/subscribe"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[11px] tracking-[0.22em] uppercase transition-colors"
          style={{
            background: 'transparent',
            border: '0.5px solid rgba(232,226,213,0.18)',
            color: '#e8e2d5',
          }}
        >
          Start free trial &rarr;
        </Link>
      </div>
    </PageShell>
  );
}
