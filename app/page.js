'use client';

import { useState, useEffect, useMemo, useRef, Suspense, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

/* Upscale eBay thumbnail URLs from the small default (~225px) to a sharper 640px
   version. eBay encodes the size as `s-l\d+` in the filename; we just swap it.
   Safe no-op for non-eBay URLs or missing/empty inputs. */
function upscaleEbayImage(url) {
  if (!url) return url;
  return url.replace(/\/s-l\d+\.(\w+)/, '/s-l640.$1');
}
import { ArrowRight, ArrowUpRight, ArrowUp } from 'lucide-react';
import SaveSearchModal from './components/SaveSearchModal';
import BidCountdown from './components/BidCountdown';
import CardModal from './components/CardModal';
import { tierForRun, tierChipStyle, OUTLINE_CHIP_STYLE } from './components/rarityUtils';
import { WatchlistContext, WatchlistProvider } from '../lib/watchlistContext';
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
  // When editing a saved search (?editSearch=<id>): holds {id, name, notify_enabled}
  // so the FilterPanel can show the edit eyebrow / CTA, and SaveSearchModal
  // can PATCH instead of POST. null = create-new behavior.
  const [editingSearch, setEditingSearch] = useState(null);
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
  // App flow state: 'idle' (landing, hero showing) → 'configuring' (user
  // adjusting filters) → 'searched' (results visible).
  //
  // 'transition' is a brief in-between state used when arriving via a deep
  // link (?savedSearch= or ?editSearch=) — it suppresses the idle hero so
  // the landing page doesn't flash before the useEffect below resolves
  // the saved search and switches to the correct stage.
  //
  // We read `searchParams` (the Next.js router-aware hook called above)
  // here in the useState init so the very first render sees the deep-link
  // case. Using window.location.search instead would race the client-side
  // navigation — at first mount, window.location can still hold the
  // previous route's URL even though the React tree is mounting the new one.
  const [appStage, setAppStage] = useState(() => {
    if (searchParams?.get('savedSearch') || searchParams?.get('editSearch')) {
      return 'transition';
    }
    return 'idle';
  });
  const hasSearched = appStage === 'searched';
  const [scanIdx, setScanIdx] = useState(0);

  // Mobile filter drawer + sort sheet (lg:hidden). Desktop keeps the sidebar.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  // "Search with new filters?" modal — fires when user leaves the filter
  // panel/drawer with unapplied changes, or tries to interact with stale
  // results on desktop. Cancelling reverts filters to the applied set.
  const [pendingSearchOpen, setPendingSearchOpen] = useState(false);

  // ── Card detail modal ─────────────────────────────────────────────
  // selectedCardItem holds the full item object for the currently-open
  // modal. URL is the source of truth (?card=<id>); this state reflects
  // whatever matches the URL param against current results.
  // selectedExpired is set when the URL specifies a card id that doesn't
  // appear in current results — we show the "listing expired" state.
  const [selectedCardItem, setSelectedCardItem] = useState(null);
  const [selectedExpired, setSelectedExpired] = useState(false);

  function openCard(item) {
    if (!item || !item.id) return;
    setSelectedCardItem(item);
    setSelectedExpired(false);
    // Sync URL — use replace so back-button-to-close works without
    // adding a history entry per open. Preserve any existing query
    // string (search terms, filters, etc.) by reading current params.
    if (typeof window !== 'undefined') {
      const next = new URLSearchParams(window.location.search);
      next.set('card', item.id);
      const href = `${window.location.pathname}?${next.toString()}`;
      window.history.pushState({ cardOpen: true }, '', href);
    }
  }

  function closeCard() {
    setSelectedCardItem(null);
    setSelectedExpired(false);
    if (typeof window !== 'undefined') {
      const next = new URLSearchParams(window.location.search);
      next.delete('card');
      const qs = next.toString();
      const href = `${window.location.pathname}${qs ? '?' + qs : ''}`;
      // Use back() when the modal added a history entry so the user's
      // browser history is left clean. Falls back to replace() if we
      // somehow lost that state marker.
      if (window.history.state?.cardOpen) {
        window.history.back();
      } else {
        window.history.replaceState({}, '', href);
      }
    }
  }

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

  function revertFiltersToApplied() {
    if (!appliedFilters) return;
    Object.entries(appliedFilters).forEach(([k, v]) => setFilter(k, v));
  }

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktopViewport(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (mobileFiltersOpen) return;
    if (!appliedFilters) return;
    if (!isDesktopViewport) return;
    setPendingSearchOpen(filtersDifferFromApplied());
  }, [filters, appliedFilters, mobileFiltersOpen, isDesktopViewport]);

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
  // ?savedSearch=<id>  → View: load filters + run the search automatically.
  // ?editSearch=<id>   → Edit: load filters into the FilterPanel and stop
  //                      there. No eBay call. The CTA becomes "Update search
  //                      criteria" which opens SaveSearchModal in edit mode.
  const savedSearchLoaded = useRef(false);
  useEffect(() => {
    if (savedSearchLoaded.current) return;
    if (userLoading) return;

    const viewId = searchParams.get('savedSearch');
    const editId = searchParams.get('editSearch');
    if (!viewId && !editId) return;

    // Mark loaded before the async work so we don't double-fire on re-render
    savedSearchLoaded.current = true;

    (async () => {
      try {
        const id = editId || viewId;
        const res = await fetch(`/api/saved-searches/${id}`);
        if (!res.ok) return;
        const { search } = await res.json();
        if (!search) return;

        // Merge saved filters over defaults so any missing keys keep sane values
        const restored = { ...filters, ...(search.filters || {}) };
        setFilters(restored);
        setQuery(search.query);

        // Strip the param from URL so refresh doesn't loop
        router.replace('/', { scroll: false });

        if (editId) {
          // Edit mode: hand off to the FilterPanel (Stage 2). No search runs.
          setEditingSearch({
            id: search.id,
            name: search.name,
            notify_enabled: search.notify_enabled,
          });
          setAppStage('configuring');
        } else {
          // View mode: run the search with the restored filters (state hasn't
          // flushed yet, so pass them explicitly).
          handleSearch(search.query, restored);
        }
      } catch {
        // Silently fail — user lands on home page if anything went wrong
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, searchParams]);

  // ── Card modal: reconcile URL → modal state ──────────────────────
  // Watches ?card=<id> and opens the matching item if found in current
  // results. If the id is present but no match → expired state. Empty
  // param closes the modal. Runs whenever search params or results
  // change, so a fresh search that includes the URL's card id will
  // promote the modal from expired → real automatically.
  useEffect(() => {
    const cardId = searchParams.get('card');
    if (!cardId) {
      setSelectedCardItem(null);
      setSelectedExpired(false);
      return;
    }
    const match = results.find((r) => r.id === cardId);
    if (match) {
      setSelectedCardItem(match);
      setSelectedExpired(false);
    } else if (results.length > 0 || appStage === 'searched') {
      // Results have loaded but the id isn't among them → expired
      setSelectedCardItem({ id: cardId, title: '', url: '', image: null });
      setSelectedExpired(true);
    }
  }, [searchParams, results, appStage]);

  // ── Card modal: back-button closes ───────────────────────────────
  // The browser back button needs to close the modal cleanly.
  // Because we pushState on open, the popstate fires when the user
  // hits back, dropping us into a state where the ?card param is no
  // longer in the URL. We just clear local state — the URL is already
  // correct.
  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search);
      if (!sp.get('card')) {
        setSelectedCardItem(null);
        setSelectedExpired(false);
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
      {/* FAQ structured data — gets quoted directly by ChatGPT, Claude,
          Perplexity, and Gemini when users ask related questions, and is
          eligible for Google FAQ rich results. Answers are written to be
          self-contained so they read well in any context (search snippet,
          AI quote, voice assistant). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is Fields & Floors Collectors?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Fields & Floors Collectors is a search tool for sports card collectors. It filters eBay listings by autograph, print run, rookie status, condition, and price — features eBay\'s native search does not offer. Users can save searches and get email alerts when new matching cards list.',
                },
              },
              {
                '@type': 'Question',
                name: 'How does Fields & Floors filter eBay listings differently?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'eBay\'s native search caps results at 200 listings and lacks filters for exact print run (/5, /10, /99), autograph status, and rookie cards. Fields & Floors pre-filters at the API level so the most relevant cards reach you, and post-filters with pattern matching to reject false positives like dates or inventory numbers being mistaken for print runs.',
                },
              },
              {
                '@type': 'Question',
                name: 'What does Fields & Floors cost?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Searching is free, including the watchlist. Automated alerts on saved searches and bid reminders require the Base plan at $5 per month, with a 14-day free trial. Premium and Pro tiers are planned but not yet available.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is a print run on a sports card?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A print run is how many copies of that specific card were produced. Numbered cards like /99 or /25 are stamped individually (e.g. "47/99") and are rarer and typically more valuable than unnumbered base cards. Common print run tiers are: /1 (one-of-one), /5–/25 (grail), /26–/99 (ultra rare), /100–/499 (rare), and /500+ (scarce).',
                },
              },
              {
                '@type': 'Question',
                name: 'How do alerts work?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'After saving a search with your filters, Fields & Floors polls eBay once per hour for matching listings. The moment a new listing matches every filter — player, print run, condition, price ceiling — you get an email. This applies on up to 5 saved searches with the Base plan.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is Fields & Floors affiliated with eBay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. Fields & Floors uses eBay\'s public Browse API to display real eBay listings, and clicking a listing takes you to eBay to complete the purchase. We are an independent search tool, not an eBay product or partner.',
                },
              },
            ],
          }),
        }}
      />
      <SplashIntro />
      {/* Synchronous, blocking script that runs BEFORE the body paints.
          Detects deep-link URLs (?savedSearch= / ?editSearch= from the
          watchlist Edit/View flow) and marks <html> so CSS can hide the
          idle stage. Without this, a statically-prerendered home page
          paints the landing hero for ~1s before React hydrates and
          transitions to the correct stage. Runs in <5ms, safe to inline. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var s=new URLSearchParams(window.location.search);if(s.get('savedSearch')||s.get('editSearch'))document.documentElement.classList.add('ff-deep-link');}catch(e){}`,
        }}
      />
      {/* Stage 1: idle landing — hero with search bar, then the why-section.
          data-ff-idle hides this via CSS when the deep-link class is set. */}
      {appStage === 'idle' && (
        <div data-ff-idle>
          <Hero
            query={query}
            setQuery={setQuery}
            onSearch={() => handleQuerySubmit()}
            error={error}
            loading={false}
            onSuggested={(s) => handleQuerySubmit(s)}
            user={user}
            onCardClick={openCard}
            onChipSearch={(chipQuery, partialFilters) => {
              // Apply the matching filters and run the search immediately. The
              // selected filters remain visible in the Stage 3 results sidebar,
              // so the visitor sees BOTH which toggles produced the example and
              // the resulting cards — no extra click needed.
              const merged = { ...filters, ...partialFilters };
              setFilters(merged);
              handleSearch(chipQuery, merged);
            }}
          />
          <WhyFields user={user} />
        </div>
      )}

      {/* Stage 2: configuring — filter panel replaces the hero. User picks
          Type / Listing / Condition / Price, then submits to search. */}
      {appStage === 'configuring' && (
        <div className="stage-in">
          <FilterPanel
            query={query}
            setQuery={setQuery}
            filters={filters}
            setFilter={setFilter}
            onSubmit={() => {
              if (editingSearch) {
                // Edit mode: jump straight to the update-confirm modal,
                // never run an eBay search from the edit flow.
                setSaveModalOpen(true);
              } else {
                handleSearch();
              }
            }}
            onCancel={() => {
              if (editingSearch) {
                // Cancel an edit → drop back to /watchlist instead of /
                setEditingSearch(null);
                router.push('/watchlist');
              } else {
                setAppStage('idle');
              }
            }}
            editingSearch={editingSearch}
          />
        </div>
      )}

      {/* Stage 3: searched — results page with sidebar filters */}
      {appStage === 'searched' && (
        <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-10 pb-16 relative z-10 stage-in">
          {/* Header bar — full width above both columns.
              The searched player name is the big editable headline; click it
              to type a new name and run another search without scrolling
              back to the hero. Listing count moves to a subtitle. */}
          <div className="flex flex-wrap items-end justify-between gap-6 pb-6 mb-8 border-b border-[var(--line)]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-2">
                Searching for
              </p>
              <EditableSearchHeading
                value={query}
                onSubmit={(next) => {
                  const trimmed = (next || '').trim();
                  if (!trimmed || trimmed === query) return;
                  setQuery(trimmed);
                  handleSearch(trimmed);
                }}
              />
              <p className="text-[12px] uppercase tracking-[0.22em] mt-3" style={{ color: 'var(--ink-400)' }}>
                <span style={{ color: 'var(--gold)' }} className="italic normal-case tracking-normal">
                  {sortedResults.length}
                </span>{' '}
                {sortedResults.length === 1 ? 'listing' : 'listings'}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden lg:block">
                <SortDropdown
                  value={filters.sortBy}
                  onChange={(v) => setFilter('sortBy', v)}
                />
              </div>
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

          {/* Mobile-only filter + sort bar (sticky). Desktop uses the sidebar. */}
          <MobileFilterBar
            activeCount={countActiveFilters(filters)}
            onOpenFilters={() => setMobileFiltersOpen(true)}
            onOpenSort={() => setMobileSortOpen(true)}
          />

          {/* Two-column layout: 280px sidebar + flexible results */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-x-12 gap-y-8 items-start">
            <div className="hidden lg:block">
              <ResultsSidebar
                filters={filters}
                setFilter={setFilter}
                onSearch={() => handleSearch()}
                hasPending={filtersDifferFromApplied()}
              />
            </div>
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
              hasPendingFilters={filtersDifferFromApplied()}
              onPendingClick={() => setPendingSearchOpen(true)}
              onCardClick={openCard}
            />
          </div>

          {/* Mobile filter drawer + sort sheet (lg:hidden, rendered last so they overlay) */}
          <MobileFilterDrawer
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            onCloseWithChanges={() => {
              // Drawer detected filter changes — close it and show the modal.
              setMobileFiltersOpen(false);
              setPendingSearchOpen(true);
            }}
            filters={filters}
            setFilter={setFilter}
            onSearch={() => { handleSearch(); setMobileFiltersOpen(false); }}
          />
          <MobileSortSheet
            open={mobileSortOpen}
            onClose={() => setMobileSortOpen(false)}
            value={filters.sortBy}
            onChange={(v) => { setFilter('sortBy', v); setMobileSortOpen(false); }}
          />

          {/* "Search with new filters?" modal — centered, dimmed overlay
              on BOTH mobile and desktop (PendingSearchModal portals to body). */}
          <PendingSearchModal
            open={pendingSearchOpen}
            floating={isDesktopViewport}
            onSearch={() => { setPendingSearchOpen(false); handleSearch(); }}
            onCancel={() => { setPendingSearchOpen(false); revertFiltersToApplied(); }}
            onDismiss={() => { setPendingSearchOpen(false); }}
          />
        </section>
      )}

      <SaveSearchModal
        open={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          // If the user closes mid-edit (Cancel or X), clear edit state so a
          // later "Save this search" click doesn't accidentally PATCH.
          if (editingSearch) setEditingSearch(null);
        }}
        query={query}
        filters={filters}
        chips={buildSaveChips()}
        editingSearch={editingSearch}
      />
      {/* Card detail modal — opens when a result is tapped or when
          ?card=<id> is in the URL. Pass printRun so the rarity tree
          can highlight the correct universal tier even when our set
          database doesn't recognize the listing. */}
      {selectedCardItem && (
        <CardModal
          item={selectedCardItem}
          printRun={selectedExpired ? null : detectPrintRun(selectedCardItem.title || '')}
          onClose={closeCard}
          expired={selectedExpired}
        />
      )}
      <BackToTop />
    </main>
  );
}

/* ─────────────────────────────────────────────
   Hero — featured find, oversized type, refined search
   ───────────────────────────────────────────── */
/* Splash intro — the brand large and centered with the "Holy Grail search
   engine" subtitle, then flying up to dock into the header's top-left brand
   position. "Collectors" fades in only once the brand has landed. The real
   header brand stays hidden until landing, so the flying title is the only
   one on screen. Plays once per browser session; the played flag is set on
   COMPLETION (not start) so React Strict Mode's dev-only double-mount can't
   strand the overlay. Skipped for reduced-motion users. */
function SplashIntro() {
  const [phase, setPhase] = useState('boot'); // 'boot' | 'in' | 'dock' | 'skip'
  const brandRef = useRef(null);
  const subRef = useRef(null);

  useEffect(() => {
    const core = document.querySelector('[data-ff-brand]');
    const coll = document.querySelector('[data-ff-collectors]');

    let skip = false;
    try {
      // Skip the splash when arriving via a Watchlist Edit/View click — those
      // land at /?savedSearch= or /?editSearch= and immediately transition to
      // a different stage, so playing the splash would just be a 2.6s detour.
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('savedSearch') || sp.get('editSearch')) skip = true;
      // Respect accessibility preferences.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        skip = true;
      }
    } catch (e) {
      skip = true;
    }
    if (skip) { setPhase('skip'); return; }

    // Hide the real header brand while the splash plays — the flying title
    // is the only one visible until it lands.
    if (core) core.style.opacity = '0';
    if (coll) coll.style.opacity = '0';
    setPhase('in');

    const t = setTimeout(() => {
      const el = brandRef.current;
      if (core && el) {
        // FLIP: measure start and target, animate the transform between them
        // (left edges aligned, scaled to the header brand's height).
        const from = el.getBoundingClientRect();
        const to = core.getBoundingClientRect();
        const scale = to.height / from.height;
        el.style.transformOrigin = 'left center';
        el.style.transition = 'transform 0.85s cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.transform = `translate(${to.left - from.left}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(${scale})`;
      }
      if (subRef.current) subRef.current.style.opacity = '0';
      setPhase('dock');

      setTimeout(() => {
        // Landed: swap in the real brand, then fade "Collectors" in after it.
        if (core) { core.style.transition = 'opacity 0.2s'; core.style.opacity = '1'; }
        if (coll) { coll.style.transition = 'opacity 0.5s ease 0.2s'; coll.style.opacity = '1'; }
        setPhase('skip');
      }, 900);
    }, 1700);

    return () => {
      // Strict Mode / unmount cleanup: cancel and restore the header brand.
      clearTimeout(t);
      if (core) core.style.opacity = '';
      if (coll) coll.style.opacity = '';
    };
  }, []);

  if (phase === 'skip') return null;

  // Pre-decision frame: a plain base-color cover so the header title never
  // flashes before the splash takes over.
  if (phase === 'boot') {
    return <div className="fixed inset-0 z-50" style={{ background: 'var(--bg-base)' }} />;
  }

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: phase === 'dock' ? 'none' : 'auto' }}>
      {/* Background layer fades away during the flight, revealing the page
          beneath while the brand is still airborne. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--bg-base)',
          transition: 'opacity 0.5s ease 0.2s',
          opacity: phase === 'dock' ? 0 : 1,
        }}
      />
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <div
          ref={brandRef}
          className="font-display text-[clamp(2.4rem,9vw,3.8rem)] tracking-tight leading-none rise"
          style={{ animationDelay: '120ms' }}
        >
          Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors
        </div>
        <div
          ref={subRef}
          className="mt-5 text-[11px] tracking-[0.32em] uppercase text-[var(--gold)] rise"
          style={{ animationDelay: '520ms', transition: 'opacity 0.3s ease', fontFamily: 'ui-monospace, monospace' }}
        >
          A Holy Grail search engine
        </div>
      </div>
    </div>
  );
}

function Hero({ query, setQuery, onSearch, error, loading, onSuggested, onChipSearch, user, onCardClick }) {
  return (
    <section className="relative border-b border-[var(--line-soft)] overflow-hidden">
      {/* Above the fold — explainer-first hero. Headline names the value
          ("better way to find rare sports cards"), sub-line spells out the
          differentiator (multiple print runs at once) and the watchlist
          win. Search bar sits beneath, anchoring the action. */}
      {/* Hero wrapper: dynamic viewport height (100dvh) so it accounts for
          mobile browser chrome — `min-h-screen` (100vh) lies on iOS Safari
          and leaks the next section into view. Position-relative so the
          scroll cue can absolutely-anchor to the bottom edge below. */}
      <div className="relative min-h-[100dvh] flex flex-col justify-center max-w-[820px] mx-auto px-6 lg:px-10 pt-8 pb-24">
        <h1
          className="font-display italic text-center text-[clamp(2.1rem,6vw,3.6rem)] leading-[1.05] tracking-[-0.01em] rise"
          style={{ animationDelay: '120ms' }}
        >
          A better way to find <em className="text-[var(--gold-bright)]">rare sports cards.</em>
        </h1>

        {/* Sub-line — the plain-language explanation. Bolds the actual
            differentiator (multiple print runs at once) and previews the
            watchlist value without overpromising paid-only alerts. */}
        <p
          className="mt-5 text-center text-[15px] md:text-base leading-relaxed max-w-[580px] mx-auto rise"
          style={{ color: 'var(--ink-200)', animationDelay: '200ms' }}
        >
          Search eBay by{' '}
          <strong className="font-medium" style={{ color: 'var(--gold-bright)' }}>
            multiple print runs at once
          </strong>{' '}
          — plus autograph, rookie, and condition. Save anything you want to keep an eye on.
        </p>

        {/* Search bar — editorial underline style, centered block */}
        <div className="mt-10 rise" style={{ animationDelay: '280ms' }}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && onSearch()}
              disabled={loading}
              className="relative w-full pl-14 pr-14 py-5 bg-transparent border-0 border-b border-[var(--line)] text-2xl md:text-3xl font-display text-[var(--ink-100)] focus:outline-none focus:border-[var(--gold)] transition-colors text-center"
            />
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
          {error && <p className="mt-3 text-xs text-[var(--crit)]">{error}</p>}
        </div>

        {/* Example athletes — tapping one auto-advances to the filter stage */}
        <div className="mt-9 rise" style={{ animationDelay: '420ms' }}>
          <div
            className="text-[10px] uppercase tracking-[0.24em] text-center mb-3 font-mono"
            style={{ color: 'var(--ink-600)' }}
          >
            Or try
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2.5">
            {['Caitlin Clark', 'Victor Wembanyama', 'Connor Bedard', 'Cooper Flagg', 'Paul Skenes'].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSuggested(name)}
                disabled={loading}
                className="text-[13px] px-4 py-2 rounded-full transition-colors disabled:opacity-40"
                style={{ border: '0.5px solid var(--line)', color: 'var(--ink-200)', background: 'var(--bg-elev)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-deep)'; e.currentTarget.style.color = 'var(--gold-bright)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-200)'; }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Returning-user shortcuts only show to logged-in users. For
            anonymous visitors, the gold-bordered CTA strip below the hero
            handles the call-to-action instead. */}
        {user && (
          <div className="mt-10 flex justify-center gap-8 rise" style={{ animationDelay: '560ms' }}>
            <Link
              href="/watchlist"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
            >
              <span className="text-[var(--gold)]">◎</span> My hunts
            </Link>
            <Link
              href="/watchlist-cards"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
            >
              <span className="text-[var(--gold)]">★</span> Watchlist
            </Link>
          </div>
        )}
      </div>

      {/* Scroll cue — pinned to the bottom edge of the hero section itself
          (not inside the centered flex column above). This is what actually
          makes it sit flush with the bottom of the viewport regardless of
          how tall the headline/search/chips content is — the centered-stack
          approach left the arrow floating mid-screen on short content. */}
      <a
        href="#why"
        className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 rise group"
        style={{ animationDelay: '700ms', textDecoration: 'none' }}
      >
        <span
          className="text-[11px] uppercase tracking-[0.28em] transition-colors group-hover:text-[var(--gold-bright)]"
          style={{ color: 'var(--gold)' }}
        >
          How it works
        </span>
        <span
          className="bob flex items-center justify-center rounded-full transition-colors group-hover:bg-[rgba(201,149,74,0.10)]"
          style={{
            width: 44, height: 44,
            border: '0.5px solid var(--gold-deep)',
            color: 'var(--gold-bright)',
            fontSize: 22,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          ↓
        </span>
      </a>

      {/* Below the fold — the live featured Grail pull from eBay.
          (FeaturedFind has its own "Featured Find · Live from eBay" caption,
          so we don't add a duplicate header here.) */}
      <div className="max-w-[1040px] mx-auto px-6 lg:px-10 pb-16 pt-8">
        <div className="mx-auto max-w-[360px] rise" style={{ animationDelay: '820ms' }}>
          <FeaturedFind onCardClick={onCardClick} />
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
      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden flex items-center justify-center text-center"
      style={{ height: '2.4em' }}
    >
      <span
        key={animKey}
        className="block text-2xl md:text-3xl font-display italic text-[var(--ink-600)] rotate-placeholder text-center"
        style={{ lineHeight: 1.4, paddingBottom: '0.15em' }}
      >
        {SUGGESTED_SEARCHES[idx]}
      </span>
    </span>
  );
}

/* WhyFields — Direction C layout.
   Three equal-height columns, each carrying its own mini-artifact so no
   column has dead space. Step 1 shows the multi-tier filter picker
   (demonstrates the rarity color system). Step 2 shows two watchlist
   rows (active + sold). Step 3 shows the saved-search card. The email
   preview gets its own dedicated section below for full readable width. */
function WhyFields({ user }) {
  return (
    <>
      {/* Free-account CTA strip — sits between hero and how-it-works. Only
          shown to logged-out visitors; signed-in users already converted. */}
      {!user && <FreeAccountCTA />}

      <section id="why" className="relative max-w-[1040px] mx-auto px-6 lg:px-10 py-16 lg:py-24 scroll-mt-24">
        <div className="text-[10px] tracking-[0.22em] uppercase mb-3.5" style={{ color: 'var(--gold)', fontFamily: 'ui-monospace, monospace' }}>
          How it works
        </div>
        <h2 className="font-display italic text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.02em] mb-10">
          Three steps.
        </h2>

        {/* Three balanced columns — each gets an artifact so heights match */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-12">
          {/* Step 01 — multi-tier filter picker */}
          <div
            className="rounded-[10px] p-6 flex flex-col"
            style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line-soft)' }}
          >
            <div className="font-mono text-[11px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>01</div>
            <h4 className="font-display italic text-[19px] mt-2 mb-1.5">Set your tier</h4>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              Pick the print runs you want and stack on autos, rookies, condition.
            </p>
            <FilterPickerArtifact />
          </div>

          {/* Step 02 — watchlist rows */}
          <div
            className="rounded-[10px] p-6 flex flex-col"
            style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line-soft)' }}
          >
            <div className="font-mono text-[11px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>02</div>
            <h4 className="font-display italic text-[19px] mt-2 mb-1.5">Save what catches your eye</h4>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              Add listings to your watchlist. We keep price and status fresh.
            </p>
            <WatchlistArtifact />
          </div>

          {/* Step 03 — saved-search card */}
          <div
            className="rounded-[10px] p-6 flex flex-col"
            style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line-soft)' }}
          >
            <div className="font-mono text-[11px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>03</div>
            <h4 className="font-display italic text-[19px] mt-2 mb-1.5">Upgrade to be alerted</h4>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-400)' }}>
              Save your filters — we'll email you when a match lists.
            </p>
            <div className="mt-4 flex-1">
              <SavedSearchExampleCard />
            </div>
          </div>
        </div>
      </section>

      {/* Plans — three-tier breakdown with full feature lists in each tier
          and gold-highlighted items showing what's NEW at each level. */}
      <PlansSection user={user} />
    </>
  );
}

/* Step 1 artifact — the multi-tier filter picker. Demonstrates that
   different print runs map to different rarity tiers (gold/silver/copper/gray).
   Visitors learn the color system at a glance. */
function FilterPickerArtifact() {
  const chipBase = 'font-mono text-[9px] px-1.5 py-[2px] rounded';
  return (
    <div
      className="mt-4 rounded-lg p-3.5 flex-1"
      style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--line-soft)' }}
    >
      <div
        className="font-mono text-[8.5px] tracking-[0.18em] uppercase mb-2"
        style={{ color: 'var(--ink-500)' }}
      >
        Print runs
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        <TierChip run="/5" />
        <TierChip run="/10" />
        <TierChip run="/25" />
        <TierChip run="/50" />
        <TierChip run="/99" />
        <TierChip run="/199" />
        <TierChip run="/499" />
      </div>
      <div
        className="font-mono text-[8.5px] tracking-[0.18em] uppercase mb-2"
        style={{ color: 'var(--ink-500)' }}
      >
        Toggles
      </div>
      <div className="flex flex-wrap gap-1">
        <span className={chipBase} style={{ ...OUTLINE_CHIP_STYLE, letterSpacing: '0.14em' }}>Auto</span>
        <span className={chipBase} style={{ ...OUTLINE_CHIP_STYLE, letterSpacing: '0.14em' }}>RC</span>
        <span className={chipBase} style={{ ...OUTLINE_CHIP_STYLE, letterSpacing: '0.14em' }}>Graded</span>
      </div>
    </div>
  );
}

/* Step 2 artifact — two watchlist rows showing different rarity tiers.
   First row is an active /25 (grail); second is a sold /99 (ultra). Shows
   the watchlist auto-refreshes status. */
function WatchlistArtifact() {
  const cardImg = {
    width: 44, height: 56, borderRadius: 4, flex: 'none',
    background: 'radial-gradient(ellipse at 30% 30%, rgba(255,217,122,0.18) 0%, transparent 60%), linear-gradient(140deg, #3a2e1f 0%, #1a1310 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--gold-deep)', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 18,
  };
  const Row = ({ tierRun, toggle, title, meta }) => (
    <div
      className="rounded-lg p-2.5 flex gap-2.5 items-center"
      style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--line-soft)' }}
    >
      <div style={cardImg}>◇</div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 mb-1">
          <TierChip run={tierRun} />
          {toggle && (
            <span
              className="font-mono text-[9px] px-1.5 py-[2px] rounded"
              style={{ ...OUTLINE_CHIP_STYLE, letterSpacing: '0.14em' }}
            >
              {toggle}
            </span>
          )}
        </div>
        <div className="text-[11px] leading-snug mb-1" style={{ color: 'var(--ink-200)' }}>{title}</div>
        <div
          className="font-mono text-[8.5px] tracking-[0.14em] uppercase"
          style={{ color: 'var(--gold)' }}
        >
          {meta}
        </div>
      </div>
    </div>
  );
  return (
    <div className="mt-4 flex flex-col gap-2.5 flex-1">
      <Row tierRun="/25" toggle="Auto" title="2024 Bowman Chrome Auto Gold Refractor" meta="$1,840 · 3 bids · 2d left" />
      <Row tierRun="/99" toggle="RC" title="2025 Topps Chrome Refractor — Skenes" meta="$120 · sold · yesterday" />
    </div>
  );
}

/* Reusable tier-coloured chip. Always single source of truth for print-run
   colors via tierForRun + tierChipStyle from rarityUtils. */
function TierChip({ run }) {
  const tier = tierForRun(run);
  if (!tier) return null;
  return (
    <span
      className="font-mono text-[9px] px-1.5 py-[2px] rounded"
      style={tierChipStyle(tier)}
    >
      {run.startsWith('/') ? run : `/${run}`}
    </span>
  );
}

/* Free-account CTA — sits below the hero, above how-it-works.
   The pitch is the watchlist value (the real free-account benefit),
   not alerts. Alerts get pitched honestly in step 3 + the Plans table. */
function FreeAccountCTA() {
  return (
    <section
      className="px-6 lg:px-10 py-10 text-center"
      style={{
        background: 'rgba(201,149,74,0.04)',
        borderTop: '0.5px solid var(--gold-deep)',
        borderBottom: '0.5px solid var(--gold-deep)',
      }}
    >
      <div
        className="font-mono text-[9px] tracking-[0.24em] uppercase mb-2.5"
        style={{ color: 'var(--gold)', fontFamily: 'ui-monospace, monospace' }}
      >
        Free account
      </div>
      <h3 className="font-display italic text-[26px] leading-tight mb-2">
        Track cards you find. <em className="not-italic" style={{ color: 'var(--gold-bright)', fontStyle: 'italic' }}>For free.</em>
      </h3>
      <p
        className="text-[13px] leading-relaxed max-w-[480px] mx-auto mb-5"
        style={{ color: 'var(--ink-300)' }}
      >
        Save listings to your watchlist and we'll keep them updated — live price,
        bid count, sold status. No credit card.
      </p>
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 px-6 py-3 rounded text-[11px] tracking-[0.16em] uppercase font-semibold"
        style={{
          backgroundImage: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
          color: '#1a1612',
        }}
      >
        Create free account →
      </Link>
      <div
        className="mt-3 text-[11px]"
        style={{ color: 'var(--ink-500)' }}
      >
        Search works without an account · upgrade anytime
      </div>
    </section>
  );
}

/* Saved-search example card — visual that lives inside step 03. Shows a
   user's saved search with the same star + name + filter badges as the
   real watchlist row, so the visitor sees what they'd create. Uses the
   shared TierChip helper so badge colors stay consistent with production. */
function SavedSearchExampleCard() {
  const toggleChip = 'font-mono text-[9px] px-1.5 py-[2px] rounded';
  return (
    <div
      className="rounded-lg p-3.5"
      style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--gold-deep)' }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '13px', color: 'var(--ink-100)' }}>
        <span style={{ color: 'var(--gold)', fontSize: '11px' }}>★</span>
        <span>Caitlin Clark</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2.5">
        <TierChip run="/5" />
        <TierChip run="/10" />
        <TierChip run="/25" />
        <span className={toggleChip} style={{ ...OUTLINE_CHIP_STYLE, letterSpacing: '0.14em' }}>Auto</span>
        <span className={toggleChip} style={{ ...OUTLINE_CHIP_STYLE, letterSpacing: '0.14em' }}>RC</span>
      </div>
      <div className="h-px -mx-3.5 mb-2.5" style={{ background: 'var(--line)' }} />
      <div className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-none" style={{ background: 'var(--gold)', boxShadow: '0 0 6px var(--gold)' }} />
        <div className="text-[11px] leading-snug" style={{ color: 'var(--ink-200)' }}>
          <span className="block font-mono text-[8.5px] tracking-[0.18em] uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
            New match · just listed
          </span>
          2024 Bowman Chrome Auto Gold Refractor /25
        </div>
      </div>
    </div>
  );
}

/* PlansSection — three columns showing Anonymous / Free / Base.
   Each tier lists its FULL feature set rather than referring back to
   the previous one. Items NEW at that tier are highlighted in gold
   so the upgrade value scans at a glance. */
function PlansSection({ user }) {
  // Single feature-list component for consistency across all three tiers
  const Tier = ({ name, price, priceUnit, line, features, ctaLabel, ctaHref, highlight }) => (
    <div
      className="rounded-[10px] p-6 flex flex-col"
      style={{
        background: highlight
          ? 'linear-gradient(180deg, rgba(201,149,74,0.06) 0%, var(--bg-elev) 100%)'
          : 'var(--bg-elev)',
        border: highlight ? '0.5px solid var(--gold-deep)' : '0.5px solid var(--line)',
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.22em] text-[10px] mb-2"
        style={{ color: highlight ? 'var(--gold)' : 'var(--ink-400)' }}
      >
        {name}
      </div>
      <div
        className="font-display italic leading-none mb-1"
        style={{ fontSize: '28px', color: 'var(--ink-100)' }}
      >
        {price}{priceUnit && <small className="not-italic ml-1" style={{ fontFamily: 'ui-sans-serif', fontSize: '13px', color: 'var(--ink-400)' }}>{priceUnit}</small>}
      </div>
      <div className="text-[11.5px] mb-4 min-h-[16px]" style={{ color: 'var(--ink-400)' }}>{line}</div>
      <ul className="list-none p-0 m-0 mb-5 flex-1">
        {features.map((f) => (
          <li
            key={f.label}
            className="text-[13px] leading-snug pl-4 relative mb-2"
            style={{ color: f.isNew ? 'var(--gold-bright)' : 'var(--ink-300)', fontWeight: f.isNew ? 500 : 400 }}
          >
            <span
              className="absolute left-0 top-0.5 text-[11px]"
              style={{ color: f.isNew ? 'var(--gold)' : 'var(--ink-500)', fontWeight: f.isNew ? 700 : 400 }}
            >
              ✓
            </span>
            {f.label}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="inline-flex items-center justify-center px-4 py-2.5 rounded font-sans text-[10.5px] tracking-[0.16em] uppercase no-underline"
        style={highlight
          ? { backgroundImage: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)', color: '#1a1612', fontWeight: 600 }
          : { background: 'transparent', color: 'var(--ink-200)', border: '0.5px solid var(--ink-600)' }
        }
      >
        {ctaLabel}
      </Link>
    </div>
  );

  return (
    <section className="max-w-[980px] mx-auto px-6 lg:px-10 pb-16">
      <div className="text-center">
        <div
          className="font-mono uppercase tracking-[0.22em] text-[10px] mb-3"
          style={{ color: 'var(--gold)' }}
        >
          Plans
        </div>
        <h3 className="font-display italic text-[clamp(1.8rem,4vw,2rem)] leading-tight mb-9">
          What you get.
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Tier
          name="Anonymous"
          price="$0"
          line="No account"
          features={[
            { label: 'Unlimited search', isNew: true },
            { label: 'Improved search filters', isNew: true },
          ]}
          ctaLabel="Start hunting"
          ctaHref="/"
          highlight={false}
        />
        <Tier
          name="Free account"
          price="$0"
          line="No credit card"
          features={[
            { label: 'Unlimited search', isNew: false },
            { label: 'Improved search filters', isNew: false },
            { label: 'Watchlist of saved cards', isNew: true },
            { label: 'Live price & sold status', isNew: true },
            { label: 'Saved listings across devices', isNew: true },
          ]}
          ctaLabel={user ? 'You\u2019re signed in' : 'Create free account'}
          ctaHref={user ? '/watchlist-cards' : '/signup'}
          highlight={true}
        />
        <Tier
          name="Base"
          price="$5"
          priceUnit="/mo"
          line="Launching soon · join the waitlist"
          features={[
            { label: 'Unlimited search', isNew: false },
            { label: 'Improved search filters', isNew: false },
            { label: 'Watchlist of saved cards', isNew: false },
            { label: 'Live price & sold status', isNew: false },
            { label: 'Saved listings across devices', isNew: false },
            { label: '5 saved searches', isNew: true },
            { label: 'Email alerts on new listings', isNew: true },
            { label: 'Bid reminders below price cap', isNew: true },
          ]}
          ctaLabel="Notify me when available"
          ctaHref="/alerts"
          highlight={false}
        />
      </div>
    </section>
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
/* FeaturedFind — auto-loads a real Grail-tier card from eBay via /api/featured.
   Clicking opens the same CardModal that search results use, keeping the
   homepage card-tap experience consistent with the rest of the app. The
   modal then provides its own "View on eBay" link if the user wants to
   leave the site. */
function FeaturedFind({ onCardClick }) {
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

  const handleClick = () => {
    if (item && onCardClick) onCardClick(item);
  };

  return (
    <figure className="relative">
      <figcaption className="absolute -top-6 left-0 text-[10px] uppercase tracking-[0.3em] text-[var(--ink-400)] flex items-center gap-3">
        <span className="w-4 h-px bg-[var(--ink-400)]" />
        Featured Find · Live from eBay
      </figcaption>

      <button
        type="button"
        onClick={handleClick}
        disabled={!item}
        className={`block w-full text-left border border-[var(--line)] bg-[var(--bg-elev)] p-5 relative group transition-colors ${item ? 'hover:border-[var(--gold-deep)] cursor-pointer' : ''}`}
      >
        <CornerMarks />

        {/* Image area — foil sheen on tap (and on hover via CSS). */}
        <div
          className="ff-sheen-wrap aspect-[3/4] bg-gradient-to-br from-[var(--bg-elev-2)] via-[#1d180e] to-[#0e0b07] relative overflow-hidden"
          onTouchStart={(e) => { e.currentTarget.classList.remove('ff-play'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('ff-play'); }}
        >
          {loading && (
            <div className="absolute inset-0 shimmer" />
          )}
          {item && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={upscaleEbayImage(item.image)}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          )}
          {item && item.isAuction && item.endTime && (
            <BidCountdown endTime={item.endTime} />
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
                  ${item.price != null ? Number(item.price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </button>
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

/* EditableSearchHeading — the big italic player name on the results page.
   Behaves like a static heading until clicked; then becomes an inline
   input pre-filled with the current query. Submit (Enter) commits a new
   search; Escape cancels; blur with no change just exits edit mode.

   Designed to be the visible primary action on the results page so users
   can pivot to a new search without scrolling back to the hero. */
function EditableSearchHeading({ value, onSubmit }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(value);
  const inputRef = useRef(null);

  // Keep local pending state in sync if parent's query changes externally
  // (e.g. after a chip-search from the hero or a saved-search deep link).
  useEffect(() => { if (!editing) setPending(value); }, [value, editing]);

  // Focus + select-all once the input mounts so user can immediately retype.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    onSubmit(pending);
  }
  function cancel() {
    setEditing(false);
    setPending(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={pending}
        onChange={(e) => setPending(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        onBlur={commit}
        className="font-display italic w-full bg-transparent border-0 border-b outline-none p-0 m-0"
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 3.6rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: 'var(--gold-bright)',
          borderBottomColor: 'var(--gold)',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group block text-left p-0 m-0 bg-transparent border-0 cursor-text"
      title="Click to search a different name"
    >
      <span
        className="font-display italic transition-colors group-hover:text-[var(--gold-bright)]"
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 3.6rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: 'var(--gold)',
          display: 'inline-block',
          borderBottom: '0.5px dashed transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--gold-deep)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
      >
        {value}
      </span>
      <span
        className="ml-3 text-[10px] uppercase tracking-[0.22em] opacity-0 group-hover:opacity-100 transition-opacity align-middle"
        style={{ color: 'var(--ink-400)' }}
      >
        ✎ edit
      </span>
    </button>
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
            <div className="space-y-5">
              {PRINT_RUN_TIERS.map((tier) => {
                const allInTierSelected = tier.runs.every((r) => filters.selectedPrintRuns.includes(r));
                const someInTierSelected = tier.runs.some((r) => filters.selectedPrintRuns.includes(r));
                const tierKey = tier.label === 'The Grail' ? 'grail'
                  : tier.label === 'Ultra Rare' ? 'ultra'
                  : tier.label === 'Rare' ? 'rare'
                  : 'scarce';
                const tierColor = { grail: '#ffc14d', ultra: '#c8d4e0', rare: '#d6722d', scarce: '#7a8694' }[tierKey];
                // Master switch flips the whole tier on/off; chips toggle individual runs.
                const toggleTier = () => {
                  const next = allInTierSelected
                    ? filters.selectedPrintRuns.filter((r) => !tier.runs.includes(r))
                    : [...new Set([...filters.selectedPrintRuns, ...tier.runs])];
                  setFilter('selectedPrintRuns', next);
                };
                const toggleRun = (r) => {
                  const next = filters.selectedPrintRuns.includes(r)
                    ? filters.selectedPrintRuns.filter((x) => x !== r)
                    : [...filters.selectedPrintRuns, r];
                  setFilter('selectedPrintRuns', next);
                };
                return (
                  <div key={tier.label}>
                    {/* Tier header: name, range, and a master switch for the whole group */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-display text-base leading-tight" style={{ color: tierColor }}>{tier.label}</span>
                        <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--ink-600)]">{tier.range.replace('–', ' – ')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTier}
                        aria-label={`Toggle all ${tier.label} runs`}
                        className="relative flex-none rounded-full transition-colors"
                        style={{
                          width: 46,
                          height: 28,
                          background: allInTierSelected ? 'rgba(201,149,74,0.22)' : someInTierSelected ? 'rgba(201,149,74,0.12)' : 'var(--bg-elev-2)',
                          border: `1px solid ${allInTierSelected ? 'var(--gold-deep)' : 'var(--line)'}`,
                        }}
                      >
                        <span
                          className="block rounded-full"
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            width: 22,
                            height: 22,
                            background: allInTierSelected ? tierColor : someInTierSelected ? 'var(--gold)' : 'var(--ink-400)',
                            transform: allInTierSelected ? 'translateX(18px)' : someInTierSelected ? 'translateX(9px)' : 'translateX(0)',
                            transition: 'transform 0.22s, background 0.22s',
                          }}
                        />
                      </button>
                    </div>
                    {/* Individual run chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tier.runs.map((r) => {
                        const sel = filters.selectedPrintRuns.includes(r);
                        return (
                          <button
                            type="button"
                            key={r}
                            onClick={() => toggleRun(r)}
                            className="font-mono text-[13px] inline-flex items-center rounded-full transition-all"
                            style={{
                              minHeight: 36,
                              padding: '0 14px',
                              border: `1px solid ${sel ? tierColor : 'var(--line)'}`,
                              background: sel ? tierColor : 'var(--bg-elev-2)',
                              color: sel ? '#0e0c0a' : 'var(--ink-200)',
                              fontWeight: sel ? 600 : 500,
                            }}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
          step={25}
          onChange={(v) => onChange(v, max)}
        />
        <RangeRow
          label="Max"
          value={max}
          max={5000}
          step={25}
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
function FilterPanel({ query, setQuery, filters, setFilter, onSubmit, onCancel, editingSearch = null }) {
  const isEditing = !!editingSearch;
  return (
    <section className="relative max-w-[1100px] mx-auto px-6 lg:px-10 pt-12 lg:pt-16 pb-16">
      {/* Eyebrow + back link */}
      <div className="flex items-center justify-between mb-9">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)]">
          <span className="inline-block w-6 h-px bg-[var(--gold)] align-middle mr-3 -translate-y-[2px]" />
          {isEditing ? (
            <>Editing · <span className="normal-case tracking-normal italic font-serif text-[var(--ink-100)] ml-1">{editingSearch.name}</span></>
          ) : (
            <>Step 02 · Refine</>
          )}
        </p>
        <button
          onClick={onCancel}
          className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
        >
          {isEditing ? 'Cancel' : '← Back'}
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

      {/* Search CTA — becomes "Update search criteria" in edit mode */}
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
          {isEditing ? 'Update search criteria' : 'Search'}
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
   Mobile filter + sort (lg:hidden). Desktop keeps ResultsSidebar.
   - MobileFilterBar: sticky Sort + Filters pills above the results grid.
   - MobileSheet: shared bottom-sheet shell (scrim, grabber, body lock).
   - MobileFilterDrawer: reuses FilterControls + a Search button.
   - MobileSortSheet: instant client-side resort (no search).
   ───────────────────────────────────────────── */

// Count of "narrowing" filters, for the Filters pill badge. Print-run subset
// is intentionally excluded to keep the number predictable.
function countActiveFilters(f) {
  let n = 0;
  if (f.autoCards) n++;
  if (f.rookieCards) n++;
  if (f.numberedCards) n++;
  if (f.condition && f.condition !== 'any') n++;
  if (f.listingType && f.listingType !== 'any') n++;
  if ((f.priceMin ?? 0) > 0 || (f.priceMax ?? 1000) < 1000) n++;
  return n;
}

function MobileFilterBar({ activeCount, onOpenFilters, onOpenSort }) {
  const pill =
    'flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full text-[12px] uppercase tracking-[0.12em] font-medium text-[var(--ink-100)]';
  const pillStyle = { border: '1px solid var(--line)', background: 'var(--bg-elev)' };
  return (
    <div
      className="lg:hidden sticky top-0 z-30 flex items-center gap-3 py-3 mb-6"
      style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--line-soft)' }}
    >
      <button onClick={onOpenSort} className={pill} style={pillStyle}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink-400)" strokeWidth="1.4">
          <path d="M3 4h8M4 7h6M5 10h4" />
        </svg>
        Sort
      </button>
      <button onClick={onOpenFilters} className={pill} style={pillStyle}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink-400)" strokeWidth="1.4">
          <path d="M1 3h12M3 7h8M5 11h4" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center text-[11px] font-bold rounded-full"
            style={{ minWidth: 18, height: 18, padding: '0 5px', background: 'var(--gold)', color: '#0e0c0a', letterSpacing: 0 }}
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}

function MobileSheet({ open, onClose, title, children, footer, full = false }) {
  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="lg:hidden" aria-hidden={!open}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(5,4,3,0.62)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.32s ease',
        }}
      />
      {/* Sheet — bottom-anchored. CSS Grid (auto / auto / 1fr [/ auto]) gives
          the scroll body exactly the leftover space and never collapses. dvh
          on the height handles mobile browser chrome reliably. */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          zIndex: 50,
          display: 'grid',
          gridTemplateRows: footer ? 'auto auto 1fr auto' : 'auto auto 1fr',
          height: full ? '94dvh' : 'auto',
          maxHeight: full ? '94dvh' : '80vh',
          background: 'var(--bg-elev)',
          borderTop: '1px solid var(--line)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.5)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <button onClick={onClose} aria-label="Close" className="w-full flex justify-center pt-2.5 pb-1">
          <span style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line)', display: 'block' }} />
        </button>
        <div className="flex items-center justify-between px-6 pb-4 pt-1" style={{ borderBottom: '1px solid var(--line-soft)' }}>
          <span className="font-display italic text-2xl text-[var(--ink-100)]">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--ink-400)]"
            style={{ border: '1px solid var(--line-soft)' }}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <div className="px-6 pt-4" style={{ borderTop: '1px solid var(--line)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function MobileFilterDrawer({ open, onClose, filters, setFilter, onSearch, onCloseWithChanges }) {
  // Snapshot filters the moment the drawer opens so we can detect changes
  // at the point of any close gesture (scrim / grabber / ✕).
  const snapshotRef = useRef(null);
  useEffect(() => {
    if (open) snapshotRef.current = JSON.stringify(filters);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCloseRequest() {
    const changed = snapshotRef.current && snapshotRef.current !== JSON.stringify(filters);
    if (changed && onCloseWithChanges) {
      onCloseWithChanges();   // caller shows the modal; drawer stays mounted
    } else {
      onClose();              // no changes — close immediately
    }
  }

  return (
    <MobileSheet
      open={open}
      onClose={handleCloseRequest}
      title="Filters"
      full
      footer={
        <button
          onClick={onSearch}
          className="w-full text-[13px] font-bold uppercase tracking-[0.14em]"
          style={{
            minHeight: 52,
            borderRadius: 10,
            background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
            color: '#0e0c0a',
          }}
        >
          Search →
        </button>
      }
    >
      <FilterControls filters={filters} setFilter={setFilter} compact />
    </MobileSheet>
  );
}

function MobileSortSheet({ open, onClose, value, onChange }) {
  const options = [
    ['printrun-rarest', 'Rarest first'],
    ['printrun-common', 'Most common first'],
    ['price-low', 'Price: Low → High'],
    ['price-high', 'Price: High → Low'],
    ['ending-soon', 'Ending soonest'],
    ['newest', 'Newest first'],
  ];
  return (
    <MobileSheet open={open} onClose={onClose} title="Sort">
      <div>
        {options.map(([v, l]) => {
          const sel = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="w-full flex items-center justify-between text-left text-[15px]"
              style={{ minHeight: 50, borderBottom: '1px solid var(--line-soft)', color: sel ? 'var(--gold-bright)' : 'var(--ink-200)' }}
            >
              <span>{l}</span>
              {sel && <span style={{ color: 'var(--gold-bright)' }}>✓</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11.5px] italic mt-3 leading-relaxed" style={{ color: 'var(--ink-600)' }}>
        Sort is instant — it reorders the cards you already have, no new search.
      </p>
    </MobileSheet>
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
  // Local string state lets the user type freely (including a temporary empty
  // input). We commit the snapped value to the parent only on blur/Enter.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);

  function commit() {
    let n = parseInt(draft.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > max) n = max;
    n = Math.round(n / step) * step; // snap to step
    onChange(n);
    setDraft(String(n));
    setEditing(false);
  }

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)]">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xs text-[var(--ink-600)]">$</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={editing ? draft : (value + (showPlus && value === max ? '+' : ''))}
            onFocus={(e) => { setEditing(true); setDraft(String(value)); requestAnimationFrame(() => e.target.select()); }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            className="font-mono text-xs text-[var(--ink-100)] bg-transparent border-0 outline-none w-16 text-right focus:text-[var(--gold-bright)]"
            style={{ borderBottom: '0.5px dashed var(--line)' }}
            aria-label={`${label} price`}
          />
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ff-price-range w-full"
        aria-label={`${label} price slider`}
      />
    </div>
  );
}

/* "Search with new filters?" modal — fires when filters drift from the
   active search and the user closes the filter drawer or tries to interact
   with stale results. Strongly nudges the user to either rerun the search
   or revert their filter changes. */
// `floating` = desktop variant: the prompt floats centered with NO blocking
// backdrop and NO scroll lock, so the filter sidebar behind it stays fully
// editable. The user can adjust as many filters as they like, then press
// Search. The mobile variant (floating=false) keeps the dimmed, click-to-cancel
// scrim since its filter drawer is already closed.
function PendingSearchModal({ open, onSearch, onCancel, onDismiss, floating = false }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (!floating) document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => {
      if (!floating) document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel, floating]);
  if (!open) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center px-6 ${floating ? 'pointer-events-none' : ''}`}
      aria-modal={floating ? undefined : 'true'}
      role="dialog"
    >
      {/* Blocking scrim — mobile only. The floating desktop variant omits it
          entirely so clicks pass through to the filters underneath. */}
      {!floating && (
        <div
          onClick={onCancel}
          className="absolute inset-0"
          style={{ background: 'rgba(5,4,3,0.7)', backdropFilter: 'blur(3px)' }}
        />
      )}
      <div
        className={`relative w-full max-w-[400px] rounded-[6px] p-7 text-center ${floating ? 'pointer-events-auto' : ''}`}
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--gold-deep)',
          boxShadow: floating
            ? '0 40px 100px -20px rgba(0,0,0,0.85), 0 0 40px -8px rgba(230,185,107,0.4)'
            : '0 30px 80px -20px rgba(0,0,0,0.6), 0 0 32px -10px rgba(230,185,107,0.3)',
        }}
      >
        {/* Dismiss × — closes the modal but keeps the user’s filter edits
            so they can keep tweaking before searching. */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
            style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-base)' }}
          >
            ✕
          </button>
        )}
        <p className="text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--gold)' }}>
          Filters changed
        </p>
        <h3 className="font-display italic text-[26px] leading-tight mb-3" style={{ color: 'var(--ink-100)' }}>
          Search with new filters?
        </h3>
        <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--ink-400)' }}>
          You’ve adjusted your filters since your last search. Run it again to see updated results.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onSearch}
            className="w-full min-h-[48px] rounded-[8px] text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{
              background: 'linear-gradient(180deg, #ffd97a 0%, #d99c14 100%)',
              color: '#1a1612',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Search →
          </button>
          <button
            onClick={onCancel}
            className="w-full min-h-[40px] text-[11px] tracking-[0.14em] uppercase"
            style={{ background: 'transparent', color: 'var(--ink-400)', border: 'none', cursor: 'pointer' }}
          >
            Cancel · keep previous filters
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

function Results({ loading, hasSearched, results, error, formatPrice, scanPhrase, onSuggested, appliedFilters, resultMeta, hasPendingFilters, onPendingClick, onCardClick }) {
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
          <ResultCard key={item.id} item={item} formatPrice={formatPrice} index={i} hasPendingFilters={hasPendingFilters} onPendingClick={onPendingClick} onCardClick={onCardClick} />
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
const WATCHLIST_PROVIDER_MOVED_TO_LIB = true; // placeholder removed below
// ^ The WatchlistProvider implementation lives in lib/watchlistContext.js
// so the watchlist-cards page can also mount it. We import it at the top
// of this file. This sentinel line is just a marker so future searches
// for "WatchlistProvider" in this file lead readers to the lib instead.

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
    const wasSaved = saved;
    if (saved) ctx?.markUnsaved(item.id);
    else ctx?.markSaved(item.id);

    // Star burst — only on save (not unsave). Pop the button and fire 8 sparks.
    if (!wasSaved) {
      const btn = e.currentTarget;
      btn.classList.remove('ff-pop');
      void btn.offsetWidth;
      btn.classList.add('ff-pop');
      for (let i = 0; i < 8; i++) {
        const sp = document.createElement('span');
        sp.className = 'ff-spark';
        const a = (Math.PI * 2 * i) / 8;
        const d = 22 + Math.random() * 10;
        sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
        btn.appendChild(sp);
        setTimeout(() => sp.remove(), 650);
      }
    }

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
            is_auction: !!item.isAuction,
            end_time: item.endTime || null,
            bid_count: item.bidCount ?? null,
            condition: item.condition || null,
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

function ResultCard({ item, formatPrice, index, hasPendingFilters, onPendingClick, onCardClick }) {
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
      onClick={(e) => {
        // Desktop equivalent of the mobile pending-search modal: if filters
        // differ from the active search, intercept the click and prompt the
        // user to rerun the search first.
        if (hasPendingFilters && onPendingClick) {
          e.preventDefault();
          onPendingClick();
          return;
        }
        // Default: open the in-app card modal instead of navigating to eBay.
        // The modal has its own "View on eBay" CTA for users who want the
        // listing directly. We honor cmd/ctrl-click + middle-click as
        // "open in new tab" since power users expect that behavior.
        if (e.metaKey || e.ctrlKey || e.button === 1) return;
        if (onCardClick) {
          e.preventDefault();
          onCardClick(item);
        }
      }}
      className="group block rise"
      style={tierStyle ? {
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        backgroundImage: tierStyle.bg,
        borderLeft: `2px solid ${tierStyle.border}`,
      } : { animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* MOBILE (<lg) — compact list row: thumbnail left, badges pinned at bottom. */}
      <div className="lg:hidden flex gap-4 py-5 pl-4 pr-3">
        <div
          data-listing-id={item.id}
          className="ff-sheen-wrap relative w-[92px] flex-none aspect-[3/4] bg-[var(--bg-elev)] overflow-hidden"
          onTouchStart={(e) => { e.currentTarget.classList.remove('ff-play'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('ff-play'); }}
        >
          <WatchStar item={item} />
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={upscaleEbayImage(item.image)} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--ink-600)] font-display text-3xl italic">◇</div>
          )}
          {item.isAuction && (
            <span className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-[0.16em] text-[var(--gold)] bg-[var(--bg-base)]/85 px-1 py-0.5 border border-[var(--gold-deep)]/30">
              Live
            </span>
          )}
          {item.isAuction && item.endTime && (
            <BidCountdown endTime={item.endTime} />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <h3
            className="font-display text-lg leading-[1.15] text-[var(--ink-100)] group-hover:text-[var(--gold-bright)] transition-colors"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {item.title}
          </h3>
          <div className="text-[11px] leading-relaxed text-[var(--ink-400)] mt-1.5">
            {item.seller && <span className="normal-case">{item.seller}</span>}
            {item.sellerFeedback != null && (
              <>
                <span className="text-[var(--ink-600)] mx-1.5">·</span>
                <span>{Number(item.sellerFeedback).toFixed(1)}%</span>
              </>
            )}
          </div>
          <div className="font-display text-[26px] leading-none text-[var(--ink-100)] group-hover:text-[var(--gold-bright)] transition-colors mt-2">
            {formatPrice(item.price)}
          </div>
          {/* Badge row pinned to the bottom of the card */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {item.isAuction && (
              <Badge auction>{item.bidCount != null ? `${item.bidCount} BIDS` : 'AUCTION'}</Badge>
            )}
            {hasAuto && <Badge>AUTO</Badge>}
            {hasRookie && <Badge>RC</Badge>}
            {printRun && <Badge mono tier={printRunTier(printRun)}>/{printRun}</Badge>}
            {psaMatch && <Badge>PSA {psaMatch[1]}</Badge>}
            {bgsMatch && <Badge>BGS {bgsMatch[1]}</Badge>}
            {sgcMatch && <Badge>SGC {sgcMatch[1]}</Badge>}
            {cgcMatch && <Badge>CGC {cgcMatch[1]}</Badge>}
          </div>
        </div>
      </div>

      {/* 3-column layout — title+badges+meta on left, image center as visual
          focal point, price + CTA on right. items-center vertically aligns
          all three columns so the row stays visually balanced even when the
          title block grows tall. */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-[1.3fr_200px_1fr] gap-6 md:gap-7 items-center py-10 pl-4 md:pl-5">
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
          </div>
        </div>

        {/* Center column: image, the visual focal point */}
        <div className="order-1 md:order-2 mx-auto md:mx-0">
          <div
            data-listing-id={item.id}
            className="ff-sheen-wrap relative aspect-[3/4] w-[160px] md:w-[200px] bg-[var(--bg-elev)] overflow-hidden"
            onTouchStart={(e) => { e.currentTarget.classList.remove('ff-play'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('ff-play'); }}
          >
            <CornerMarks />
            <WatchStar item={item} />
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={upscaleEbayImage(item.image)}
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
            {item.isAuction && item.endTime && (
              <BidCountdown endTime={item.endTime} />
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
