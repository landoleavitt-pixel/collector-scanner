// lib/posthogQuery.js
//
// Server only. Reads PostHog numbers for /admin/visitors (HogQL query API).
//
//   POSTHOG_PERSONAL_API_KEY  a PostHog personal API key with read-only query
//                             scope (secret: Vercel env var, never in the browser)
//   POSTHOG_PROJECT_ID        the PostHog project's number
//   POSTHOG_API_HOST          optional, default https://eu.posthog.com (the EU app
//                             host, not the eu.i.posthog.com ingestion host)
//
// The key is only ever used in the Authorization header of the request made
// here. It is never returned, logged or put in an error message.

const DEFAULT_HOST = 'https://eu.posthog.com';
const TIMEOUT_MS = 20000;

export function posthogQueryConfig(env = process.env) {
  const key = env.POSTHOG_PERSONAL_API_KEY?.trim();
  const project = env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !project || !/^\d+$/.test(project)) return null;
  const host = (env.POSTHOG_API_HOST?.trim() || DEFAULT_HOST).replace(/\/+$/, '');
  return { key, project, host };
}

/** Run one HogQL query. Returns rows (arrays), or throws an Error that says only the HTTP status. */
export async function runHogQL(query, { env = process.env, fetchImpl = fetch } = {}) {
  const cfg = posthogQueryConfig(env);
  if (!cfg) throw new Error('PostHog is not configured');
  const res = await fetchImpl(`${cfg.host}/api/projects/${cfg.project}/query/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PostHog answered ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

// ── The queries ────────────────────────────────────────────────────────
// `side` is a property we send on every page view and event (sports or fables).
// Counts are people (PostHog person), not page views. N is a whole number we
// choose, never user input.

const since = (days) => `timestamp >= now() - INTERVAL ${Number(days)} DAY`;

export const queries = {
  // Visitors per day, per side.
  daily: (days) => `
    SELECT toString(toDate(timestamp)) AS day, properties.side AS side, count(DISTINCT person_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND ${since(days)}
    GROUP BY day, side
    ORDER BY day`,

  // Where visitors came from: our own ?src= / utm_source tag, else the site
  // that sent them, else direct.
  sources: (days) => `
    SELECT properties.side AS side,
      coalesce(
        nullIf(properties.$utm_source, ''),
        nullIf(extract(properties.$current_url, 'src=([a-z0-9_.-]+)'), ''),
        nullIf(properties.$referring_domain, '$direct'),
        'direct') AS source,
      count(DISTINCT person_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND ${since(days)}
    GROUP BY side, source
    ORDER BY visitors DESC
    LIMIT 60`,

  // Pages opened (path only: the query string never reaches PostHog).
  pages: (days) => `
    SELECT properties.side AS side, properties.$pathname AS path, count() AS views
    FROM events
    WHERE event = '$pageview' AND ${since(days)}
    GROUP BY side, path
    ORDER BY views DESC
    LIMIT 60`,

  // Card lists and checklists on Foils & Fables, by game. We keep the game
  // (a fixed set of five) but never which card.
  lists: (days) => `
    SELECT properties.$pathname AS path,
      coalesce(nullIf(extract(properties.$current_url, 'game=([a-z]+)'), ''), 'pokemon') AS game,
      count() AS opens
    FROM events
    WHERE event = '$pageview' AND ${since(days)}
      AND properties.$pathname IN ('/fables/lists', '/fables/checklist')
    GROUP BY path, game
    ORDER BY opens DESC`,

  // People who did each thing, per side.
  funnel: (days) => `
    SELECT properties.side AS side, event, count(DISTINCT person_id) AS people
    FROM events
    WHERE event IN ('$pageview', 'searched', 'card_opened', 'alert_saved') AND ${since(days)}
    GROUP BY side, event`,
};
