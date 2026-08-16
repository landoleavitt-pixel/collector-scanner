// lib/shareLink.js
//
// Encode a search (query + filters) into a compact, shareable URL, and
// decode one back into the filters shape the home page uses.
//
// Format:  /?q=Caitlin+Clark&runs=5,10,25&auto=1&rc=1&type=auction&cond=graded&min=50&max=500
//
// Design notes:
//  - Short param names keep the link readable and messageable.
//  - Only NON-DEFAULT values are encoded, so a plain keyword search
//    produces just "?q=..." rather than a wall of noise.
//  - Print runs are stored without the leading slash ("5,10,25") because
//    slashes in query strings read badly and invite escaping mistakes.
//  - Decoding is defensive: anything malformed falls back to the default,
//    since these URLs arrive from outside and can be edited by hand.

export const DEFAULT_PRICE_MIN = 0;
export const DEFAULT_PRICE_MAX = 1000;

/**
 * Build a shareable path (e.g. "/?q=...&runs=5,10") from a query + filters.
 * Returns a path only; callers prepend the origin.
 */
export function buildShareParams(query, filters = {}, allPresetRuns = []) {
  const p = new URLSearchParams();
  if (query && query.trim()) p.set('q', query.trim());

  // Print runs — only encode when the user has actually narrowed the set.
  // If every preset is selected, that's the default and not worth encoding.
  if (filters.numberedCards) {
    const runs = [
      ...(Array.isArray(filters.selectedPrintRuns) ? filters.selectedPrintRuns : []),
      ...(Array.isArray(filters.customPrintRuns) ? filters.customPrintRuns : []),
    ]
      .filter((r) => typeof r === 'string' && /^\/\d{1,5}$/.test(r))
      .map((r) => r.slice(1));
    const isAllPresets =
      allPresetRuns.length > 0 &&
      runs.length === allPresetRuns.length &&
      allPresetRuns.every((r) => runs.includes(String(r).replace(/^\//, '')));
    if (runs.length > 0 && !isAllPresets) {
      p.set('runs', [...new Set(runs)].join(','));
    } else if (runs.length > 0) {
      p.set('numbered', '1'); // numbered-only, no specific tier narrowing
    }
  }

  if (filters.autoCards) p.set('auto', '1');
  if (filters.rookieCards) p.set('rc', '1');
  if (filters.listingType && filters.listingType !== 'any') p.set('type', filters.listingType);
  if (filters.condition && filters.condition !== 'any') p.set('cond', filters.condition);

  const min = Number(filters.priceMin);
  const max = Number(filters.priceMax);
  if (Number.isFinite(min) && min > DEFAULT_PRICE_MIN) p.set('min', String(min));
  if (Number.isFinite(max) && max !== DEFAULT_PRICE_MAX) p.set('max', String(max));

  return p.toString();
}

/**
 * Full absolute share URL. Safe to call on the server (falls back to the
 * production origin when window is unavailable).
 */
export function buildShareUrl(query, filters, allPresetRuns = []) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://fieldsandfloors.com';
  const qs = buildShareParams(query, filters, allPresetRuns);
  // Point at /share rather than / — that route is a server component, so it
  // can generate a link-preview image from these same params. It renders the
  // identical home experience underneath.
  return qs ? `${origin}/share?${qs}` : origin;
}

/**
 * True when the URL carries shared-search criteria (as opposed to a saved
 * search deep link or a bare visit).
 */
export function hasShareParams(searchParams) {
  if (!searchParams) return false;
  return ['q', 'runs', 'numbered', 'auto', 'rc', 'type', 'cond', 'min', 'max']
    .some((k) => searchParams.get(k) != null);
}

/**
 * Decode share params into { query, filters }. `baseFilters` supplies the
 * defaults so we only override what the link actually specified.
 */
export function parseShareParams(searchParams, baseFilters, allPresetRuns = []) {
  const filters = { ...baseFilters };
  const query = (searchParams.get('q') || '').trim();

  const runsRaw = searchParams.get('runs');
  if (runsRaw) {
    const runs = runsRaw
      .split(',')
      .map((r) => r.trim())
      .filter((r) => /^\d{1,5}$/.test(r))
      .map((r) => `/${r}`);
    if (runs.length > 0) {
      filters.numberedCards = true;
      // Split into presets vs custom so the tier chips light up correctly.
      const presetSet = new Set(allPresetRuns.map((r) => String(r)));
      filters.selectedPrintRuns = runs.filter((r) => presetSet.has(r));
      filters.customPrintRuns = runs.filter((r) => !presetSet.has(r));
    }
  } else if (searchParams.get('numbered') === '1') {
    filters.numberedCards = true;
  }

  if (searchParams.get('auto') === '1') filters.autoCards = true;
  if (searchParams.get('rc') === '1') filters.rookieCards = true;

  const type = searchParams.get('type');
  if (type === 'buyItNow' || type === 'auction') filters.listingType = type;

  const cond = searchParams.get('cond');
  if (cond === 'raw' || cond === 'graded') filters.condition = cond;

  const min = Number(searchParams.get('min'));
  if (Number.isFinite(min) && min >= 0) filters.priceMin = min;

  const max = Number(searchParams.get('max'));
  if (Number.isFinite(max) && max > 0) filters.priceMax = max;

  return { query, filters };
}
