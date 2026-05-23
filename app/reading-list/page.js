import { ArrowUpRight } from 'lucide-react';
import PageShell, { SectionHeading } from '../components/PageShell';

export const metadata = {
  title: 'Reading list — Fields & Floors Collectors',
  description: 'A short, hand-picked list of the places that taught us what we know about the hobby.',
};

/* A short list. Not a directory.
   Edit, add, or remove freely — order is editorial, not alphabetical. */
const READING = [
  {
    section: 'Pricing & Comps',
    items: [
      {
        title: 'Card Ladder',
        url: 'https://www.cardladder.com',
        note: 'Cleanest sales-comp database in the hobby. Track an individual card or build an index. Their charts are doing the work the eBay search bar refuses to.',
      },
      {
        title: '130point',
        url: 'https://130point.com',
        note: 'Free sold-listing aggregator across eBay and other venues. The price-check tab is the single most-used resource in this list.',
      },
      {
        title: 'PSA Auction Prices Realized',
        url: 'https://www.psacard.com/auctionprices/',
        note: 'Comp data filtered to PSA-graded examples only. Essential when you\'re trying to decide whether to send a raw card in.',
      },
    ],
  },
  {
    section: 'Population & Grading',
    items: [
      {
        title: 'PSA Population Report',
        url: 'https://www.psacard.com/pop/',
        note: 'How many copies of this card are graded, at what grade. Knowing the pop changes everything about what a card is worth.',
      },
      {
        title: 'PSA Grading Standards',
        url: 'https://www.psacard.com/services/tradingcardgrading',
        note: 'The official rubric. Worth reading once even if you never submit, because every grade gets argued in their language.',
      },
    ],
  },
  {
    section: 'News & Community',
    items: [
      {
        title: 'Cardboard Connection',
        url: 'https://www.cardboardconnection.com',
        note: 'Set checklists, release calendars, product reviews. The reference shelf when a new set drops.',
      },
      {
        title: 'Blowout Forums',
        url: 'https://www.blowoutforums.com',
        note: 'The community board. Vintage. Group breaks. Pulled-cards threads. Read the threads, learn the language.',
      },
      {
        title: 'Sports Card Investor',
        url: 'https://www.sportscardinvestor.com',
        note: 'Market analysis, market mover lists, and a podcast worth subscribing to if you want the hobby-as-asset-class lens.',
      },
    ],
  },
];

function ReadingItem({ item }) {
  return (
    <li className="py-6 border-t border-[var(--line-soft)] first:border-t-0 first:pt-0">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <h3 className="font-display text-2xl text-[var(--ink-100)] tracking-tight group-hover:text-[var(--gold)] transition-colors">
            {item.title}
          </h3>
          <ArrowUpRight
            size={18}
            className="text-[var(--ink-600)] group-hover:text-[var(--gold)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </div>
        <p className="text-[var(--ink-200)] leading-relaxed text-pretty">
          {item.note}
        </p>
      </a>
    </li>
  );
}

export default function ReadingListPage() {
  return (
    <PageShell
      eyebrow="The Shelf"
      title="Reading list."
      lede="A short, opinionated list of the places that taught us what we know about the hobby. No affiliate links, no sponsors, no SEO play — just what we actually use."
    >
      {READING.map((section, idx) => (
        <section key={section.section} className={idx === 0 ? '' : 'mt-16'}>
          <SectionHeading number={String(idx + 1).padStart(2, '0')} label="Section">
            {section.section}
          </SectionHeading>
          <ul className="mt-8">
            {section.items.map((item) => (
              <ReadingItem key={item.url} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
