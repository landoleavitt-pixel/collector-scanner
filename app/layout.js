import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { Analytics } from '@vercel/analytics/react';
import ImageBlockNotice from './components/ImageBlockNotice';
import NativeBridge from './components/NativeBridge';
import TabBar from './components/TabBar';
import FunnelTracker from './components/FunnelTracker';
import SiteTour from './components/SiteTour';

export const metadata = {
  metadataBase: new URL('https://fieldsandfloors.com'),
  title: {
    default: 'Fields & Floors Collectors',
    template: '%s · Fields & Floors',
  },
  description:
    'Search every numbered sports card on eBay by print run, autograph, rookie status and price. Save searches and get an email when a match lists.',
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
      'Search every numbered sports card on eBay by print run, autograph, rookie status and price, then save searches and get an email when a new card lists.',
    url: 'https://fieldsandfloors.com',
    locale: 'en_US',
    // app/opengraph-image.png is auto-detected by Next.js — no explicit image needed
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fields & Floors Collectors',
    description:
      'Search every numbered sports card on eBay by print run, autograph and price.',
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
          'Searches eBay listings by autograph, print run, rookie status, condition and price at the same time, which eBay\'s own search does not offer. Save searches and get email alerts the moment a new matching card lists.',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'CAD',
            description: 'Unlimited search and saved searches, watchlist, and 1 email alert.',
          },
          {
            '@type': 'Offer',
            name: 'Base',
            price: '6.99',
            priceCurrency: 'CAD',
            description: 'Email alerts on up to 5 saved searches and bid reminders. $59 CAD a year option. 14-day free trial.',
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
        description: 'Search every numbered sports card on eBay by print run, autograph and price.',
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
    <html lang="en" suppressHydrationWarning>
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
        {/* Explains blank listing photos when a browser's tracking protection
            blocks eBay's image CDN. Renders nothing unless it detects the
            failures, so it costs nothing for the majority who aren't affected. */}
        <ImageBlockNotice />
        {/* iOS app only: push registration, in-app purchase identity. */}
        <NativeBridge />
        {/* iOS app only: bottom tab bar. Renders nothing on the website. */}
        <TabBar />
        {/* Anonymous funnel events (landed). See lib/track.js. */}
        <FunnelTracker />
        {/* First-visit walkthrough (web + iOS app variants); replay at /?tour=1. */}
        <SiteTour />
        <Analytics />
      </body>
    </html>
  );
}
