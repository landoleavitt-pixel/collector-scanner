// lib/visitState.js
//
// Small localStorage helpers for tailoring the landing page to whether
// someone has been here before.
//
// Why localStorage and not a cookie or the account: most first-time visitors
// are anonymous, so there's no user record to hang this off. localStorage
// survives across sessions (unlike sessionStorage, which the splash
// deliberately does NOT use — we want the splash every visit).
//
// Everything here is wrapped in try/catch: Safari private mode and some
// embedded browsers throw on localStorage access rather than returning null.
// A storage failure should degrade to "treat them as a first-time visitor",
// never break the page.

const VISITED_KEY = 'ffVisited';
const RECENT_KEY = 'ffRecentSearches';
const MAX_RECENT = 5;

/**
 * Has this browser seen the site before? Read this BEFORE calling
 * markVisited(), or the answer is always true.
 */
export function isReturningVisitor() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(VISITED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Record that this browser has now seen the landing page. */
export function markVisited() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VISITED_KEY, '1');
  } catch {
    /* storage unavailable — they'll just see the first-visit page again */
  }
}

/**
 * The visitor's most recent search terms, newest first. Used to replace the
 * generic athlete chips on repeat visits with something actually theirs.
 */
export function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === 'string' && s.trim()).slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

/**
 * Push a term onto the recent list. Case-insensitive dedupe so "caitlin clark"
 * and "Caitlin Clark" don't both occupy a slot; the newest casing wins.
 */
export function addRecentSearch(term) {
  if (typeof window === 'undefined') return;
  const clean = (term || '').trim();
  if (!clean) return;
  try {
    const existing = getRecentSearches().filter(
      (s) => s.toLowerCase() !== clean.toLowerCase(),
    );
    const next = [clean, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
}
