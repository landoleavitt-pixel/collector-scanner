// lib/domains.js
//
// One domain per side, plus a front door (DECISIONS.md, Umbrella brand):
//   floorsandfables.com (+ www, .ca)  "/" is the chooser (app/choose); other
//                                     paths go to the side's own domain
//   foilsandfables.com  (+ www, .ca)  Foils & Fables: "/" goes to /fables
//   fieldsandfloors.com and anything else (localhost, Vercel previews):
//                                     sports, exactly as before
// Routing lives in middleware.js. Canonical and share URLs stay on
// fieldsandfloors.com for now.

export const SPORTS_ORIGIN = 'https://fieldsandfloors.com';
export const FABLES_ORIGIN = 'https://foilsandfables.com';

const UMBRELLA_HOSTS = ['floorsandfables.com', 'www.floorsandfables.com', 'floorsandfables.ca', 'www.floorsandfables.ca'];
const FABLES_HOSTS = ['foilsandfables.com', 'www.foilsandfables.com', 'foilsandfables.ca', 'www.foilsandfables.ca'];
const SPORTS_HOSTS = ['fieldsandfloors.com', 'www.fieldsandfloors.com'];

const bare = (host) => String(host || '').toLowerCase().split(':')[0];

/** 'umbrella' | 'fables' | 'sports' for a Host header. */
export function siteForHost(host) {
  const h = bare(host);
  if (UMBRELLA_HOSTS.includes(h)) return 'umbrella';
  if (FABLES_HOSTS.includes(h)) return 'fables';
  return 'sports';
}

/** A live side domain, where the chooser page shouldn't be reachable. */
export function isSideDomain(host) {
  const h = bare(host);
  return FABLES_HOSTS.includes(h) || SPORTS_HOSTS.includes(h);
}
