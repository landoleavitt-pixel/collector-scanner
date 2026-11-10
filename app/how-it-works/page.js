import { PAYMENTS_LIVE } from '../../lib/payments';
import PageShell, { SectionHeading, Prose } from '../components/PageShell';
import { TourLink } from '../components/SiteTour';
import { Play } from 'lucide-react';

export const metadata = {
  title: 'How it works',
  description: 'Player verification, numbered card tiers, and how Fields & Floors filters the eBay marketplace differently.',
};

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="The Method"
      title="How it works."
      lede="eBay search was built for everything. Fields & Floors is built for cards. Here's what makes the difference."
    >
      <TourLink
        className="inline-flex items-center gap-2 mb-12 rounded-lg px-3.5 py-2 text-meta font-medium text-[var(--accent-bright)] hover:text-[var(--accent)] transition-colors"
        style={{ border: '0.5px solid var(--accent-deep)' }}
      >
        <Play className="inline-block w-3.5 h-3.5 -mt-0.5" strokeWidth={2} fill="currentColor" aria-hidden="true" /> Take the 1-minute tour
      </TourLink>
      <SectionHeading number="01" label="Verification">
        We confirm the player is actually in the title.
      </SectionHeading>
      <Prose>
        <p>
          Type <code>Cooper Flagg</code> into eBay and you'll get Cooper Flagg cards, along with stacks of unrelated listings that happen to contain the words "Cooper" or "Flagg." Bulk lots. Misindexed cards. Sellers stuffing keywords.
        </p>
        <p>
          Search <strong>"Cooper Flagg"</strong> and you only see Cooper Flagg cards, not other players who share part of his name. eBay's own search doesn't check this. We do.
        </p>
        <p>
          The result: a search for an obscure prospect returns ten of their cards, not three hundred listings that mostly aren't.
        </p>
      </Prose>

      <SectionHeading number="02" label="Print runs">
        We read the title for what's actually numbered.
      </SectionHeading>
      <Prose>
        <p>
          On eBay, a print run is whatever the seller types. Some fill in a Print Run field. Many just put <code>/10</code> in the title, where it looks a lot like <code>"2024-25 season"</code> or <code>"5/25/2024"</code> or <code>"+NEW 12/12"</code> stock counts.
        </p>
        <p>
          Sellers put lots of numbers in their titles: years, dates, stock counts. We only call a card numbered when the title says how many were made, like <code>/10</code> or <code>1 of 1</code>. Everything else is ignored.
        </p>
        <p>
          Once a real print run is found, we sort it into a tier. Collectors think in tiers, so the filter speaks the same language:
        </p>
        <ul>
          <li><strong>Grail</strong>: 1 to 25 made. One-of-a-kind cards and the ones with only a handful in the world.</li>
          <li><strong>Ultra</strong>: 26 to 99 made. Still very scarce, a little easier to find.</li>
          <li><strong>Rare</strong>: 100 to 249 made. The most common numbered cards people chase.</li>
          <li><strong>Scarce</strong>: 250 or more made. The widest group of numbered cards.</li>
        </ul>
        <p>
          You can also enter a custom print run: <code>/73</code>, <code>/88</code>, <code>/42</code>, any oddball denominator a specific set uses. Chain them together and we'll surface listings that match any of them.
        </p>
      </Prose>

      <SectionHeading number="03" label="Stacked filters">
        Every filter in one search.
      </SectionHeading>
      <Prose>
        <p>
          On eBay, "Autographed" is a checkbox. So is "Rookie." Price has a range. Adding print runs on top means Advanced Search, or typing a boolean search by hand.
        </p>
        <p>
          Here it's one search: <em>autographed, rookie, numbered to 25 or lower, under $300, Buy It Now only, sorted by ending soonest.</em> That's the query a serious collector makes constantly. The result list narrows from thousands to the few that actually fit what you're hunting.
        </p>
        <p>
          If you toggle <strong>Autographed</strong> and your search already contains the word "auto," we don't double-add it. Small thing. Worth doing right.
        </p>
      </Prose>

      <SectionHeading number="04" label="What we don't do">
        Honesty about the edges.
      </SectionHeading>
      <Prose>
        <p>
          We don't sell anything. We don't take a cut of your transactions. We
          don't run our own marketplace. Every listing on Fields &amp; Floors is a
          real eBay listing. Clicking through takes you to eBay and you check
          out there.
        </p>
        <p>
          {PAYMENTS_LIVE
            ? 'Saved searches and automated alerts are part of our Base plan.'
            : 'Saved searches and automated alerts are free during early access, on up to 5 searches.'}{' '}
          We watch eBay for you and email when a new listing matches your filters.
          See <a href="/alerts">Alerts</a> for details.
        </p>
      </Prose>
    </PageShell>
  );
}
