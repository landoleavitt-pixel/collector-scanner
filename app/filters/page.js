import PageShell, { SectionHeading, Prose } from '../components/PageShell';

export const metadata = {
  title: 'Filters — Fields & Floors Collectors',
  description: 'Reference guide to every filter in Fields & Floors. What each catches, what it ignores, and how they combine.',
};

function FilterRow({ name, summary, catches, ignores }) {
  return (
    <div className="py-7 border-t border-[var(--line-soft)] first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h3 className="font-display text-2xl text-[var(--ink-100)] tracking-tight">{name}</h3>
      </div>
      <p className="text-[var(--ink-200)] leading-relaxed mb-4 text-pretty">
        {summary}
      </p>
      {catches && (
        <div className="mb-2 text-sm">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)] mr-3">Catches</span>
          <span className="text-[var(--ink-200)] font-mono text-[13px]">{catches}</span>
        </div>
      )}
      {ignores && (
        <div className="text-sm">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)] mr-3">Ignores</span>
          <span className="text-[var(--ink-200)] font-mono text-[13px]">{ignores}</span>
        </div>
      )}
    </div>
  );
}

export default function FiltersPage() {
  return (
    <PageShell
      eyebrow="The Controls"
      title="Filters."
      lede="A reference for every control in the sidebar. What it does, what it catches, what it deliberately ignores."
    >
      <SectionHeading number="01" label="Card attributes">
        Toggles for the qualities collectors care about.
      </SectionHeading>
      <div className="mt-8">
        <FilterRow
          name="Autographed"
          summary="Listings with an autograph. Checked against the title for 'auto', 'autograph', 'signed', and common variants. If your search already contains 'auto', we don't double-add it — the toggle remains a soft visual confirmation rather than a redundant filter."
          catches="auto · autograph · signed · on-card · sticker auto"
        />
        <FilterRow
          name="Rookie"
          summary="Listings with rookie card markers in the title. Targets cards explicitly marked RC, rookie, or first-year. Doesn't try to infer rookie status from a player's career arc — that's brittle and we don't trust the inference enough to ship it."
          catches="RC · rookie · 1st year · first year · rookie debut"
        />
        <FilterRow
          name="Numbered"
          summary="Listings with a real print run. Tier-based: pick The Grail (1–25), Ultra Rare (26–99), Rare (100–249), or Scarce (250–999). You can also enter custom denominators like /73 or /42 for oddball sets."
          catches="/10 · #5/10 · 1/1 · numbered to 25 · jersey #44/99 · 2/10"
          ignores="2024-25 · 5/25/2024 · +NEW 12/12 · season ranges · dates · inventory counts"
        />
      </div>

      <SectionHeading number="02" label="Listing type">
        How the listing is sold.
      </SectionHeading>
      <Prose>
        <p>
          Three options: <strong>Any</strong>, <strong>Buy It Now</strong>, <strong>Auction</strong>. Auction-only is what you want when you're hunting for a possible steal — it surfaces listings with bids in motion and time pressure. Buy It Now is for when you've decided and you're done watching.
        </p>
        <p>
          Auction results show their time-remaining badge on the card. A listing ending in under two hours is highlighted; one ending in three days is quieter.
        </p>
      </Prose>

      <SectionHeading number="03" label="Price">
        Min and max.
      </SectionHeading>
      <Prose>
        <p>
          A range slider, not free-form text fields, because most price-bounding decisions are spatial — you know roughly what your ceiling is and you adjust by feel. The max range adapts based on the magnitude of recent results, so the slider stays useful whether you're shopping $40 commons or $4,000 rookie autos.
        </p>
      </Prose>

      <SectionHeading number="04" label="Sort">
        How results are ordered after they come back.
      </SectionHeading>
      <Prose>
        <p>
          Sort runs client-side after results land. That means it's instant — no spinner, no re-fetch. Available orders:
        </p>
        <ul>
          <li><strong>Best match</strong> — eBay's default ranking.</li>
          <li><strong>Price: low to high</strong> — the bargain hunter's view.</li>
          <li><strong>Price: high to low</strong> — the grail hunter's view.</li>
          <li><strong>Ending soonest</strong> — auctions first, sorted by time remaining.</li>
          <li><strong>Newly listed</strong> — most recent listings at the top.</li>
        </ul>
      </Prose>

      <SectionHeading number="05" label="Combining filters">
        AND, not OR.
      </SectionHeading>
      <Prose>
        <p>
          Every filter narrows. Toggling <strong>Autographed</strong> + <strong>Rookie</strong> + <strong>Numbered (Grail)</strong> + max price $500 gives you autographed rookies numbered to 25 or fewer, under $500. Each switch you flip removes listings — none of them ever add listings back in.
        </p>
        <p>
          If you end up with zero results, loosen one toggle. The narrower stack is doing its job.
        </p>
      </Prose>
    </PageShell>
  );
}
