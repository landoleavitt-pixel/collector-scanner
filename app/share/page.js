import HomePage from '../page';

// Landing route for shared search links.
//
// Why this exists rather than sharing "/?q=..." directly: Next.js metadata
// for a client-component page can't read searchParams, and the
// opengraph-image file convention only receives route `params`. Neither can
// see a share link's criteria. This route is a SERVER component, so
// generateMetadata gets searchParams and can point the preview image at
// /api/og with the same values — which is what makes a pasted link render
// as "Caitlin Clark · /5 /10 /25 · Auto" in iMessage, Discord, etc.
//
// It then renders the normal home experience, which reads the same params
// off the URL and runs the search. Same page, richer preview.

export const dynamic = 'force-dynamic';

function describe(searchParams) {
  const bits = [];
  const runs = (searchParams?.runs || '')
    .split(',')
    .map((r) => r.trim())
    .filter((r) => /^\d{1,5}$/.test(r));
  if (runs.length) bits.push(runs.map((r) => `/${r}`).join(' '));
  if (searchParams?.auto === '1') bits.push('Autograph');
  if (searchParams?.rc === '1') bits.push('Rookie');
  if (searchParams?.cond === 'graded') bits.push('Graded');
  else if (searchParams?.cond === 'raw') bits.push('Raw');
  if (searchParams?.type === 'auction') bits.push('Auctions');
  else if (searchParams?.type === 'buyItNow') bits.push('Buy It Now');
  return bits.join(' · ');
}

export async function generateMetadata({ searchParams }) {
  const sp = searchParams || {};
  const query = (sp.q || '').trim();

  // Rebuild the exact param string for the OG image so the preview matches
  // the search the recipient will actually see.
  const ogParams = new URLSearchParams();
  for (const key of ['q', 'runs', 'auto', 'rc', 'type', 'cond', 'min', 'max']) {
    if (sp[key]) ogParams.set(key, String(sp[key]));
  }
  const ogUrl = `https://fieldsandfloors.com/api/og?${ogParams.toString()}`;

  const filterText = describe(sp);
  const title = query
    ? `${query} — Fields & Floors Collectors`
    : 'Shared search — Fields & Floors Collectors';
  const description = filterText
    ? `${query || 'Rare sports cards'} · ${filterText}. Search eBay by multiple print runs at once.`
    : 'Search eBay by multiple print runs at once — plus autograph, rookie, and condition.';

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Fields & Floors Collectors',
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
    // Shared links are user-generated permutations — don't let them dilute
    // the site's own indexed pages.
    robots: { index: false, follow: true },
  };
}

export default function SharedSearchPage() {
  return <HomePage />;
}
