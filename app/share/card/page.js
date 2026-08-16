import HomePage from '../../page';

// Landing route for a shared CARD link: /share/card?card=<ebayItemId>
//
// Uses the same ?card= param the home page already understands, so rendering
// HomePage here opens the modal directly — no redirect hop, no flash. The
// reason this route exists at all is metadata: a client component can't read
// searchParams in generateMetadata, so sharing "/?card=123" would always
// show the generic site preview. This server route can, and points the
// preview at /api/og/card so the recipient sees the actual card photo,
// title, and price.

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const id = String(searchParams?.card || '').trim();

  let title = '';
  let price = null;
  let currency = 'USD';

  if (id) {
    try {
      const res = await fetch(
        `https://fieldsandfloors.com/api/listing/${encodeURIComponent(id)}`,
        { next: { revalidate: 300 } },
      );
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          title = data.title || '';
          price = data.price ?? null;
          currency = data.currency || 'USD';
        }
      }
    } catch {
      // Preview degrades to generic copy rather than failing the page.
    }
  }

  const priceLabel =
    price != null && Number.isFinite(Number(price))
      ? `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency !== 'USD' ? ` ${currency}` : ''}`
      : '';

  const ogUrl = id
    ? `https://fieldsandfloors.com/api/og/card?id=${encodeURIComponent(id)}`
    : 'https://fieldsandfloors.com/opengraph-image.png';

  const pageTitle = title
    ? `${title} — Fields & Floors Collectors`
    : 'Shared card — Fields & Floors Collectors';
  const description = [title, priceLabel].filter(Boolean).join(' · ')
    || 'A card worth watching, on Fields & Floors Collectors.';

  return {
    title: pageTitle,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Fields & Floors Collectors',
      title: pageTitle,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogUrl],
    },
    // Individual eBay listings are transient — don't index them.
    robots: { index: false, follow: true },
  };
}

export default function SharedCardPage() {
  return <HomePage />;
}
