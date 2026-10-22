// lib/track.js
//
// Browser-side funnel tracking. track(event, meta) never throws and never
// blocks the UI: it hands a tiny JSON body to the browser (sendBeacon, or
// fetch with keepalive) and returns immediately.
//
// Privacy: anonymous only. The visitor id is a random string kept in
// localStorage. Do NOT put emails, names, search text or player names in
// `meta`; event names and filter types only. The server drops anything that
// looks personal, but don't rely on that.
//
// Events (fixed list, enforced by /api/track):
//   landed, searched, card_opened, starred, signed_up, trial_started

const ANON_KEY = 'ff_anon';
let memoryId = null; // fallback when localStorage is unavailable

function randomId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function getAnonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    if (!memoryId) memoryId = randomId();
    return memoryId;
  }
}

// Respect browser privacy signals.
function optedOut() {
  try {
    return navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  } catch {
    return false;
  }
}

export function track(event, meta, source) {
  try {
    if (typeof window === 'undefined' || optedOut()) return;
    const body = JSON.stringify({
      event,
      anon_id: getAnonId(),
      source: source || undefined,
      path: window.location.pathname,
      meta: meta && typeof meta === 'object' ? meta : undefined,
    });
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      if (ok) return;
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never break the page.
  }
}

// Fire at most once per browser tab session (e.g. "landed").
export function trackOnce(key, event, meta, source) {
  try {
    const flag = `ff_t_${key}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, '1');
  } catch {
    // No sessionStorage: fall through and send; a rare duplicate is fine.
  }
  track(event, meta, source);
}

// Where did this visit come from? A ?src= / utm_source tag wins; otherwise
// the referring site's hostname (no path, no query); otherwise 'direct'.
export function visitSource() {
  try {
    const p = new URLSearchParams(window.location.search);
    const tag = p.get('src') || p.get('utm_source');
    if (tag) return tag.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32) || 'direct';
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== window.location.hostname.replace(/^www\./, '')) return host.slice(0, 32);
    }
  } catch {}
  return 'direct';
}
