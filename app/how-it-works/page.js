import PageShell, { SectionHeading, Prose } from '../components/PageShell';

export const metadata = {
  title: 'How it works — Fields & Floors Collectors',
  description: 'Player verification, numbered card tiers, and how Fields & Floors filters the eBay marketplace differently.',
};

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="The Method"
      title="How it works."
      lede="eBay search was built for everything. Fields & Floors is built for cards. Three things make the difference."
    >
      <SectionHeading number="01" label="Verification">
        We confirm the player is actually in the title.
      </SectionHeading>
      <Prose>
        <p>
          Type <code>Cooper Flagg</code> into eBay and you'll get Cooper Flagg cards — along with stacks of unrelated listings that happen to contain the words "Cooper" or "Flagg." Bulk lots. Misindexed cards. Sellers stuffing keywords.
        </p>
        <p>
          We verify that the full player name (or a known variant) appears in the listing title before showing it to you. <strong>"Robert Williams"</strong> stops surfacing when you search for <strong>"Cooper Flagg."</strong> The eBay API doesn't do this for you. We do it after.
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
          eBay has no concept of a print run. A card numbered <code>/10</code> is just text in a title to them — indistinguishable from <code>"2024-25 season"</code> or <code>"5/25/2024"</code> or <code>"+NEW 12/12"</code> stock counts.
        </p>
        <p>
          Our parser knows the difference. It catches the real ones — <code>/10</code>, <code>#5/10</code>, <code>1/1</code>, <code>numbered to 25</code>, <code>2/10</code>, <code>jersey #44/99</code> — and rejects the false positives: season years, calendar dates, inventory counts, card numbers without a denominator.
        </p>
        <p>
          Once a real print run is found, we sort it into a tier. Collectors think in tiers, so the filter speaks the same language:
        </p>
        <ul>
          <li><strong>The Grail</strong> — numbered 1 to 25. The 1/1s and the lowest-pop chase cards.</li>
          <li><strong>Ultra Rare</strong> — numbered 26 to 99. Still scarce, still desirable, more attainable.</li>
          <li><strong>Rare</strong> — numbered 100 to 249. The standard "numbered" tier.</li>
          <li><strong>Scarce</strong> — numbered 250 to 999. The widest band of numbered cards.</li>
        </ul>
        <p>
          You can also enter a custom print run — <code>/73</code>, <code>/88</code>, <code>/42</code>, any oddball denominator a specific set uses. Chain them together and we'll surface listings that match any of them.
        </p>
      </Prose>

      <SectionHeading number="03" label="Stacked filters">
        We combine filters eBay won't.
      </SectionHeading>
      <Prose>
        <p>
          On eBay, "Autographed" is a checkbox. So is "Rookie." Price has a range. But you can't tell eBay: <em>autographed, rookie, numbered to 25 or lower, under $300, Buy It Now only, sorted by ending soonest.</em>
        </p>
        <p>
          That's the one query a serious collector makes constantly. We let you stack all of it at once. The result list narrows from thousands to the few that actually fit what you're hunting.
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
          We don't sell anything. We don't take a cut of your transactions. We don't run our own marketplace. Every listing on Fields & Floors is a real eBay listing — clicking through takes you to eBay and you check out there.
        </p>
        <p>
          We also don't have your saved searches yet. We don't notify you when a new listing matches your watch criteria. We don't store anything about you. <strong>Those are next.</strong> See <a href="/alerts">Alerts</a>.
        </p>
      </Prose>
    </PageShell>
  );
}
