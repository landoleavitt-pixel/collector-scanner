// app/sitemap.js
// Next.js 14 auto-serves the result of this file as /sitemap.xml.
//
// Listed: only public pages with marketing/informational value that we want
// Google to index and rank. Auth pages, the watchlist, and the subscribe
// shortcut are intentionally excluded — they're either user-specific or
// transient and don't belong in search results.
//
// Priorities reflect what we want to rank for, not what we built first:
// homepage (1.0) and pricing (0.9) are the conversion path; alerts and
// how-it-works are the explainers (0.8); legal pages are necessary but low
// signal (0.3).
//
// changeFrequency is an advisory hint to crawlers, not a hard schedule.

const SITE = 'https://fieldsandfloors.com';

export default function sitemap() {
  const lastModified = new Date();

  return [
    { url: `${SITE}/`,             lastModified, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/pricing`,      lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/alerts`,       lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/how-it-works`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/guides`,       lastModified, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE}/guides/print-runs`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/filters`,      lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/glossary`,     lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/reading-list`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/contact`,      lastModified, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${SITE}/privacy`,      lastModified, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE}/terms`,        lastModified, changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
