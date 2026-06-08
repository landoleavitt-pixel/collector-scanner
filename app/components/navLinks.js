/* Top-level nav links — single source of truth.
   Imported by Header (client) and Footer (server). Keeping the data
   in a separate, dependency-free module avoids any client/server boundary
   awkwardness from importing a 'use client' file into a server component. */

export const PRODUCT_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/filters', label: 'Filters' },
  { href: '/alerts', label: 'Alerts', badge: 'Soon' },
  { href: '/pricing', label: 'Pricing' },
];

export const HOBBY_LINKS = [
  { href: '/reading-list', label: 'Reading list' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/contact', label: 'Contact' },
];
