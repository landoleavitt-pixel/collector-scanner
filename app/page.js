'use client';

import { useState, useEffect, useMemo, useRef, Suspense, createContext, useContext } from 'react';
import { ArrowRight, ArrowUpRight, ArrowUp } from 'lucide-react';
import SaveSearchModal from './components/SaveSearchModal';
import { useUser } from '../lib/useUser';
import { useRouter, useSearchParams } from 'next/navigation';

// Print run tiers — grouped visually by rarity.
// Collectors mentally bucket these by tier, so we present them that way.
const PRINT_RUN_TIERS = [
  { label: 'The Grail',   range: '1–25',    runs: ['/1', '/5', '/10', '/15', '/25'] },
  { label: 'Ultra Rare',  range: '26–99',   runs: ['/49', '/50', '/75', '/99'] },
  { label: 'Rare',        range: '100–249', runs: ['/149', '/150', '/199', '/249'] },
  { label: 'Scarce',      range: '250–999', runs: ['/299', '/499', '/999'] },
];

// Flat list of all preset print runs — used for "select all" default state.
const ALL_PRESET_PRINT_RUNS = PRINT_RUN_TIERS.flatMap((t) => t.runs);

const SUGGESTED_SEARCHES = [
  'Patrick Mahomes',
  'AJ Dybantsa',
  'Caitlin Clark',
  'Luka Doncic',
  'Mike Trout',
  'LeBron James',
  '1986 Fleer Jordan',
  'Ronald Acuna',
];

// Editorial taglines that rotate during loading
const SCANNING_PHRASES = [
  'Scanning the marketplace',
  'Sifting the rare',
  'Hunting print runs',
  'Surfacing finds',
];

/**
 * Extract a print run number from a listing title, OR return null if no real
 * print run is present. Mirrors the server-side verifyPrintRun logic but
 * without a target — we're looking for ANY print run that appears.
 *
 * Rejects false-positive patterns:
 *   - Season years: "2024-25", "2024/25"
 *   - Dates: "5/25/2024"
 *   - Inventory counts: "+New 12/12", "(+NEW 2/02)"
 *   - Card numbers: "Card #25" (just a number, no /)
 */
function detectPrintRun(rawTitle) {
  if (!rawTitle) return null;
  const t = rawTitle.toLowerCase();

  // Find all candidate print-run patterns
  const candidates = [];
  const reSlash = /(?:^|[^0-9a-z])\/\s*(\d{1,4})\b/g;       // "/N" not preceded by digit/letter
  const reHash = /#\s*\d+\s*\/\s*(\d{1,4})\b/g;              // "#5/25"
  // "N/M" — bare format like "2/10", "5/25". Captures BOTH numbers so we can
  // verify N < M (real print run) and not return inventory like "12/12".
  const reBare = /(?:^|[^0-9a-z])(?!0)(\d{1,4})\s*\/\s*(\d{1,4})\b/g;
  const reOf = /\b\d+\s+of\s+(\d{1,4})\b/g;
  const reTo = /\b(?:numbered|limited|serial)\s+to\s+(\d{1,4})\b/g;
  const reNumbered = /\b(?:numbered|limited|serial|ssp|sp)\s+(\d{1,4})\b/g;

  let m;
  // Patterns where the captured group IS the print run (the second number in /N).
  for (const re of [reSlash, reHash, reOf, reTo, reNumbered]) {
    re.lastIndex = 0;
    while ((m = re.exec(t)) !== null) {
      candidates.push({ value: m[1], index: m.index, firstNum: null });
    }
  }
  // Bare N/M pattern — needs special handling: only count if N < M.
  reBare.lastIndex = 0;
  while ((m = reBare.exec(t)) !== null) {
    const firstNum = parseInt(m[1], 10);
    const secondNum = parseInt(m[2], 10);
    const isOneOfOne = firstNum === 1 && secondNum === 1;
    if (firstNum < secondNum || isOneOfOne) {
      candidates.push({ value: m[2], index: m.index, firstNum });
    }
  }

  if (candidates.length === 0) return null;

  // Guards against misreading non-print-run numbers.
  const seasonAround = /(19|20)\d{2}[-/\s]\d{1,4}/;   // 4-digit season: 2023-24, 2022/23
  const dateAround = /\b\d{1,2}\/\d{1,4}\/\d{2,4}\b/;  // dates
  const inventoryAround = /\bnew\s+\d{1,2}\/\d{1,2}\b/;

  // Two-digit season detection (e.g. "22/23", "24/25"). These look exactly
  // like real serial numbers (24/25 is also a valid /25 print run), so the
  // distinguishing signal is POSITION: sellers put the season at the START of
  // the title ("22/23 Bowman Chrome ...") and the serial number LATER, near
  // the parallel/grade ("... Gold 24/25 PSA 10"). So we only treat a
  // consecutive 2-digit N/M as a season when it appears in the first ~30% of
  // the title. Later in the title, the same pattern is a real print run.
  const titleLen = t.length || 1;
  function looksLikeEarlySeason(c) {
    if (c.firstNum == null) return false;           // only applies to bare N/M
    const n = c.firstNum;
    const m = parseInt(c.value, 10);
    const consecutive = m === n + 1;
    const inSeasonRange = n >= 15 && n <= 30 && m >= 15 && m <= 31;
    const positionFrac = c.index / titleLen;
    return consecutive && inSeasonRange && positionFrac < 0.30;
  }

  for (const c of candidates) {
    const window = t.slice(Math.max(0, c.index - 14), c.index + 8);
    if (seasonAround.test(window)) continue;
    if (dateAround.test(window)) continue;
    if (inventoryAround.test(window)) continue;
    if (looksLikeEarlySeason(c)) continue;          // 2-digit season at title start
    return c.value;
  }
  return null;
}

/**
 * Format an ISO end-time as a short, scannable countdown string.
 * Examples: "Ends in 2h 14m", "Ends in 3d 6h", "Ends in 47m", "Ending now"
 * Returns null if the time has passed or input is invalid.
 */
function formatTimeRemaining(isoString) {
  if (!isoString) return null;
  const end = new Date(isoString).getTime();
  if (isNaN(end)) return null;
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return null;
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (days >= 1) {
    return `Ends in ${days}d ${hours}h`;
  }
  if (hours >= 1) {
    return `Ends in ${hours}h ${mins}m`;
  }
  if (mins >= 1) {
    return `Ends in ${mins}m`;
  }
  return 'Ending now';
}

/**
 * Map a print run value to a visual rarity tier — controls color intensity
 * so collectors can scan rarity at a glance. All within the gold family
 * (no jarring color changes) but with enough contrast to distinguish.
 *
 * Returns one of: 'grail', 'ultra', 'rare', 'scarce'
 */
function printRunTier(runValue) {
  const n = parseInt(String(runValue).replace('/', ''), 10);
  if (isNaN(n)) return 'scarce';
  if (n <= 25) return 'grail';
  if (n <= 99) return 'ultra';
  if (n <= 249) return 'rare';
  return 'scarce';
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <WatchlistProvider>
        <Home />
      </WatchlistProvider>
    </Suspense>
  );
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  // Metadata about the last result set — eBay's reported total and whether
  // results were capped by our page ceiling (broad searches). Used to show an
  // honest "showing X of N" note.
  const [resultMeta, setResultMeta] = useState({ ebayTotal: 0, capped: false });
  // App flow state: 'idle' (landing, hero showing) → 'configuring' (user
  // submitted query, filter panel showing) → 'searched' (results showing
  // with compact filter bar above).
  const [appStage, setAppStage] = useState('idle');
  const hasSearched = appStage === 'searched';
  const [scanIdx, setScanIdx] = useState(0);

  const [filters, setFilters] = useState({
    autoCards: false,
    numberedCards: false,
    selectedPrintRuns: ALL_PRESET_PRINT_RUNS, // array — multi-select
    customPrintRuns: [],                       // user-added runs like "/73"
    rookieCards: false,
    listingType: 'any',   // 'any' | 'buyItNow' | 'auction'
    condition: 'any',     // 'any' | 'raw' | 'graded' — title-parsed for PSA/BGS/SGC/CGC
    priceMin: 0,
    priceMax: 1000,
    sortBy: 'printrun-rarest',
  });

  // Snapshot of which filter values are currently APPLIED (i.e., reflected
  // in the result set). Differs from `filters` when the user has changed a
  // toggle since the last Search press. We use this diff to highlight the
  // Search button when changes are pending.
  // sortBy is intentionally excluded — it's client-side and updates instantly.
  const [appliedFilters, setAppliedFilters] = useState(null);

  function filtersDifferFromApplied() {
    if (!appliedFilters) return false;
    const compareKeys = [
      'autoCards', 'numberedCards', 'selectedPrintRuns', 'customPrintRuns',
      'rookieCards', 'listingType', 'condition', 'priceMin', 'priceMax',
    ];
    for (const k of compareKeys) {
      if (JSON.stringify(filters[k]) !== JSON.stringify(appliedFilters[k])) return true;
    }
    return false;
  }

  // Loading phrase rotation
  const phraseTimer = useRef(null);
  useEffect(() => {
    if (loading) {
      phraseTimer.current = setInterval(() => {
        setScanIdx((i) => (i + 1) % SCANNING_PHRASES.length);
      }, 1400);
    } else {
      clearInterval(phraseTimer.current);
      setScanIdx(0);
    }
    return () => clearInterval(phraseTimer.current);
  }, [loading]);

  // Saved search URL loader.
  // When the user clicks "View" on a row in /watchlist, we navigate here with
  // ?savedSearch=<id>. Fetch that search and apply its filters + query, then
  // run the search automatically.
  const savedSearchLoaded = useRef(false);
  useEffect(() => {
    if (savedSearchLoaded.current) return;
    if (userLoading) return;

    const savedSearchId = searchParams.get('savedSearch');
    if (!savedSearchId) return;

    // Mark loaded before the async work so we don't double-fire on re-render
    savedSearchLoaded.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/saved-searches/${savedSearchId}`);
        if (!res.ok) return;
        const { search } = await res.json();
        if (!search) return;

        // Merge saved filters over defaults so any missing keys keep sane values
        const restored = { ...filters, ...(search.filters || {}) };
        setFilters(restored);
        setQuery(search.query);

        // Strip the param from URL so refresh doesn't loop
        router.replace('/', { scroll: false });

        // Run the search with the restored filters (state hasn't flushed yet,
        // so we pass them explicitly).
        handleSearch(search.query, restored);
      } catch {
        // Silently fail — user lands on home page if anything went wrong
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, searchParams]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  // Build the tier/filter chips for the save modal.
  // Maps the in-app filter shape into the simplified tier system used in the
  // modal + watchlist. Print-run tiers are derived from which preset runs are selected.
  function buildSaveChips() {
    const chips = [];
    const selected = new Set(filters.selectedPrintRuns || []);
    const hasGrail = ['/1', '/5', '/10', '/15', '/25'].some((r) => selected.has(r));
    const hasUltra = ['/49', '/50', '/75', '/99'].some((r) => selected.has(r));
    const hasRare = ['/100', '/125', '/150', '/175', '/199', '/249'].some((r) => selected.has(r));
    const hasScarce = ['/250', '/299', '/399', '/499', '/599', '/699', '/799', '/899', '/999'].some((r) => selected.has(r));

    if (filters.numberedCards) {
      if (hasGrail) chips.push({ label: 'Grail · /1—25', tier: 'grail' });
      if (hasUltra) chips.push({ label: 'Ultra · /26—99', tier: 'ultra' });
      if (hasRare) chips.push({ label: 'Rare · /100—249', tier: 'rare' });
      if (hasScarce) chips.push({ label: 'Scarce · /250—999', tier: 'scarce' });
      if (filters.customPrintRuns?.length) {
        chips.push({ label: `+${filters.customPrintRuns.length} custom`, tier: 'neutral' });
      }
    }

    if (filters.autoCards) chips.push({ label: 'Auto', tier: 'neutral' });
    if (filters.rookieCards) chips.push({ label: 'Rookie', tier: 'neutral' });
    if (filters.condition === 'graded') chips.push({ label: 'Graded', tier: 'neutral' });
    if (filters.condition === 'raw') chips.push({ label: 'Raw', tier: 'neutral' });
    if (filters.listingType === 'buyItNow') chips.push({ label: 'Buy It Now', tier: 'neutral' });
    if (filters.listingType === 'auction') chips.push({ label: 'Auction', tier: 'neutral' });

    const min = filters.priceMin || 0;
    const max = filters.priceMax ?? 1000;
    if (min > 0 || max < 1000) {
      chips.push({ label: `$${min}—$${max}`, tier: 'neutral' });
    }

    return chips;
  }

  // Open the save modal — or redirect to login if signed out.
  function handleOpenSave() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/')}`);
      return;
    }
    setSaveModalOpen(true);
  }

  // Called when user submits the query from the landing hero search bar.
  // Advances to the 'configuring' stage where filters are chosen. Does NOT
  // execute the search yet — that happens when the user submits the filter panel.
  function handleQuerySubmit(overrideQuery) {
    const q = (overrideQuery ?? query).trim();
    if (!q) {
      setError('Enter a card name to begin.');
      return;
    }
    if (overrideQuery) setQuery(overrideQuery);
    setError(null);
    setAppStage('configuring');
  }

  async function handleSearch(overrideQuery, overrideFilters) {
    const q = (overrideQuery ?? query).trim();
    if (!q) {
      setError('Enter a card name to begin.');
      return;
    }
    if (overrideQuery) setQuery(overrideQuery);
    const f = overrideFilters || filters;
    setError(null);
    setLoading(true);
    setAppStage('searched');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: q,
          autoCards: f.autoCards,
          numberedCards: f.numberedCards,
          // Combine presets + custom into one array sent to the server
          selectedPrintRuns: [...f.selectedPrintRuns, ...f.customPrintRuns],
          rookieCards: f.rookieCards,
          listingType: f.listingType,
          condition: f.condition,
          priceMin: f.priceMin,
          priceMax: f.priceMax === 5000 ? null : f.priceMax,
          sortBy: f.sortBy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed.');
        setResults([]);
      } else {
        // Store raw results; sorting happens via useMemo so changing the sort
        // option instantly re-orders without re-fetching from eBay.
        setResults(data.items || []);
        setResultMeta({ ebayTotal: data.ebayTotal || 0, capped: !!data.capped });
        // Snapshot the filter values that produced this result set, so we
        // can detect when subsequent edits create "pending changes" relative
        // to what's actually shown.
        setAppliedFilters({ ...f });
      }
    } catch (e) {
      setError('Network error. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (p) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(p);

  // Derived sorted results — re-runs whenever results OR sortBy changes,
  // so changing the sort option instantly re-orders the current results
  // (no need to re-fetch from eBay).
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    const items = [...results];
    switch (filters.sortBy) {
      case 'price-low':
        return items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case 'price-high':
        return items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case 'newest': {
        // We don't have a reliable listed-date field, so fall back to original order
        // (eBay's "newlyListed" sort puts newest first, which is whatever order
        // results arrived in if we requested that sort).
        return items;
      }
      case 'printrun-rarest':
      case 'printrun-common': {
        const ascending = filters.sortBy === 'printrun-rarest';
        return items.sort((a, b) => {
          const aRun = detectPrintRun(a.title);
          const bRun = detectPrintRun(b.title);
          // Listings without a detectable print run go to the end either way
          if (!aRun && bRun) return 1;
          if (aRun && !bRun) return -1;
          if (!aRun && !bRun) return 0;
          const aNum = parseInt(aRun, 10);
          const bNum = parseInt(bRun, 10);
          return ascending ? aNum - bNum : bNum - aNum;
        });
      }
      default:
        return items;
    }
  }, [results, filters.sortBy]);

  return (
    <main className="relative min-h-screen z-10">
      {/* Stage 1: idle landing — hero with search bar, nothing else */}
      {appStage === 'idle' && (
        <Hero
          query={query}
          setQuery={setQuery}
          onSearch={() => handleQuerySubmit()}
          error={error}
          loading={false}
          onSuggested={(s) => handleQuerySubmit(s)}
        />
      )}

      {/* Stage 2: configuring — filter panel replaces the hero. User picks
          Type / Listing / Condition / Price, then submits to search. */}
      {appStage === 'configuring' && (
        <FilterPanel
          query={query}
          setQuery={setQuery}
          filters={filters}
          setFilter={setFilter}
          onSubmit={() => handleSearch()}
          onCancel={() => setAppStage('idle')}
        />
      )}

      {/* Stage 3: searched — results page with sidebar filters */}
      {appStage === 'searched' && (
        <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-10 pb-16 relative z-10 rise">
          {/* Header bar — full width above both columns. Query + count on
              left; sort + new search on right. */}
          <div className="flex flex-wrap items-end justify-between gap-6 pb-6 mb-8 border-b border-[var(--line)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-2">
                Searching · <span className="italic normal-case tracking-normal text-[var(--gold)] ml-1">{query}</span>
              </p>
              <p className="font-display text-4xl md:text-5xl leading-none tracking-tight">
                <span className="text-[var(--gold)] italic">{sortedResults.length}</span>
                <span className="text-[var(--ink-400)] text-2xl md:text-3xl ml-3">
                  {sortedResults.length === 1 ? 'listing' : 'listings'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <SortDropdown
                value={filters.sortBy}
                onChange={(v) => setFilter('sortBy', v)}
              />
              <button
                onClick={handleOpenSave}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] transition-colors"
                style={{
                  border: '0.5px solid var(--gold)',
                  color: 'var(--gold)',
                  background: 'transparent',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                Save this search
              </button>
              <button
                onClick={() => {
                  setAppStage('idle');
                  setQuery('');
                  setResults([]);
                  setError(null);
                  setAppliedFilters(null);
                }}
                className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
              >
                New search
              </button>
            </div>
          </div>

          {/* Two-column layout: 280px sidebar + flexible results */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-x-12 gap-y-8 items-start">
            <ResultsSidebar
              filters={filters}
              setFilter={setFilter}
              onSearch={() => handleSearch()}
              hasPending={filtersDifferFromApplied()}
            />
            <Results
              loading={loading}
              hasSearched={hasSearched}
              results={sortedResults}
              error={error}
              formatPrice={formatPrice}
              scanPhrase={SCANNING_PHRASES[scanIdx]}
              onSuggested={(s) => handleSearch(s)}
              appliedFilters={appliedFilters}
              resultMeta={resultMeta}
            />
          </div>
        </section>
      )}

      <SaveSearchModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        query={query}
        filters={filters}
        chips={buildSaveChips()}
      />
      <BackToTop />
    </main>
  );
}

/* ─────────────────────────────────────────────
   Hero — featured find, oversized type, refined search
   ───────────────────────────────────────────── */
function Hero({ query, setQuery, onSearch, error, loading, onSuggested }) {
  return (
    <section className="relative border-b border-[var(--line-soft)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-14 pb-16 lg:pt-20 lg:pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
          {/* Left: centered block, but words inside are left-aligned */}
          <div className="flex justify-center">
            <div className="text-left inline-block">
              {/* Headline — block centered on the row, text flush left */}
              <h2
                className="font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em] text-balance rise"
                style={{ animationDelay: '0ms' }}
              >
                Autos.
                <br />
                Rookies.
                <br />
                Numbered.
                <br />
                <em className="text-[var(--gold)]">Yours.</em>
              </h2>

              {/* Short subtitle — also left-aligned within the centered block */}
              <p
                className="mt-7 text-[var(--ink-200)] leading-relaxed text-pretty rise"
                style={{ animationDelay: '120ms' }}
              >
                A search instrument for sports card collectors.
              </p>
              <p
                className="mt-2.5 text-sm text-[var(--ink-400)] leading-relaxed text-pretty rise max-w-[440px]"
                style={{ animationDelay: '160ms' }}
              >
                Filter by print run, autograph, and grade — and get alerts when new cards surface.
              </p>

              {/* Search bar — bigger label, vertically centered, larger overall */}
              <div className="mt-12 rise" style={{ animationDelay: '220ms' }}>
                <div className="relative flex items-center">
                  <span className="absolute left-0 text-sm md:text-base uppercase tracking-[0.22em] text-[var(--ink-400)] z-10 font-medium">
                    Search
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && onSearch()}
                  disabled={loading}
                  className="relative w-full pl-28 pr-14 py-6 bg-transparent border-0 border-b border-[var(--line)] text-2xl md:text-3xl font-display text-[var(--ink-100)] focus:outline-none focus:border-[var(--gold)] transition-colors text-left"
                />
                {/* Animated rotating placeholder — only visible when input is empty */}
                {!query && !loading && <RotatingPlaceholder />}
                <button
                  onClick={onSearch}
                  disabled={loading}
                  className="absolute right-0 w-11 h-11 flex items-center justify-center text-[var(--ink-100)] hover:text-[var(--gold)] transition-colors disabled:opacity-30 z-10"
                  aria-label="Search"
                >
                  <ArrowRight className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
              {error && (
                <p className="mt-3 text-xs text-[var(--crit)] text-left">{error}</p>
              )}
            </div>
            </div>
          </div>

          {/* Right: featured find — auto-loads a real Grail card from eBay.
              On mobile, this stacks below the headline at a capped width.
              On desktop, it sits to the right via the parent's grid. */}
          <div className="rise mx-auto max-w-[340px] lg:max-w-none w-full" style={{ animationDelay: '400ms' }}>
            <FeaturedFind />
          </div>
        </div>
      </div>
    </section>
  );
}

/* Rotating animated placeholder for the search bar.
   Cycles through SUGGESTED_SEARCHES with a slide-up fade transition.
   Each entry sits for ~3 seconds before animating in the next one. */
function RotatingPlaceholder() {
  const [idx, setIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % SUGGESTED_SEARCHES.length);
      setAnimKey((k) => k + 1);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <span
      className="absolute left-28 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden"
      style={{ height: '1.5em' }}
    >
      <span
        key={animKey}
        className="block text-2xl md:text-3xl font-display italic text-[var(--ink-600)] rotate-placeholder"
      >
        {SUGGESTED_SEARCHES[idx]}
      </span>
    </span>
  );
}

/* FeaturedFind — auto-loads a real Grail-tier card from eBay via /api/featured.
   The endpoint is server-side cached (1-hour TTL) and rotates athletes hourly,
   so visitors see a real, current high-rarity card without burning eBay quota
   on every page load.

   States:
     - Loading: shimmer placeholder card.
     - Success: real card with image, badges, price, link to the eBay listing.
     - Failure: gracefully hides (since this is decorative, not critical). */
function FeaturedFind() {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/featured');
        if (!res.ok) throw new Error('featured fetch failed');
        const data = await res.json();
        if (!cancelled) {
          if (data.featured) setItem(data.featured);
          else setFailed(true);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (failed) return null; // decorative — gracefully hide on error

  return (
    <figure className="relative">
      <figcaption className="absolute -top-6 left-0 text-[10px] uppercase tracking-[0.3em] text-[var(--ink-400)] flex items-center gap-3">
        <span className="w-4 h-px bg-[var(--ink-400)]" />
        Featured Find · Live from eBay
      </figcaption>

      <a
        href={item?.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block border border-[var(--line)] bg-[var(--bg-elev)] p-5 relative group transition-colors ${item ? 'hover:border-[var(--gold-deep)]' : ''}`}
        style={!item ? { pointerEvents: 'none' } : undefined}
      >
        <CornerMarks />

        {/* Image area */}
        <div className="aspect-[3/4] bg-gradient-to-br from-[var(--bg-elev-2)] via-[#1d180e] to-[#0e0b07] relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 shimmer" />
          )}
          {item && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          )}
        </div>

        {/* Metadata */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <>
              <div className="h-5 w-3/4 bg-[var(--bg-elev-2)] shimmer" />
              <div className="h-3 w-1/2 bg-[var(--bg-elev-2)] shimmer" />
            </>
          ) : item && (
            <>
              <h3 className="font-display text-base leading-snug text-[var(--ink-100)] line-clamp-2 group-hover:text-[var(--gold-bright)] transition-colors">
                {item.title}
              </h3>
              <div className="flex items-end justify-between pt-2 border-t border-[var(--line-soft)]">
                <div className="flex gap-1.5 flex-wrap">
                  {item.hasAuto && <Badge>AUTO</Badge>}
                  <Badge mono tier="grail">/{item.printRun}</Badge>
                  {item.psaGrade && <Badge>PSA {item.psaGrade}</Badge>}
                  {item.bgsGrade && <Badge>BGS {item.bgsGrade}</Badge>}
                  {item.sgcGrade && <Badge>SGC {item.sgcGrade}</Badge>}
                  {item.cgcGrade && <Badge>CGC {item.cgcGrade}</Badge>}
                </div>
                <span className="font-display text-2xl text-[var(--gold)] leading-none">
                  ${Math.round(item.price).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </a>
    </figure>
  );
}

function CornerMarks() {
  const stroke = 'var(--gold-deep)';
  return (
    <>
      <span className="absolute top-2 left-2 w-2 h-2 border-l border-t" style={{ borderColor: stroke }} />
      <span className="absolute top-2 right-2 w-2 h-2 border-r border-t" style={{ borderColor: stroke }} />
      <span className="absolute bottom-2 left-2 w-2 h-2 border-l border-b" style={{ borderColor: stroke }} />
      <span className="absolute bottom-2 right-2 w-2 h-2 border-r border-b" style={{ borderColor: stroke }} />
    </>
  );
}

/* ─────────────────────────────────────────────
   FilterControls — the actual filter UI, used inside both stages.
   Renders Type toggles, conditional Print Run tier picker, Listing,
   Condition, and Price slider sections separated by hairline dividers.
   Sort is intentionally excluded — it lives elsewhere (top-right of results)
   since it updates instantly rather than via Search-press.

   `compact` prop adapts the layout for a narrow sidebar context:
     - Type toggles stack vertically instead of 3-across
     - Print run tiers stack vertically (1 column instead of 4 across)
     - Listing/Condition sections stack vertically and use vertical button
       lists instead of horizontal segmented controls
   ───────────────────────────────────────────── */
function FilterControls({ filters, setFilter, compact = false }) {
  return (
    <div className={compact ? 'space-y-7' : 'space-y-10'}>
      {/* SECTION 1 — Card Type */}
      <div>
        <SectionLabel>Card Type</SectionLabel>
        <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-3'}>
          <TypeToggleCard
            label="Autographed"
            checked={filters.autoCards}
            onChange={(v) => setFilter('autoCards', v)}
          />
          <TypeToggleCard
            label="Rookie Card"
            checked={filters.rookieCards}
            onChange={(v) => setFilter('rookieCards', v)}
          />
          <TypeToggleCard
            label="Numbered"
            checked={filters.numberedCards}
            onChange={(v) => setFilter('numberedCards', v)}
          />
        </div>

        {/* Print Run tier picker — appears only when Numbered is on */}
        {filters.numberedCards && (
          <div
            className="mt-4 p-5 lg:p-6 rise"
            style={{
              animationDuration: '0.4s',
              background: 'rgba(20,17,13,0.3)',
              borderLeft: '2px solid rgba(201,164,71,0.4)',
            }}
          >
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">Print Run</span>
              <button
                onClick={() => {
                  const allSelected = filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length;
                  setFilter('selectedPrintRuns', allSelected ? [] : ALL_PRESET_PRINT_RUNS);
                }}
                className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
              >
                {filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 sm:grid-cols-4 gap-2'}>
              {PRINT_RUN_TIERS.map((tier) => {
                const allInTierSelected = tier.runs.every((r) => filters.selectedPrintRuns.includes(r));
                const someInTierSelected = tier.runs.some((r) => filters.selectedPrintRuns.includes(r));
                const partial = someInTierSelected && !allInTierSelected;
                // Tier color accents on the active border
                const tierKey = tier.label === 'The Grail' ? 'grail'
                  : tier.label === 'Ultra Rare' ? 'ultra'
                  : tier.label === 'Rare' ? 'rare'
                  : 'scarce';
                const tierColors = {
                  grail: '#ffc14d', ultra: '#c8d4e0', rare: '#d6722d', scarce: '#7a8694',
                };

                return (
                  <button
                    key={tier.label}
                    onClick={() => {
                      const next = someInTierSelected
                        ? filters.selectedPrintRuns.filter((r) => !tier.runs.includes(r))
                        : [...filters.selectedPrintRuns, ...tier.runs];
                      setFilter('selectedPrintRuns', next);
                    }}
                    className={`text-left transition-all border ${compact ? 'px-3 py-2.5 flex items-center justify-between gap-3' : 'px-4 py-3'}`}
                    style={{
                      borderColor: allInTierSelected ? tierColors[tierKey] : 'rgba(255,255,255,0.08)',
                      background: someInTierSelected ? 'linear-gradient(135deg, rgba(201,164,71,0.10), rgba(201,164,71,0.02))' : 'rgba(20,17,13,0.5)',
                    }}
                  >
                    <div className={`font-display ${compact ? 'text-sm' : 'text-base'} text-[var(--ink-100)] leading-tight`}>
                      {tier.label}
                      {partial && <span className="ml-1 text-[var(--gold)] text-xs">·</span>}
                    </div>
                    <div className={`font-mono text-[10px] text-[var(--ink-600)] tracking-[0.1em] ${compact ? '' : 'mt-1'}`}>
                      {tier.range.replace('–', ' – ')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom print runs */}
            <div className="mt-4 pt-4 border-t border-[var(--line-soft)]">
              <CustomPrintRunInput
                customRuns={filters.customPrintRuns}
                onAdd={(run) => setFilter('customPrintRuns', [...filters.customPrintRuns, run])}
                onRemove={(run) => setFilter('customPrintRuns', filters.customPrintRuns.filter((r) => r !== run))}
              />
            </div>
          </div>
        )}
      </div>

      <SectionDivider />

      {/* SECTION 2 — Listing + Condition. Side-by-side in panel, stacked in sidebar. */}
      <div className={compact ? 'space-y-7' : 'grid grid-cols-1 md:grid-cols-2 gap-8'}>
        <div>
          <SectionLabel>Listing Type</SectionLabel>
          <SegmentedGroup
            value={filters.listingType}
            onChange={(v) => setFilter('listingType', v)}
            vertical={compact}
            options={[
              ['any', 'Any'],
              ['buyItNow', 'Buy It Now'],
              ['auction', 'Auction'],
            ]}
          />
        </div>
        <div>
          <SectionLabel>Condition</SectionLabel>
          <SegmentedGroup
            value={filters.condition}
            onChange={(v) => setFilter('condition', v)}
            vertical={compact}
            options={[
              ['any', 'Any'],
              ['raw', 'Raw'],
              ['graded', 'Graded'],
            ]}
          />
        </div>
      </div>

      <SectionDivider />

      {/* SECTION 3 — Price */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <SectionLabel className="!mb-0">Price Range</SectionLabel>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-600)]">USD</span>
        </div>
        <PriceRangeSlider
          min={filters.priceMin}
          max={filters.priceMax}
          onChange={(min, max) => {
            setFilter('priceMin', min);
            setFilter('priceMax', max);
          }}
        />
      </div>
    </div>
  );
}

/* Section label — small uppercase eyebrow above each filter section */
function SectionLabel({ children, className = '' }) {
  return (
    <h3 className={`text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-4 font-medium ${className}`}>
      {children}
    </h3>
  );
}

function SectionDivider() {
  return <div className="h-px bg-[var(--line-soft)]" />;
}

/* PriceRangeSlider — two-row min/max slider with prominent USD readout.
   Reuses the existing RangeRow component for the actual slider mechanics. */
function PriceRangeSlider({ min, max, onChange }) {
  return (
    <div>
      {/* Readout — large serif numbers */}
      <div className="flex items-baseline justify-between mb-5 font-display">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-600)] mr-2">Min</span>
          <span className="text-2xl text-[var(--ink-100)]">
            <span className="text-sm text-[var(--ink-600)] mr-1">$</span>{min}
          </span>
        </div>
        <span className="text-[var(--ink-600)] mx-2">—</span>
        <div className="text-right">
          <span className="text-2xl text-[var(--ink-100)]">
            <span className="text-sm text-[var(--ink-600)] mr-1">$</span>{max === 5000 ? '5000+' : max}
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-600)] ml-2">Max</span>
        </div>
      </div>
      {/* Two sliders, one each for min and max */}
      <div className="space-y-4">
        <RangeRow
          label="Min"
          value={min}
          max={2000}
          step={10}
          onChange={(v) => onChange(v, max)}
        />
        <RangeRow
          label="Max"
          value={max}
          max={5000}
          step={50}
          onChange={(v) => onChange(min, v)}
          showPlus
        />
      </div>
    </div>
  );
}

/* Big toggle card — used for Card Type filters */
function TypeToggleCard({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between px-4 py-3.5 transition-all border text-left"
      style={{
        borderColor: checked ? '#c9a447' : 'rgba(255,255,255,0.08)',
        background: checked ? 'linear-gradient(135deg, rgba(201,164,71,0.10), rgba(201,164,71,0.02))' : 'rgba(20,17,13,0.5)',
      }}
    >
      <span className={`text-sm ${checked ? 'text-[var(--ink-100)]' : 'text-[var(--ink-200)]'}`}>
        {label}
      </span>
      <span
        className="relative w-8 h-4 rounded-full transition-colors"
        style={{
          background: checked ? 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)' : 'rgba(255,255,255,0.10)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform"
          style={{
            background: checked ? '#0e0c0a' : '#6a6356',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
  );
}

/* Segmented group — used for Listing Type and Condition rows */
function SegmentedGroup({ value, onChange, options, vertical = false }) {
  if (vertical) {
    // Vertical mode — used in the sidebar where horizontal segmented controls
    // would cramp the column. Each option is its own bordered card stacked
    // top-to-bottom.
    return (
      <div className="flex flex-col gap-1.5">
        {options.map(([v, l]) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="px-3.5 py-2.5 text-[12px] tracking-[0.04em] text-left transition-all border"
              style={
                active
                  ? {
                      borderColor: '#c9a447',
                      background: 'linear-gradient(135deg, rgba(201,164,71,0.10), rgba(201,164,71,0.02))',
                      color: '#f5efe0',
                      fontWeight: 500,
                    }
                  : {
                      borderColor: 'rgba(255,255,255,0.06)',
                      background: 'rgba(20,17,13,0.6)',
                      color: 'var(--ink-400)',
                    }
              }
            >
              {l}
            </button>
          );
        })}
      </div>
    );
  }
  // Horizontal mode — original segmented control for Stage 2 panel.
  return (
    <div className="flex border border-[var(--line-soft)] bg-[var(--bg-elev)]/50">
      {options.map(([v, l], idx) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 px-3 py-3 text-[12px] tracking-[0.06em] transition-colors text-center ${
              idx !== options.length - 1 ? 'border-r border-[var(--line-soft)]' : ''
            }`}
            style={
              active
                ? {
                    background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
                    color: '#1a1612',
                    fontWeight: 600,
                    borderRightColor: 'transparent',
                  }
                : { color: 'var(--ink-400)' }
            }
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FilterPanel — Stage 2: configuring (full takeover).
   ───────────────────────────────────────────── */
function FilterPanel({ query, setQuery, filters, setFilter, onSubmit, onCancel }) {
  return (
    <section className="relative max-w-[1100px] mx-auto px-6 lg:px-10 pt-12 lg:pt-16 pb-16">
      {/* Eyebrow + back link */}
      <div className="flex items-center justify-between mb-9">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)]">
          <span className="inline-block w-6 h-px bg-[var(--gold)] align-middle mr-3 -translate-y-[2px]" />
          Step 02 · Refine
        </p>
        <button
          onClick={onCancel}
          className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* The query — editable inline */}
      <div className="mb-12 rise">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-3">
          Searching for
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          className="w-full font-display text-4xl md:text-5xl bg-transparent border-b border-[var(--line)] focus:border-[var(--gold)] outline-none text-[var(--ink-100)] italic pb-2 transition-colors"
        />
      </div>

      {/* Filter controls */}
      <div className="mb-12 rise" style={{ animationDelay: '120ms' }}>
        <FilterControls filters={filters} setFilter={setFilter} />
      </div>

      {/* Search CTA */}
      <div className="flex justify-between items-center rise" style={{ animationDelay: '220ms' }}>
        <span className="text-[11px] text-[var(--ink-600)]">All filters apply with AND logic</span>
        <button
          onClick={onSubmit}
          className="group inline-flex items-center gap-3 px-9 py-4 transition-all text-sm font-semibold tracking-[0.12em] uppercase"
          style={{
            background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
            color: '#0e0c0a',
          }}
        >
          Search
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ResultsSidebar — Stage 3 left sidebar containing all filters + Search.
   Uses FilterControls in compact mode (toggles + tier picker + listing/
   condition stacked vertically, price slider full-width within column).
   The Search button sits at the bottom of the sidebar with the pending
   pulse animation when filters have unapplied changes.
   ───────────────────────────────────────────── */
function ResultsSidebar({ filters, setFilter, onSearch, hasPending }) {
  return (
    <aside className="border border-[var(--line-soft)] bg-[var(--bg-elev)]/30 px-5 py-6">
      <h2 className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)] mb-5 pb-4 border-b border-[var(--line-soft)]">
        Filters
      </h2>

      <FilterControls filters={filters} setFilter={setFilter} compact />

      {/* Search button — bottom of sidebar */}
      <div className="mt-7 pt-5 border-t border-[var(--line-soft)]">
        <button
          onClick={onSearch}
          className={`group block w-full px-5 py-3 transition-all text-[12px] font-semibold tracking-[0.14em] uppercase text-center ${
            hasPending ? 'pending-pulse' : ''
          }`}
          style={{
            background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
            color: '#0e0c0a',
          }}
        >
          Search →
        </button>
        {hasPending && (
          <p className="text-[10.5px] text-[var(--gold)] italic text-center mt-3 leading-tight">
            Filters changed — press Search
          </p>
        )}
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────
   SortDropdown — placed top-right of results header.
   Sort updates instantly via client-side resort (no API call).
   ───────────────────────────────────────────── */
function SortDropdown({ value, onChange }) {
  const options = [
    ['printrun-rarest', 'Rarest first'],
    ['printrun-common', 'Most common first'],
    ['price-low', 'Price: Low → High'],
    ['price-high', 'Price: High → Low'],
    ['ending-soon', 'Ending soonest'],
    ['newest', 'Newest first'],
  ];
  return (
    <label className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)]">
      <span>Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-b border-[var(--line)] focus:border-[var(--gold)] outline-none pb-1 pr-6 text-[var(--ink-100)] tracking-[0.04em] cursor-pointer appearance-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%23a89870' stroke-width='1.4' d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0 center',
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-[var(--bg-base)] text-[var(--ink-100)]">
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Filters({ filters, setFilter }) {
  // NOTE: This component is now embedded inside FilterPanel's grid layout,
  // so it renders as a fragment of grid children — no outer wrapper with
  // its own spacing. The parent controls layout (1, 2, or 3 columns) via
  // the surrounding grid.
  return (
    <>
      {/* Card type */}
      <div>
        <FilterLabel>Type</FilterLabel>
        <div className="space-y-3">
          <ToggleRow
            label="Autographed"
            checked={filters.autoCards}
            onChange={(v) => setFilter('autoCards', v)}
          />
          <ToggleRow
            label="Rookie card"
            checked={filters.rookieCards}
            onChange={(v) => setFilter('rookieCards', v)}
          />
          <ToggleRow
            label="Numbered"
            checked={filters.numberedCards}
            onChange={(v) => setFilter('numberedCards', v)}
          />
        </div>

        {filters.numberedCards && (
          <div className="mt-5 pl-1 rise" style={{ animationDuration: '0.4s' }}>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)]">
                Print run
              </p>
              <button
                onClick={() => {
                  const allSelected = filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length;
                  setFilter('selectedPrintRuns', allSelected ? [] : ALL_PRESET_PRINT_RUNS);
                }}
                className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-600)] hover:text-[var(--gold)] transition-colors"
              >
                {filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length ? 'Clear all' : 'Select all'}
              </button>
            </div>

            {/* Tier-level toggle buttons — each selects/deselects an entire tier */}
            <div className="space-y-1.5">
              {PRINT_RUN_TIERS.map((tier) => {
                // Tier is "active" if ALL its runs are selected
                const allInTierSelected = tier.runs.every((r) => filters.selectedPrintRuns.includes(r));
                // Tier is "partial" if some but not all are selected
                const someInTierSelected = tier.runs.some((r) => filters.selectedPrintRuns.includes(r));
                const partial = someInTierSelected && !allInTierSelected;

                return (
                  <button
                    key={tier.label}
                    onClick={() => {
                      // Click toggles: if any/all selected, deselect; else select all in tier
                      const next = someInTierSelected
                        ? filters.selectedPrintRuns.filter((r) => !tier.runs.includes(r))
                        : [...filters.selectedPrintRuns, ...tier.runs];
                      setFilter('selectedPrintRuns', next);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-left transition-all border ${
                      allInTierSelected
                        ? 'border-[var(--gold)] bg-[var(--gold)]/[0.06] text-[var(--gold)]'
                        : partial
                          ? 'border-[var(--gold-deep)] bg-[var(--gold)]/[0.02] text-[var(--gold)]/85'
                          : 'border-[var(--line)] text-[var(--ink-400)] hover:text-[var(--ink-100)] hover:border-[var(--ink-400)]'
                    }`}
                  >
                    <span className="text-sm">{tier.label}</span>
                    <span className="font-mono text-[10px] tracking-wider opacity-80">
                      {tier.range}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom print run section */}
            <div className="mt-5 pt-4 border-t border-[var(--line-soft)]">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-600)] mb-2">
                Custom
              </p>
              <CustomPrintRunInput
                customRuns={filters.customPrintRuns}
                onAdd={(val) => {
                  if (!filters.customPrintRuns.includes(val)) {
                    setFilter('customPrintRuns', [...filters.customPrintRuns, val]);
                  }
                }}
                onRemove={(val) => {
                  setFilter('customPrintRuns', filters.customPrintRuns.filter((r) => r !== val));
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Listing type */}
      <div>
        <FilterLabel>Listing</FilterLabel>
        <div className="space-y-2">
          {[
            ['any', 'Any listing'],
            ['buyItNow', 'Buy It Now only'],
            ['auction', 'Auctions only'],
          ].map(([value, label]) => {
            const active = filters.listingType === value;
            return (
              <button
                key={value}
                onClick={() => setFilter('listingType', value)}
                className={`flex items-center gap-3 w-full text-left text-sm py-1 transition-colors ${
                  active ? 'text-[var(--gold)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active ? 'bg-[var(--gold)]' : 'bg-[var(--line)]'
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Condition — Raw vs Graded. Detected by title parsing on the server
          for PSA / BGS / SGC / CGC. Title-only detection (eBay's Graded aspect
          is too inconsistent to be useful). */}
      <div>
        <FilterLabel>Condition</FilterLabel>
        <div className="space-y-2">
          {[
            ['any', 'Any condition'],
            ['raw', 'Raw only'],
            ['graded', 'Graded only'],
          ].map(([value, label]) => {
            const active = filters.condition === value;
            return (
              <button
                key={value}
                onClick={() => setFilter('condition', value)}
                className={`flex items-center gap-3 w-full text-left text-sm py-1 transition-colors ${
                  active ? 'text-[var(--gold)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active ? 'bg-[var(--gold)]' : 'bg-[var(--line)]'
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <FilterLabel>Price</FilterLabel>
        <div className="space-y-5">
          <RangeRow
            label="Min"
            value={filters.priceMin}
            max={2000}
            step={10}
            onChange={(v) => setFilter('priceMin', v)}
          />
          <RangeRow
            label="Max"
            value={filters.priceMax}
            max={5000}
            step={50}
            onChange={(v) => setFilter('priceMax', v)}
            showPlus
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <FilterLabel>Sort</FilterLabel>
        <div className="space-y-2">
          {[
            ['price-low', 'Price, low to high'],
            ['price-high', 'Price, high to low'],
            ['printrun-rarest', 'Rarest print run first'],
            ['printrun-common', 'Largest print run first'],
            ['newest', 'Newly listed'],
          ].map(([value, label]) => {
            const active = filters.sortBy === value;
            return (
              <button
                key={value}
                onClick={() => setFilter('sortBy', value)}
                className={`flex items-center gap-3 w-full text-left text-sm py-1 transition-colors ${
                  active ? 'text-[var(--gold)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active ? 'bg-[var(--gold)]' : 'bg-[var(--line)]'
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function FilterSectionHeader({ label, number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-3 mb-2">
      <span className="font-display text-lg">{label}</span>
      <span className="font-mono text-[10px] text-[var(--ink-600)] tracking-wider">{number}</span>
    </div>
  );
}

function FilterLabel({ children }) {
  return (
    <h3 className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-4">
      {children}
    </h3>
  );
}

/* Custom print run input — supports multi-select.
   User can add multiple oddball runs (/73, /88, /42) — each appears as a chip
   that can be removed individually. */
function CustomPrintRunInput({ customRuns, onAdd, onRemove }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  function handleAdd() {
    const trimmed = val.trim();
    if (!trimmed) {
      setErr('');
      return;
    }
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num < 1 || num > 9999) {
      setErr('Enter a number between 1 and 9999');
      return;
    }
    setErr('');
    onAdd('/' + num);
    setVal('');
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[var(--ink-400)]">/</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. 73"
          className="flex-1 min-w-0 bg-transparent border-b border-[var(--line)] focus:border-[var(--gold)] outline-none font-mono text-[11px] py-1 text-[var(--ink-100)] placeholder:text-[var(--ink-600)] transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!val.trim()}
          className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)] disabled:text-[var(--ink-600)] disabled:cursor-not-allowed hover:text-[var(--gold-bright)] transition-colors"
        >
          Add
        </button>
      </div>

      {/* Render added custom runs as removable chips */}
      {customRuns && customRuns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {customRuns.map((run) => (
            <button
              key={run}
              onClick={() => onRemove(run)}
              className="inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] text-[var(--gold)] bg-[var(--gold)]/[0.08] border border-[var(--gold-deep)] hover:bg-[var(--gold)]/[0.14] transition-colors"
              title="Click to remove"
            >
              {run}
              <span className="text-[var(--ink-400)] text-xs leading-none">×</span>
            </button>
          ))}
        </div>
      )}

      {err && <p className="text-[10px] text-[#d4684a] mt-1.5">{err}</p>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="group flex items-center justify-between w-full py-1.5 text-left"
    >
      <span
        className={`text-sm transition-colors ${
          checked ? 'text-[var(--ink-100)]' : 'text-[var(--ink-200)] group-hover:text-[var(--ink-100)]'
        }`}
      >
        {label}
      </span>
      <span
        className={`relative w-7 h-3.5 rounded-full transition-colors ${
          checked ? 'bg-[var(--gold)]' : 'bg-[var(--line)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-[var(--bg-base)] rounded-full transition-transform ${
            checked ? 'translate-x-[14px]' : ''
          }`}
        />
      </span>
    </button>
  );
}

function RangeRow({ label, value, max, step, onChange, showPlus }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)]">{label}</span>
        <span className="font-mono text-xs text-[var(--ink-100)]">
          ${value}{showPlus && value === max ? '+' : ''}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Results — refined cards with badge system
   ───────────────────────────────────────────── */
// Floating button that appears after scrolling down, returns to top on click.
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
      style={{
        background: 'var(--bg-elev)',
        border: '0.5px solid var(--gold-deep)',
        color: 'var(--gold)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <ArrowUp className="w-4 h-4" strokeWidth={1.6} />
    </button>
  );
}

const PAGE_DISPLAY_SIZE = 200; // how many cards to render at once

function Results({ loading, hasSearched, results, error, formatPrice, scanPhrase, onSuggested, appliedFilters, resultMeta }) {
  // How many cards are currently shown. Resets to the first page whenever a new
  // result set arrives (keyed on result count + first id below).
  const [shown, setShown] = useState(PAGE_DISPLAY_SIZE);

  // Reset the visible count when the result set changes.
  const firstId = results[0]?.id;
  useEffect(() => {
    setShown(PAGE_DISPLAY_SIZE);
  }, [results.length, firstId]);

  if (loading) return <LoadingState phrase={scanPhrase} />;
  if (!hasSearched) return <ResolveState onSuggested={onSuggested} />;
  if (!loading && hasSearched && results.length === 0 && !error)
    return <NoResultsState onSuggested={onSuggested} appliedFilters={appliedFilters} />;

  const capped = resultMeta?.capped;
  const visible = results.slice(0, shown);
  const remaining = results.length - visible.length;

  return (
    <div>
      {capped && (
        <p className="text-[11px] text-[var(--ink-500)] mb-4 leading-relaxed">
          Showing the first {results.length} matches. This is a broad search —
          narrow with filters like print run, auto, or condition to surface the
          rarest cards.
        </p>
      )}
      <div className="divide-y divide-[var(--line-soft)]">
        {visible.map((item, i) => (
          <ResultCard key={item.id} item={item} formatPrice={formatPrice} index={i} />
        ))}
      </div>

      {remaining > 0 && (
        <div className="pt-8 flex flex-col items-center gap-3">
          <span className="text-[11px] tracking-[0.14em] uppercase" style={{ color: 'var(--ink-600)' }}>
            Showing {visible.length} of {results.length}
          </span>
          <button
            onClick={() => setShown((n) => n + PAGE_DISPLAY_SIZE)}
            className="text-[11px] uppercase tracking-[0.2em] px-6 py-3 rounded-full transition-opacity hover:opacity-90"
            style={{ border: '0.5px solid rgba(201,149,74,0.5)', color: 'var(--gold)' }}
          >
            Load {Math.min(PAGE_DISPLAY_SIZE, remaining)} more
          </button>
        </div>
      )}
    </div>
  );
}

// Compute the badge/snapshot metadata for a listing, so the watchlist tile
// can render the same badges the result card shows without re-deriving.
function buildBadgePayload(item) {
  const title = item.title || '';
  const lower = title.toLowerCase();
  const printRun = detectPrintRun(title);
  return {
    printRun: printRun || null,
    tier: printRun ? printRunTier(printRun) : null,
    auto: /\bauto\b|autograph|signed/.test(lower),
    rookie: /\brookie/.test(lower) || /\brc\b/.test(lower) || /\b1st\s+bowman\b/.test(lower),
    psa: title.match(/PSA\s*(\d{1,2})/i)?.[1] || null,
    bgs: title.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || null,
    sgc: title.match(/SGC\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || null,
    cgc: title.match(/CGC\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || null,
    isAuction: !!item.isAuction,
    isBuyItNow: !!item.isBuyItNow,
  };
}

// Shared watchlist state — fetched ONCE and shared with every star, instead of
// each star fetching the whole list on mount (which caused dozens of identical
// requests on a results page). Provides the set of saved listing IDs + toggle.
const WatchlistContext = createContext(null);

function WatchlistProvider({ children }) {
  const { user } = useUser();
  const [savedIds, setSavedIds] = useState(() => new Set());

  // Fetch the user's watchlist once when they're known.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    fetch('/api/watchlist?status=all')
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((d) => {
        if (cancelled) return;
        setSavedIds(new Set((d.listings || []).map((l) => String(l.listing_id))));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const isSaved = (id) => savedIds.has(String(id));

  const markSaved = (id) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });

  const markUnsaved = (id) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });

  return (
    <WatchlistContext.Provider value={{ isSaved, markSaved, markUnsaved }}>
      {children}
    </WatchlistContext.Provider>
  );
}

// Star toggle that saves/removes a listing from the user's watchlist.
// Lives inside the result card's <a>, so clicks must not trigger the link.
function WatchStar({ item }) {
  const { user } = useUser();
  const router = useRouter();
  const ctx = useContext(WatchlistContext);
  const [busy, setBusy] = useState(false);

  const saved = ctx ? ctx.isSaved(item.id) : false;

  async function toggle(e) {
    // Critical: stop the parent <a> from navigating to eBay.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    // Logged-out users get sent to login.
    if (!user) {
      router.push('/login');
      return;
    }

    setBusy(true);
    // Optimistic update so the UI feels instant
    if (saved) ctx?.markUnsaved(item.id);
    else ctx?.markSaved(item.id);

    try {
      if (saved) {
        await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: item.id,
            title: item.title,
            price: item.price,
            currency: item.currency || 'USD',
            image_url: item.image,
            listing_url: item.url,
            badges: buildBadgePayload(item),
          }),
        });
      }
    } catch {
      // Revert optimistic update on failure
      if (saved) ctx?.markSaved(item.id);
      else ctx?.markUnsaved(item.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
      style={{
        background: 'rgba(10,9,7,0.55)',
        backdropFilter: 'blur(4px)',
        border: `0.5px solid ${saved ? 'var(--gold)' : 'rgba(201,149,74,0.3)'}`,
        color: saved ? 'var(--gold-bright)' : 'var(--ink-400)',
      }}
    >
      <span style={{ fontSize: '15px', lineHeight: 1 }}>{saved ? '★' : '☆'}</span>
    </button>
  );
}

function ResultCard({ item, formatPrice, index }) {
  // Heuristic badge detection from title
  const title = (item.title || '').toLowerCase();
  const hasAuto = /\bauto\b|autograph|signed/.test(title);
  const hasRookie = /\brookie/.test(title) || /\brc\b/.test(title) || /\b1st\s+bowman\b/.test(title);
  // Print run detection — strict, to match the server-side verifier.
  // Looks for real print run patterns, rejects years/dates/inventory counts.
  const printRun = detectPrintRun(item.title || '');
  const tier = printRun ? printRunTier(printRun) : null;
  const psaMatch = item.title?.match(/PSA\s*(\d{1,2})/i);
  const bgsMatch = item.title?.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i);
  const sgcMatch = item.title?.match(/SGC\s*(\d{1,2}(?:\.\d)?)/i);
  const cgcMatch = item.title?.match(/CGC\s*(\d{1,2}(?:\.\d)?)/i);

  // Tier-based row treatment — distinct hues per tier so each is unmistakable
  // at a glance (not just lighter/darker variants of the same color).
  //   Grail   — warm rich gold
  //   Ultra   — cool platinum-blue
  //   Rare    — deep bronze-orange
  //   Scarce  — steel-gray
  // Applied as background gradient + left border on the link element.
  const TIER_ROW_STYLES = {
    grail:  { bg: 'linear-gradient(90deg, rgba(255,180,30,0.42) 0%, rgba(245,200,80,0.15) 22%, transparent 55%)', border: '#ffc14d' },
    ultra:  { bg: 'linear-gradient(90deg, rgba(180,200,220,0.28) 0%, rgba(210,220,230,0.08) 18%, transparent 40%)', border: '#c8d4e0' },
    rare:   { bg: 'linear-gradient(90deg, rgba(200,90,30,0.24) 0%, rgba(220,110,50,0.06) 16%, transparent 32%)', border: '#d6722d' },
    scarce: { bg: 'linear-gradient(90deg, rgba(80,90,100,0.18) 0%, transparent 24%)', border: '#5a6470' },
  };
  const tierStyle = tier ? TIER_ROW_STYLES[tier] : null;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block py-10 rise pl-4 md:pl-5"
      style={tierStyle ? {
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        backgroundImage: tierStyle.bg,
        borderLeft: `2px solid ${tierStyle.border}`,
      } : { animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* 3-column layout — title+badges+meta on left, image center as visual
          focal point, price + CTA on right. items-center vertically aligns
          all three columns so the row stays visually balanced even when the
          title block grows tall. */}
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_200px_1fr] gap-6 md:gap-7 items-center">
        {/* Left column: title, badges, meta */}
        <div className="min-w-0 order-2 md:order-1">
          <h3 className="font-display text-xl md:text-2xl leading-[1.15] text-[var(--ink-100)] group-hover:text-[var(--gold-bright)] transition-colors mb-4">
            {item.title}
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.isAuction && (
              <Badge auction>
                {item.bidCount != null ? `${item.bidCount} BIDS` : 'AUCTION'}
              </Badge>
            )}
            {hasAuto && <Badge>AUTO</Badge>}
            {hasRookie && <Badge>RC</Badge>}
            {printRun && <Badge mono tier={printRunTier(printRun)}>/{printRun}</Badge>}
            {psaMatch && <Badge>PSA {psaMatch[1]}</Badge>}
            {bgsMatch && <Badge>BGS {bgsMatch[1]}</Badge>}
            {sgcMatch && <Badge>SGC {sgcMatch[1]}</Badge>}
            {cgcMatch && <Badge>CGC {cgcMatch[1]}</Badge>}
            {!hasAuto && !hasRookie && !printRun && !psaMatch && !bgsMatch && !sgcMatch && !cgcMatch && item.condition && (
              <Badge subtle>{item.condition}</Badge>
            )}
          </div>
          {/* Single prose meta line — seller, feedback, listing type. */}
          <div className="text-[11px] leading-relaxed text-[var(--ink-400)]">
            {item.seller && (
              <span className="normal-case">{item.seller}</span>
            )}
            {item.sellerFeedback != null && (
              <>
                <span className="text-[var(--ink-600)] mx-2">·</span>
                <span>{Number(item.sellerFeedback).toFixed(1)}% feedback</span>
              </>
            )}
            {(item.isBuyItNow || item.isAuction) && (
              <>
                <span className="text-[var(--ink-600)] mx-2">·</span>
                {item.isAuction && !item.isBuyItNow && <span>Auction</span>}
                {item.isBuyItNow && !item.isAuction && <span>Buy It Now</span>}
                {item.isAuction && item.isBuyItNow && <span>Auction · or BIN</span>}
              </>
            )}
            {item.endTime && item.isAuction && (
              <>
                <span className="text-[var(--ink-600)] mx-2">·</span>
                <span className="text-[var(--gold)] uppercase tracking-[0.1em]">{formatTimeRemaining(item.endTime)}</span>
              </>
            )}
          </div>
        </div>

        {/* Center column: image, the visual focal point */}
        <div className="order-1 md:order-2 mx-auto md:mx-0">
          <div className="relative aspect-[3/4] w-[160px] md:w-[200px] bg-[var(--bg-elev)] overflow-hidden">
            <CornerMarks />
            <WatchStar item={item} />
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--ink-600)] font-display text-4xl italic">
                ◇
              </div>
            )}
            {item.isAuction && (
              <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.18em] text-[var(--gold)] bg-[var(--bg-base)]/85 backdrop-blur-sm px-1.5 py-0.5 border border-[var(--gold-deep)]/30">
                Live
              </span>
            )}
          </div>
        </div>

        {/* Right column: price + CTA, vertically centered to image */}
        <div className="text-left md:text-right order-3">
          <div className="font-display text-4xl md:text-5xl leading-none text-[var(--ink-100)] group-hover:text-[var(--gold-bright)] transition-colors">
            {formatPrice(item.price)}
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)] group-hover:text-[var(--gold)] transition-colors">
            View on eBay
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.6} />
          </div>
        </div>
      </div>
    </a>
  );
}

function Badge({ children, mono, subtle, auction, tier }) {
  let className;
  let inlineStyle;
  if (auction) {
    // Auction: warm red-amber to feel like a "live" indicator, distinct from gold
    className = 'border-[#c97a3a] text-[#e6a86b] bg-[#c97a3a]/[0.10]';
  } else if (tier === 'grail') {
    // Grail tier (/1–/25) — rich warm gold
    className = 'text-[#1a1612] font-bold';
    inlineStyle = {
      borderColor: '#ffc14d',
      backgroundImage: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
    };
  } else if (tier === 'ultra') {
    // Ultra Rare tier (/26–/99) — cool platinum-blue
    className = 'text-[#1a1612] font-bold';
    inlineStyle = {
      borderColor: '#c8d4e0',
      backgroundImage: 'linear-gradient(180deg, #e0e8f0 0%, #98a5b3 100%)',
    };
  } else if (tier === 'rare') {
    // Rare tier (/100–/249) — deep bronze-orange
    className = 'text-[#1a1612] font-bold';
    inlineStyle = {
      borderColor: '#d6722d',
      backgroundImage: 'linear-gradient(180deg, #d6884a 0%, #8e4f1f 100%)',
    };
  } else if (tier === 'scarce') {
    // Scarce tier (/250–/999) — steel-gray
    className = 'text-[#1a1612] font-semibold';
    inlineStyle = {
      borderColor: '#5a6470',
      backgroundImage: 'linear-gradient(180deg, #8a96a4 0%, #4a5360 100%)',
    };
  } else if (subtle) {
    className = 'border-[var(--line)] text-[var(--ink-400)]';
  } else {
    // Default — for AUTO, RC, PSA, BGS, SGC, CGC
    className = 'border-[var(--gold-deep)] text-[var(--gold-bright)] bg-[var(--gold)]/[0.06]';
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] tracking-[0.1em] border ${className} ${mono ? 'font-mono uppercase' : 'uppercase'}`}
      style={inlineStyle}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────
   State components — empty, loading, no-results
   ───────────────────────────────────────────── */
function ResolveState({ onSuggested }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lg">Begin</span>
        <span className="font-mono text-[10px] text-[var(--ink-600)] tracking-wider">02</span>
      </div>
      <p className="font-display italic text-2xl text-[var(--ink-200)] leading-relaxed text-balance max-w-md">
        The marketplace awaits. Try a search above, or one of these.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-y-2 gap-x-6 max-w-md">
        {SUGGESTED_SEARCHES.map((s, i) => (
          <button
            key={s}
            onClick={() => onSuggested(s)}
            className="group flex items-center gap-2 text-left py-1 text-sm text-[var(--ink-200)] hover:text-[var(--gold)] transition-colors"
          >
            <span className="font-mono text-[10px] text-[var(--ink-600)] group-hover:text-[var(--gold)] transition-colors">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="border-b border-transparent group-hover:border-[var(--gold)] pb-0.5">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingState({ phrase }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lg">Searching</span>
        <span className="font-mono text-[10px] text-[var(--gold)] tracking-wider shimmer">●</span>
      </div>
      <p key={phrase} className="font-display italic text-2xl text-[var(--ink-200)] rise" style={{ animationDuration: '0.5s' }}>
        {phrase}…
      </p>
      <div className="mt-10 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-6 opacity-50">
            <div className="w-[120px] md:w-[160px] aspect-[3/4] bg-[var(--bg-elev)] shimmer" style={{ animationDelay: `${i * 200}ms` }} />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-5 bg-[var(--bg-elev)] w-3/4 shimmer" style={{ animationDelay: `${i * 200 + 100}ms` }} />
              <div className="h-3 bg-[var(--bg-elev)] w-1/3 shimmer" style={{ animationDelay: `${i * 200 + 200}ms` }} />
              <div className="h-3 bg-[var(--bg-elev)] w-1/2 shimmer" style={{ animationDelay: `${i * 200 + 300}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoResultsState({ onSuggested, appliedFilters }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lg">No matches</span>
        <span className="font-mono text-[10px] text-[var(--ink-600)] tracking-wider">00</span>
      </div>
      <p className="font-display italic text-2xl text-[var(--ink-200)] leading-snug text-balance max-w-md">
        No results found with your current filters. Adjust them and try again.
      </p>
    </div>
  );
}
