import PageShell from '../components/PageShell';

export const metadata = {
  title: 'Glossary — Fields & Floors Collectors',
  description: 'Trading card collector terminology, defined. RC, /10, refractor, slab, FOTL, and the rest of the hobby\'s vocabulary.',
};

/* Sorted alphabetically. Add freely. */
const TERMS = [
  { term: '1/1', def: 'A card with a print run of exactly one copy. The most exclusive numbered tier — no other example exists.' },
  { term: 'Auto / On-card auto', def: 'Short for autograph. "On-card" means signed directly on the card stock, which collectors prefer to "sticker auto" — a signed sticker applied to the card during manufacturing.' },
  { term: 'Base / Base card', def: 'The standard, unparalleled version of a card in a set. Usually the most common variant.' },
  { term: 'BGS', def: 'Beckett Grading Services. One of the four major third-party grading companies, alongside PSA, SGC, and CGC. Known for sub-grades.' },
  { term: 'BIN', def: 'Buy It Now. An eBay listing sold at a fixed price, no auction.' },
  { term: 'Blaster', def: 'A retail-channel sealed product, typically containing a small number of packs. Lower hit rate than hobby boxes; widely sold at Target and Walmart.' },
  { term: 'Bowman Chrome', def: 'Topps\' chrome-finish baseball brand, especially significant for prospect rookies. First Bowman Chrome autos drive the prospect market.' },
  { term: 'Break / Group break', def: 'A live or recorded session where one or more sealed boxes are opened and the cards distributed to buyers who paid for slots (teams, players, or randoms).' },
  { term: 'CGC', def: 'Certified Guaranty Company. A grading company expanded from comics into trading cards. The newest of the major four.' },
  { term: 'Comp / Comparable', def: 'A recent sale of the same or near-identical card, used as a price benchmark. "What\'s the comp on this?" means "what has this been selling for?"' },
  { term: 'Cross-grade', def: 'Submitting a card already slabbed by one grader to a different grader for a new grade. Done when the collector thinks the original grade was conservative.' },
  { term: 'Encapsulated / Slabbed', def: 'Sealed in a tamper-evident plastic case by a third-party grader. Synonymous with "graded."' },
  { term: 'FOTL', def: 'First Off The Line. A Topps program where a limited early run of a sealed product is sold direct to consumers, usually with exclusive parallels.' },
  { term: 'Grail', def: 'A collector\'s ultimate target card. In Fields & Floors\' filters, "The Grail" tier refers to print runs of 25 or fewer.' },
  { term: 'Hanger', def: 'A retail box format hung on store pegs, smaller than a blaster. Common for Panini Prizm and Topps Chrome.' },
  { term: 'Hobby box', def: 'A sealed box sold through the hobby distribution channel (card shops, online breakers), as opposed to retail. Usually higher per-pack hit rates than retail blasters.' },
  { term: 'Hot pack', def: 'A pack containing significantly more valuable cards than expected — sometimes intentionally salted, sometimes a fortunate pull.' },
  { term: 'Insert', def: 'A card that\'s not part of the base set — a parallel, an autograph, a relic, or a special themed subset.' },
  { term: 'Jersey / Patch', def: 'A relic card containing a piece of game-worn or player-worn jersey material. "Patch" specifically refers to multi-color swatches, generally more valuable than plain single-color swatches.' },
  { term: 'Low pop', def: 'A card with a small Pop Report number at a given grade. Low pop + high grade = scarcity = price.' },
  { term: 'Numbered', def: 'A card with a print run printed directly on it, written as "##/total" (e.g., 5/10 means the 5th of 10 printed). See also: The Grail, /N.' },
  { term: 'OBO', def: 'Or Best Offer. A BIN listing where buyers can submit offers below the asking price.' },
  { term: 'Parallel', def: 'A variant of a base card with different color, foil, refractor pattern, or material. Often numbered.' },
  { term: 'Pop Report', def: 'A grading company\'s public report of how many copies of a given card they\'ve graded at each grade level. PSA\'s is the most-referenced.' },
  { term: 'Prizm', def: 'Panini\'s flagship chrome-finish brand. Prizm rookies are landmark cards across NBA, NFL, and other sports.' },
  { term: 'PSA', def: 'Professional Sports Authenticator. The largest and most established third-party grading company. PSA 10 is the gold-standard grade.' },
  { term: 'Pull', def: 'A notable card retrieved from a pack. "Big pull" = high-value hit.' },
  { term: 'Raw', def: 'Ungraded. A card not in a slab.' },
  { term: 'RC / Rookie Card', def: 'A player\'s officially designated rookie card. The licensing bodies have specific rules about which year and which sets qualify.' },
  { term: 'Redemption', def: 'A card that, instead of the autograph or relic itself, is a coupon redeemable for the real card later. Often a source of frustration when the company is slow to fulfill.' },
  { term: 'Refractor', def: 'A chrome-finish card with a refractive rainbow surface. Originated with Topps Finest; the term is now used broadly.' },
  { term: 'Relic', def: 'A card containing a piece of game-used or player-used material — jersey, bat, ball, helmet.' },
  { term: 'Retail', def: 'The mass-market distribution channel — Target, Walmart, drugstores. Lower hit rates and different parallels than hobby.' },
  { term: 'SGC', def: 'Sportscard Guaranty. A grading company known for its tuxedo-black insert label and reputation for vintage card grading.' },
  { term: 'Short Print / SP / SSP', def: 'Cards intentionally produced in lower quantities than the base set. SSP — Super Short Print — is rarer still.' },
  { term: 'Sticker auto', def: 'An autograph signed on a sticker, which is then applied to the card during manufacturing. Generally less prized than on-card autos.' },
  { term: 'Variation', def: 'A printing or photo variant of a card — different image, different color, different jersey number. Often deliberately released as chase cards.' },
  { term: '/N', def: 'Shorthand for a print run. "/10" means numbered to ten. Read aloud as "numbered to ten."' },
];

function GlossaryEntry({ entry }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-x-8 py-5 border-t border-[var(--line-soft)] first:border-t-0 first:pt-0 items-baseline">
      <dt className="font-display text-xl text-[var(--ink-100)] tracking-tight">
        {entry.term}
      </dt>
      <dd className="text-[var(--ink-200)] leading-relaxed text-pretty">
        {entry.def}
      </dd>
    </div>
  );
}

export default function GlossaryPage() {
  // Sort alphabetically, putting digit-starters at the end so they don't
  // crowd the top. "1/1" reads better at the bottom than the top.
  const sorted = [...TERMS].sort((a, b) => {
    const aDigit = /^\d|^\//.test(a.term);
    const bDigit = /^\d|^\//.test(b.term);
    if (aDigit && !bDigit) return 1;
    if (!aDigit && bDigit) return -1;
    return a.term.localeCompare(b.term);
  });

  return (
    <PageShell
      eyebrow="The Vocabulary"
      title="Glossary."
      lede="The terms the hobby uses. Read them once, save yourself a thousand context-switches later."
    >
      <dl className="mt-4">
        {sorted.map((entry) => (
          <GlossaryEntry key={entry.term} entry={entry} />
        ))}
      </dl>
    </PageShell>
  );
}
