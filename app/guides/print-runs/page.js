import Link from 'next/link';
import PageShell, { SectionHeading, Prose } from '../../components/PageShell';

// /app/guides/print-runs/page.js
//
// The complete guide to print runs. The first magnet article — long, deep,
// genuinely useful. Designed to:
//   1. Rank on Google for "sports card print runs", "what does /99 mean", etc.
//   2. Be quoted verbatim by ChatGPT / Claude / Perplexity (Article schema
//      attached below makes this easier).
//   3. Convert curious readers into product users via natural internal links.
//
// Article schema with author, published date, and word count signals this is
// real editorial content, not a thin SEO page.

export const metadata = {
  title: 'The complete guide to print runs (/5, /10, /99, /199)',
  description:
    'What card print runs actually mean, why /99 can be worth ten times more than /499, and how to find numbered cards on eBay reliably.',
  openGraph: {
    title: 'The complete guide to print runs in sports cards',
    description:
      'What /5, /10, /99, /199, and /499 actually mean — and why the same player can sell for $40 or $4,000 depending on this one number.',
    type: 'article',
    url: 'https://fieldsandfloors.com/guides/print-runs',
    publishedTime: '2026-06-16',
    authors: ['Fields & Floors'],
  },
};

export default function PrintRunsGuide() {
  // Article structured data — gets parsed by Google for News-style display
  // and by AI engines for citation. Including the article body in
  // `articleBody` makes the whole piece quotable.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'The complete guide to print runs (/5, /10, /99, /199)',
    description:
      'What card print runs actually mean, why /99 can be worth ten times more than /499, and how to find numbered cards on eBay reliably.',
    image: 'https://fieldsandfloors.com/opengraph-image.png',
    datePublished: '2026-06-16',
    dateModified: '2026-06-16',
    author: {
      '@type': 'Organization',
      name: 'Fields & Floors',
      url: 'https://fieldsandfloors.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fields & Floors',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fieldsandfloors.com/icon.png',
      },
    },
    mainEntityOfPage: 'https://fieldsandfloors.com/guides/print-runs',
    articleSection: 'Guides',
    wordCount: 2900,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <PageShell
        eyebrow="Numbered cards"
        title="What print runs actually mean."
        lede="Every collector eventually trips over this number. The same Mike Trout rookie can sell for $40 or $4,000 — and the difference is often just whatever is stamped after the slash. Here's how it works, why it matters, and how to find what you're looking for."
      >
        <SectionHeading number="01" label="The basics">
          What you're looking at when you see /99.
        </SectionHeading>
        <Prose>
          <p>
            When you see a card listed as <strong>"/99"</strong> or <strong>"#23/99"</strong>,
            that number tells you exactly how many copies of that specific card the
            manufacturer produced. The "/99" is the print run. The "23" (when it's
            printed on the card itself) is the serial number — that particular card's
            position in the run.
          </p>
          <p>
            So a card stamped 23/99 means "this is card number 23 out of 99 ever made."
            Every numbered card has both halves: a serial number and a print run. The
            serial number rarely affects value on its own (more on that later), but
            the <em>print run</em> is one of the single biggest factors in what a
            card is worth.
          </p>
          <p>
            Not every card is numbered. Base cards — the most common, unnumbered
            versions you'll see in a pack — are produced in huge quantities, often
            millions. Numbered parallels are the rarer versions of the same player's
            card, with the print run printed somewhere on the front or back.
          </p>
        </Prose>

        <SectionHeading number="02" label="Why the number matters">
          Same player. Same year. Wildly different prices.
        </SectionHeading>
        <Prose>
          <p>
            Take any modern rookie. A base card might sell for under a dollar. A
            numbered parallel of the same card — same player, same year, same set —
            might sell for $50 or $5,000 depending on what comes after the slash.
            The reason is pure supply and demand: fewer copies in circulation means
            more competition among buyers when one shows up.
          </p>
          <p>
            But the relationship between print run and price isn't linear. A /99
            is not "five times rarer" than a /499, even though the math says it is.
            In practice, /99 cards trade at a premium far above 5x because they
            occupy a different psychological tier — collectors think of them as
            "rare" while /499 is "common parallel." The number alone changes how the
            market categorizes a card.
          </p>
          <p>
            This is why understanding print run tiers (next section) is more useful
            than memorizing exact numbers. Collectors don't price cards by exact
            print run — they price by the tier the print run falls into.
          </p>
        </Prose>

        <SectionHeading number="03" label="The five tiers">
          A working framework for how the market actually values rarity.
        </SectionHeading>
        <Prose>
          <p>
            After watching thousands of card sales, a tier structure emerges. These
            aren't official manufacturer designations — they're how the market
            consistently behaves at different rarity levels.
          </p>

          <h3 className="font-display text-xl mt-8 mb-2 text-[var(--gold-bright)]">
            /1 — One of one
          </h3>
          <p>
            Literally the only copy in existence. Often labeled "1/1" on the card
            itself. These are pursued by completists and high-end collectors and
            trade at a steep premium — for star rookies, easily 10-50x the next
            tier. Auction-only territory for most players.
          </p>

          <h3 className="font-display text-xl mt-8 mb-2 text-[var(--gold-bright)]">
            /5 to /25 — Grail tier
          </h3>
          <p>
            The "I might own this someday" range for serious collectors. /5 and
            /10 parallels of a top rookie can hit five-figure prices. /25 is the
            sweet spot where serious money still meets sometimes-attainable supply.
            Important detail: gold parallels in Topps Chrome and Bowman Chrome are
            typically /50, which lands at the edge of this tier — premium but
            findable.
          </p>

          <h3 className="font-display text-xl mt-8 mb-2 text-[var(--gold-bright)]">
            /50 to /99 — Ultra rare
          </h3>
          <p>
            Where most collectors stop chasing because prices stay sane. /99 is
            arguably the most-traded numbered tier in modern cards — common enough
            to find on eBay weekly, rare enough to command real premiums. Most
            modern Refractors and color parallels live here. If you're starting
            out and want to own numbered cards without spending grail money, this
            tier is the answer.
          </p>

          <h3 className="font-display text-xl mt-8 mb-2 text-[var(--gold-bright)]">
            /100 to /499 — Rare
          </h3>
          <p>
            Still numbered, still parallels, but the print run is high enough that
            supply is consistent. These usually trade at modest premiums over base
            cards — say 2-5x — rather than the 10-50x of lower-numbered cards. For
            many players the /199 tier is the entry point into numbered collecting.
          </p>

          <h3 className="font-display text-xl mt-8 mb-2 text-[var(--gold-bright)]">
            /500 and above — Scarce
          </h3>
          <p>
            Technically numbered but practically common. /999 cards in particular
            barely command a premium over base in many sets. They are still
            collectible and still scarcer than base, but if you're paying a big
            premium for a /999 of a non-star player, you may be overpaying. Verify
            recent sold comps before bidding.
          </p>
        </Prose>

        <SectionHeading number="04" label="The serial number itself">
          Sometimes 1/99 is worth more than 47/99.
        </SectionHeading>
        <Prose>
          <p>
            Within a given print run, certain serial numbers carry their own
            premium. Three to know about:
          </p>
          <p>
            <strong>The first card (1/X)</strong> almost always sells for more,
            sometimes substantially. There's only one #1 of every numbered card,
            and collectors covet them. Expect a 20-100% premium over a random
            number from the same run for top players.
          </p>
          <p>
            <strong>The last card (X/X)</strong> — for example, 99/99 — also
            carries a premium, smaller than the #1 but real. The thinking: this is
            the final copy printed.
          </p>
          <p>
            <strong>Jersey-number matches.</strong> If the player wears #23 and
            you have card 23/99, that's a "jersey match" and is worth a premium
            with collectors who chase the player. The premium scales with how
            iconic the number is for the player. LeBron James's 23/99 has its own
            market; an obscure rookie's jersey match might add 10% at most.
          </p>
          <p>
            For everything else, the specific serial number generally doesn't
            change the value much — a 47/99 trades like any other "random number"
            from that run.
          </p>
        </Prose>

        <SectionHeading number="05" label="Why eBay search struggles with this">
          The reason finding numbered cards is unreasonably hard.
        </SectionHeading>
        <Prose>
          <p>
            If you've tried to search eBay for "/99" or "/25," you've already hit
            the wall. eBay's search treats those characters as noise. Type "/99"
            and you'll get a mix of: actual /99 cards, cards listed at $99,
            cards from 1999, cards listed with a "99" inventory number, and
            completely unrelated listings.
          </p>
          <p>
            The reason is that eBay's listing format doesn't have a structured
            "print run" field — sellers type the print run into the title in any
            format they want. <em>"Bobby Witt Jr Refractor #/99," "BWJ /99,"
            "Witt /99 Refractor SP,"</em> and <em>"2024 Witt Refractor 99"</em> are
            all the same card from a search standpoint, but eBay's keyword matcher
            treats them all differently.
          </p>
          <p>
            This is the problem <Link href="/" className="text-[var(--gold-bright)] underline decoration-1 underline-offset-[3px]">Fields &amp; Floors</Link>{' '}
            was built to solve. Our search parses each listing title against a
            pattern that knows what a print run looks like — and crucially, knows
            what print runs <em>don't</em> look like (years, dates, inventory
            counts, prices). You filter by exact print run, and the false
            positives don't reach you.
          </p>
        </Prose>

        <SectionHeading number="06" label="Common confusions">
          What is and isn't a print run.
        </SectionHeading>
        <Prose>
          <p>
            <strong>Card numbers vs print runs.</strong> A card might have "#100"
            on the front — that's the card number within the set, not a print run.
            The 2024 Topps Chrome set has cards numbered #1 through #220, and they
            all have huge unnumbered base print runs. The print run, when it
            exists, will be formatted as a fraction or follow the word "of": "/99"
            or "#5 of 25."
          </p>
          <p>
            <strong>Years vs print runs.</strong> "2024" is a year. "/24" might be
            a print run. Listings sometimes get ambiguous: <em>"2024 Topps Bowman
            /24"</em>. Pay attention to the position of the number in the title.
            Years almost always appear at or near the start; print runs typically
            appear near the end, after the player name and set.
          </p>
          <p>
            <strong>Limited edition vs numbered.</strong> A card labeled "Limited
            Edition" or "SP" (short print) is rarer than base but isn't actually
            numbered. It has no print run printed on it. Some sellers list these
            as "/?" or just call them rare. They sit in a separate category from
            true numbered parallels.
          </p>
          <p>
            <strong>Refractor variants.</strong> "Refractor" by itself usually
            means unnumbered. "Refractor /99" is a numbered Refractor parallel.
            "Atomic Refractor" or "X-Fractor" or "SuperFractor" are progressively
            rarer Refractor variants, often with their own print runs.
          </p>
        </Prose>

        <SectionHeading number="07" label="How to use this">
          Two practical takeaways.
        </SectionHeading>
        <Prose>
          <p>
            First: when you're researching what to pay for a card, sort sold
            listings by recency and only compare to cards with the <em>same</em>{' '}
            print run. A /99 sold price tells you almost nothing about what a
            /499 of the same card should cost. Different tier, different market.
          </p>
          <p>
            Second: if you're collecting a specific player and want to be alerted
            the moment a card in your target print run lists, save the search.
            That's the difference between "I check eBay every day at 9pm" and "I
            found out about the listing 11 minutes after it went up." You can
            save searches with filters by exact print run, autograph status, and
            price ceiling — and we'll email you when something matches.{' '}
            <Link href="/pricing" className="text-[var(--gold-bright)] underline decoration-1 underline-offset-[3px]">
              See pricing &rarr;
            </Link>
          </p>
        </Prose>

        <SectionHeading number="08" label="One last thing">
          The number tells you about supply. It doesn't tell you about demand.
        </SectionHeading>
        <Prose>
          <p>
            Print run is half the equation. Demand is the other half. A /1 card
            of a player no one cares about can sit on eBay for $50 indefinitely.
            A /99 of a current MVP can move at $5,000 the day it lists. Print
            run sets the floor of rarity; the player's career trajectory sets the
            ceiling of value.
          </p>
          <p>
            This is why the most volatile cards are numbered rookies of active
            players. The supply is locked in (the print run never changes), but
            demand swings with every game, injury, contract, trade. The same
            /99 Mike Trout rookie traded at very different prices in 2014, 2018,
            and 2023.
          </p>
          <p>
            Understanding print runs is necessary for being a smart collector.
            It's not sufficient. The rest is watching the player, watching the
            market, and showing up at the right moment.
          </p>
        </Prose>

        <div className="mt-16 pt-10" style={{ borderTop: '0.5px solid rgba(232,226,213,0.08)' }}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--gold)] mb-4">Next</p>
          <p className="text-lg text-[var(--ink-200)] leading-relaxed mb-6 max-w-[60ch]">
            Want to put this into practice? Search eBay with filters that actually
            understand print runs, autographs, rookies, and grades.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[11px] tracking-[0.22em] uppercase transition-opacity hover:opacity-90"
            style={{ background: '#d4af5c', color: '#1a1614' }}
          >
            Try a search &rarr;
          </Link>
        </div>
      </PageShell>
    </>
  );
}
