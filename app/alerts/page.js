import PageShell, { SectionHeading, Prose } from '../components/PageShell';
import WaitlistForm from './WaitlistForm';

export const metadata = {
  title: 'Alerts — Fields & Floors Collectors',
  description: 'Be first to know when new listings match your watchlist. Join the waitlist.',
};

export default function AlertsPage() {
  return (
    <PageShell
      eyebrow="Coming soon"
      title="Alerts."
      lede="The killer feature. Save a search, get a notification the moment a new listing matches. We're building this next."
    >
      <SectionHeading number="01" label="What it is">
        A search you save, that watches the marketplace for you.
      </SectionHeading>
      <Prose>
        <p>
          Find a card you'd buy if the price were right? You save the search. We watch eBay. When a listing lands that matches every filter you set — the right player, the right print run, under your ceiling — we tell you immediately.
        </p>
        <p>
          No more refreshing the same search five times a day. No more missing the listing that goes live at 11pm on a Tuesday and sells in nine minutes.
        </p>
      </Prose>

      <SectionHeading number="02" label="Why it's not live yet">
        Honesty about the timeline.
      </SectionHeading>
      <Prose>
        <p>
          Alerts need persistent accounts. Accounts need a database, authentication, email infrastructure, and — because we're collecting personal information — a privacy policy that's actually been reviewed by a lawyer.
        </p>
        <p>
          That's the next phase, and we're not rushing it. The version we ship will be the one we'd want to use ourselves.
        </p>
      </Prose>

      <SectionHeading number="03" label="The waitlist">
        Join it and you'll know first.
      </SectionHeading>
      <Prose>
        <p>
          Drop your email below. When alerts go live, you'll get one email — not a newsletter, not a sales pitch, not a sequence. Just: <em>it's here, here's how to use it.</em> Unsubscribe in one click.
        </p>
      </Prose>
      <div className="mt-8">
        <WaitlistForm />
      </div>
    </PageShell>
  );
}
