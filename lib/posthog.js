// lib/posthog.js
//
// PostHog product analytics (DECISIONS.md "PostHog analytics approved").
// Browser only. Everything here is a no-op unless NEXT_PUBLIC_POSTHOG_KEY is
// set, and PostHog is only downloaded and started while analytics are
// allowed (lib/track.js analyticsAllowed: Usage stats switch on, not one of
// our own browsers, no Do Not Track / Global Privacy Control signal).
//
// What it sends, and what it never does:
//   - Page views for both sides, with a `side` property (sports or fables),
//     and clicks on links and buttons. Autocapture is limited to clicks, and
//     all text and attributes are masked, so no typed text, search words,
//     names or listing titles are recorded.
//   - URLs are cut to the path before they leave the browser: no query
//     string (search words live there), no page title.
//   - Signed-in members: identify(account ID) only. No email, no name.
//   - Session replay is off. Feature flags, surveys, heatmaps, dead-click
//     and exception capture are off, so PostHog loads no extra scripts.
//   - Turning the Usage stats switch off opts out and forgets the PostHog ID;
//     signing out resets it.

import { analyticsAllowed } from './track';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

const GAMES = ['pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana'];

let client = null;
let loading = null;
let identifiedAs = null;

export const posthogConfigured = () => !!KEY;

// URLs keep their origin and path; only our own tag survives from the query.
function cleanUrl(value) {
  try {
    const u = new URL(value, window.location.origin);
    const keep = new URLSearchParams();
    for (const k of ['src', 'utm_source']) {
      const v = u.searchParams.get(k);
      if (v) keep.set(k, v.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32));
    }
    // Which game a card list is for (one of five fixed words), never which card.
    const game = u.searchParams.get('game');
    if (game && GAMES.includes(game)) keep.set('game', game);
    const q = keep.toString();
    return `${u.origin}${u.pathname}${q ? `?${q}` : ''}`;
  } catch {
    return value;
  }
}

// Runs on every event before it is sent.
function scrub(event) {
  if (!event?.properties) return event;
  const props = event.properties;
  for (const k of Object.keys(props)) {
    if (typeof props[k] === 'string' && /^https?:\/\//.test(props[k])) props[k] = cleanUrl(props[k]);
  }
  delete props.$title;
  delete props.title;
  if (event.$set_once) {
    for (const k of Object.keys(event.$set_once)) {
      if (typeof event.$set_once[k] === 'string' && /^https?:\/\//.test(event.$set_once[k])) event.$set_once[k] = cleanUrl(event.$set_once[k]);
    }
    delete event.$set_once.$initial_title;
  }
  return event;
}

function load() {
  if (client) return Promise.resolve(client);
  if (!loading) {
    loading = import('posthog-js')
      .then(({ default: posthog }) => {
        posthog.init(KEY, {
          api_host: HOST,
          // Nothing is sent until we opt in below, once we've checked the rules.
          opt_out_capturing_by_default: true,
          respect_dnt: true,
          persistence: 'localStorage',
          person_profiles: 'identified_only',
          capture_pageview: false, // we send our own, with the side
          capture_pageleave: false,
          // Clicks on links and buttons only; text and attributes masked.
          autocapture: {
            dom_event_allowlist: ['click'],
            element_allowlist: ['a', 'button'],
            capture_copied_text: false,
          },
          mask_all_text: true,
          mask_all_element_attributes: true,
          disable_session_recording: true,
          capture_dead_clicks: false,
          capture_heatmaps: false,
          capture_exceptions: false,
          disable_surveys: true,
          advanced_disable_flags: true,
          disable_external_dependency_loading: true,
          ip: false,
          before_send: scrub,
        });
        client = posthog;
        return posthog;
      })
      .catch(() => {
        loading = null;
        return null;
      });
  }
  return loading;
}

// Bring PostHog in line with the rules: start or resume when allowed, stop and
// forget when not. userId is the account ID (never an email or name).
export async function syncPostHog({ userId, side }) {
  if (!KEY || typeof window === 'undefined') return;
  if (!analyticsAllowed()) {
    if (client) {
      client.reset(); // forget the PostHog ID first, then make sure it stays off
      client.opt_out_capturing();
      identifiedAs = null;
    }
    return;
  }
  const ph = await load();
  if (!ph || !analyticsAllowed()) return;
  if (ph.has_opted_out_capturing()) ph.opt_in_capturing({ captureEventName: false });
  ph.register({ side });
  if (userId && identifiedAs !== userId) {
    ph.identify(userId);
    identifiedAs = userId;
  } else if (!userId && identifiedAs) {
    ph.reset(); // signed out: new random ID. reset() also clears the opt-in, so opt in again
    ph.opt_in_capturing({ captureEventName: false });
    identifiedAs = null;
    ph.register({ side });
  }
}

export function capturePageview(side) {
  if (!client || !analyticsAllowed() || client.has_opted_out_capturing()) return;
  client.capture('$pageview', { side });
}

// A named funnel event (searched, card_opened, starred, signed_up, alert_saved)
// with the side. Only a few short yes/no or fixed-word properties are passed on;
// anything else (search words, names) is dropped here.
const SAFE_PROP = /^(auction|graded|auto|listing|game)$/;
export function captureEvent(name, meta) {
  if (!client || !analyticsAllowed() || client.has_opted_out_capturing()) return;
  const props = { side: window.location.pathname.startsWith('/fables') ? 'fables' : 'sports' };
  for (const [k, v] of Object.entries(meta && typeof meta === 'object' ? meta : {})) {
    if (SAFE_PROP.test(k) && (typeof v === 'boolean' || (typeof v === 'string' && v.length <= 20))) props[k] = v;
  }
  client.capture(name, props);
}
