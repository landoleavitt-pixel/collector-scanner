import Link from 'next/link';
import PageShell from '../components/PageShell';

// /app/guides/page.js
//
// The library entry point. Lists every published guide as an editorial card —
// most recent first. Each card links to its own route at /guides/<slug>.
//
// Adding a new guide:
//   1. Create app/guides/<slug>/page.js with its own metadata and content.
//   2. Add an entry to the GUIDES array below.
//   3. Add the URL to app/sitemap.js.

export const metadata = {
  title: 'Guides — sports card hunting on eBay',
  description:
    'Honest guides to print runs, rookie cards, autographs, and finding rare cards on eBay. Written by collectors, for collectors.',
  openGraph: {
    title: 'Guides — Fields & Floors',
    description:
      'Honest guides to print runs, rookie cards, autographs, and finding rare cards on eBay.',
    type: 'website',
    url: 'https://fieldsandfloors.com/guides',
  },
};

const GUIDES = [
  {
    slug: 'print-runs',
    title: 'The complete guide to print runs',
    eyebrow: 'Numbered cards',
    summary:
      'What /5, /10, /99, and /199 actually mean — and why the same player can sell for $40 or $4,000 depending on this one number.',
    readTime: '8 min read',
    published: '2026-06-16',
  },
  // Article #2 — coming
  // {
  //   slug: 'finding-rare-cards-on-ebay',
  //   title: 'How to find rare cards on eBay',
  //   eyebrow: 'eBay search',
  //   summary: 'The filters eBay does not give you, and how to work around it.',
  //   readTime: '10 min read',
  //   published: '2026-06-23',
  // },
  // Article #3 — coming
  // {
  //   slug: 'sports-card-investing-basics',
  //   title: 'Sports card investing for new collectors',
  //   eyebrow: 'Getting started',
  //   summary: 'What actually holds value, what does not, and how to avoid the common new-collector mistakes.',
  //   readTime: '12 min read',
  //   published: '2026-06-30',
  // },
];

export default function GuidesIndexPage() {
  return (
    <PageShell
      eyebrow="The Library"
      title="Guides."
      lede="Honest, deeply researched guides to the sports card hobby. No fluff, no affiliate hustle — just the things we wish someone had explained to us when we started."
    >
      <div className="space-y-12">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="block group"
            style={{ borderTop: '0.5px solid rgba(232,226,213,0.08)', paddingTop: '2rem' }}
          >
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)] mb-3">
              {g.eyebrow}
            </p>
            <h2 className="font-display text-3xl lg:text-4xl leading-tight tracking-tight mb-3 group-hover:text-[var(--gold-bright)] transition-colors">
              {g.title}
            </h2>
            <p className="text-lg text-[var(--ink-200)] leading-relaxed max-w-[60ch]">
              {g.summary}
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--ink-600)]">
              {g.readTime}
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
