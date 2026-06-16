// app/robots.js
// Next.js 14 auto-serves the result of this file as /robots.txt.
//
// What we allow: every public marketing/info page (home, pricing, alerts,
// how-it-works, filters, glossary, contact, reading-list, privacy, terms).
//
// What we block: anything authenticated or API-internal. Crawlers should not
// index login, signup, password reset flows, the watchlist, subscribe-redirect
// page, or any API endpoints. These either require auth, are user-specific,
// or are server-only routes that don't render meaningful content.

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/watchlist',
          '/watchlist-cards',
          '/subscribe',
        ],
      },
    ],
    sitemap: 'https://fieldsandfloors.com/sitemap.xml',
    host: 'https://fieldsandfloors.com',
  };
}
