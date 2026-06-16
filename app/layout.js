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
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
