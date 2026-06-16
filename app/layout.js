import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  metadataBase: new URL('https://fieldsandfloors.com'),
  title: {
    default: 'Fields & Floors Collectors',
    template: '%s · Fields & Floors',
  },
  description:
    'A search instrument for sports card collectors. Filter eBay by autograph, print run, and price simultaneously.',
  keywords: [
    'sports cards',
    'card collecting',
    'eBay search',
    'rookie cards',
    'autographed cards',
    'numbered cards',
    'card alerts',
    'sports card hunting',
  ],
  authors: [{ name: 'Fields & Floors' }],
  openGraph: {
    type: 'website',
    siteName: 'Fields & Floors Collectors',
    title: 'Fields & Floors Collectors',
    description:
      'A search instrument for sports card collectors. Filter eBay by autograph, print run, rookie status, and price — then save searches and get alerted the moment a new card lists.',
    url: 'https://fieldsandfloors.com',
    locale: 'en_US',
    // app/opengraph-image.png is auto-detected by Next.js — no explicit image needed
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fields & Floors Collectors',
    description:
      'A search instrument for sports card collectors. Find the diamonds in the rough on eBay.',
    // app/twitter-image.png would override the OG image for Twitter specifically;
    // omitting it falls back to the OG image, which is what we want.
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  // JSON-LD structured data — tells Google and AI engines (ChatGPT, Claude,
  // Perplexity, Gemini) exactly what this site IS, who runs it, and what it
  // offers. Eligible for Google rich results and gets cited verbatim by AI
  // search when someone asks a related question.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieldsandfloors.com/#app',
        name: 'Fields & Floors Collectors',
        url: 'https://fieldsandfloors.com',
        description:
          'A search instrument for sports card collectors. Filters eBay listings by autograph status, print run, rookie cards, condition, and price — features eBay\'s native search does not offer. Save searches and get email alerts the moment a new matching card lists.',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'USD',
            description: 'Unlimited search and watchlist',
          },
          {
            '@type': 'Offer',
            name: 'Base',
            price: '5',
            priceCurrency: 'USD',
            description: 'Automated alerts on saved searches and bid reminders. 14-day free trial.',
          },
        ],
        featureList: [
          'eBay search with advanced filters',
          'Filter by exact print run (/5, /10, /25, /99, /199)',
          'Filter by autographed cards',
          'Filter by rookie cards',
          'Filter by graded vs raw',
          'Save searches and receive email alerts',
          'Bid reminders for tracked auctions',
          'Watchlist with sold-status tracking',
        ],
      },
      {
        '@type': 'Organization',
        '@id': 'https://fieldsandfloors.com/#org',
        name: 'Fields & Floors',
        url: 'https://fieldsandfloors.com',
        logo: 'https://fieldsandfloors.com/icon.png',
        description: 'A search instrument for sports card collectors.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://fieldsandfloors.com/#website',
        url: 'https://fieldsandfloors.com',
        name: 'Fields & Floors Collectors',
        publisher: { '@id': 'https://fieldsandfloors.com/#org' },
        inLanguage: 'en-US',
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
