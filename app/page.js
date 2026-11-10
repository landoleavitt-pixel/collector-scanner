'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

import { ArrowRight, ArrowUpRight, Star, X, Crosshair, ArrowLeft, ImageOff, Search, Clock, Bell, TrendingDown, Hourglass, ListFilter, SlidersHorizontal, ChevronDown, List, LayoutGrid } from 'lucide-react';
import SaveSearchModal from './components/SaveSearchModal';
import SaveSearchPrompt from './components/search/SaveSearchPrompt';
import SignupPromptCard from './components/SignupPromptCard';
import BidCountdown from './components/BidCountdown';
import CardModal from './components/CardModal';
import { tierForRun, tierChipStyle, OUTLINE_CHIP_STYLE } from './components/rarityUtils';
import ShareSearchButton from './components/ShareSearchButton';
import { isReturningVisitor, markVisited, getRecentSearches, addRecentSearch } from '../lib/visitState';
import { hasShareParams, parseShareParams, buildShareParams } from '../lib/shareLink';
import { track } from '../lib/track';
import { CARD_COMPANIES, brandFilterLabels } from '../lib/cardBrands';
import { TEAMS, TEAM_LEAGUES, teamFromQuery, teamFilterLabels, titleMatchesTeam, getTeam } from '../lib/teams';
import { tidyRecentSearches } from '../lib/recentSearches';
import { WatchlistProvider } from '../lib/watchlistContext';
import { useUser } from '../lib/useUser';
import { useRouter, useSearchParams } from 'next/navigation';
import { PAYMENTS_LIVE } from '../lib/payments';
import { isNativeApp } from '../lib/native';
import { usePlayerSuggest, useSuggestBox, DidYouMeanLine, EditableSearchHeading } from './components/search/SuggestBox';
import {
  PRICE_NO_MAX, SectionLabel, SectionDivider, priceRangeLabel, PriceRangeSlider, SegmentedGroup, ResultsSidebar,
  MobileFilterDrawer, SortDropdown, SPORTS_SORT_OPTIONS, PendingSearchModal, BackToTop, LoadingState, NoResultsState,
  MoreFilters, ShippingFilters, shippingActive, shippingLabels, FilterChip,
} from './components/search/SearchUI';
import { WatchStar, usePendingStarSave, AlertBand } from './components/search/WatchStar';
import { ResultCard, Badge, CornerMarks, upscaleEbayImage, tierChipLabel } from './components/search/ResultCard';
import { detectPrintRun, hasAutoText } from '../lib/listingFilter';

// Print run tiers — grouped visually by rarity.
// Collectors mentally bucket these by tier, so we present them that way.
// One ladder, used the same way everywhere (design review fix 4). Scarce is
// 250 or more (Landon, 2026-10-19); its preset runs stop at /999.
const PRINT_RUN_TIERS = [
  { key: 'grail',  label: 'Grail',  range: '1–25',    made: '1 to 25 made',     runs: ['/1', '/5', '/10', '/15', '/25'] },
  { key: 'ultra',  label: 'Ultra',  range: '26–99',   made: '26 to 99 made',    runs: ['/49', '/50', '/75', '/99'] },
  { key: 'rare',   label: 'Rare',   range: '100–249', made: '100 to 249 made',  runs: ['/149', '/150', '/199', '/249'] },
  { key: 'scarce', label: 'Scarce', range: '250+',    made: '250 or more made', runs: ['/299', '/499', '/999'] },
];

// Flat list of all preset print runs — used for "select all" default state.
const ALL_PRESET_PRINT_RUNS = PRINT_RUN_TIERS.flatMap((t) => t.runs);

// Filters a fresh search starts with. Numbered is on so a first search goes
// straight to the cards this site is for, rarest first; everything else is
// adjustable from the results sidebar / phone drawer.
const DEFAULT_FILTERS = {
  autoCards: false,
  numberedCards: true,
  selectedPrintRuns: ALL_PRESET_PRINT_RUNS, // array — multi-select
  customPrintRuns: [],                       // user-added runs like "/73"
  rookieCards: false,
  listingType: 'any',   // 'any' | 'buyItNow' | 'auction'
  condition: 'any',     // 'any' | 'raw' | 'graded' — title-parsed for PSA/BGS/SGC/CGC
  priceMin: 0,
  priceMax: 100000,     // PRICE_NO_MAX: every price by default (Landon, 2026-10-23)
  sortBy: 'printrun-rarest',
  brands: [],           // card companies, e.g. ['topps'] — lib/cardBrands.js
  brandLines: [],       // optional product lines within them, e.g. ['bowman-chrome']
  teams: [],            // Team filter, e.g. ['nba-dal'] — lib/teams.js
  // Shipping and offers (More filters): eBay's own filters.
  freeShip: false,
  offers: false,
  shipFrom: '',         // '' | 'US' | 'CA'
  returns: false,
};

// Saved searches and share links written before numbered-by-default meant
// "numbered off" when the key was missing, so they decode against this.
const LEGACY_BASE_FILTERS = { ...DEFAULT_FILTERS, numberedCards: false };

// "No maximum price". Older saved searches and share links used 5000 for
// this (the old slider's top), so read 5000 as no max too.
function isPriceNoMax(v) {
  return v == null || v === 5000 || v >= PRICE_NO_MAX;
}
function withPriceNoMax(f) {
  return f && f.priceMax === 5000 ? { ...f, priceMax: PRICE_NO_MAX } : f;
}

// Ready-made hunts for the landing page: one tap to real results. Hero
// renders them and calls onChipSearch(query, filters).
const PRESET_HUNTS = [
  { label: 'Caitlin Clark autos /1–25', query: 'Caitlin Clark', filters: { autoCards: true, numberedCards: true, selectedPrintRuns: PRINT_RUN_TIERS[0].runs } },
  { label: 'Paul Skenes rookies /26–99', query: 'Paul Skenes', filters: { rookieCards: true, numberedCards: true, selectedPrintRuns: PRINT_RUN_TIERS[1].runs } },
  { label: 'Connor Bedard graded', query: 'Connor Bedard', filters: { condition: 'graded', numberedCards: false } },
];

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
  'Searching eBay',
];


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
  const [savePromptOpen, setSavePromptOpen] = useState(false);
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
    if (searchParams?.get('savedSearch') || searchParams?.get('editSearch') || searchParams?.get('q')) {
      return 'transition';
    }
    return 'idle';
  });
  const hasSearched = appStage === 'searched';
  const [scanIdx, setScanIdx] = useState(0);

  // Mobile filter drawer + sort sheet (lg:hidden). Desktop keeps the sidebar.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // List or grid results; remembered on this device.
  const [resultsView, setResultsViewState] = useState('list');
  useEffect(() => { try { if (localStorage.getItem('ffResultsView') === 'grid') setResultsViewState('grid'); } catch {} }, []);
  const setResultsView = (v) => { setResultsViewState(v); try { localStorage.setItem('ffResultsView', v); } catch {} };
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
  // Landing-page tailoring. Read BEFORE markVisited() so the first load of a
  // new browser still counts as a first visit. Null while undetermined so the
  // hero doesn't flash the wrong variant.
  const [isReturning, setIsReturning] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    setIsReturning(isReturningVisitor());
    setRecentSearches(getRecentSearches());
    markVisited();
  }, []);
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

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

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
      'brands', 'brandLines', 'teams', 'freeShip', 'offers', 'shipFrom', 'returns',
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
        const restored = withPriceNoMax({ ...LEGACY_BASE_FILTERS, ...(search.filters || {}) });
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

  // ── Shared search links ──────────────────────────────────────────
  // Someone was sent /?q=Caitlin+Clark&runs=5,10,25&auto=1 — decode the
  // criteria, apply the filters, and run the search automatically so the
  // recipient lands on results rather than an empty home page. This is the
  // growth loop: a good search is one tap to pass along.
  //
  // Guarded by a ref so it fires once per arrival. Without that, setFilters
  // would retrigger the effect and loop the search endlessly.
  const sharedSearchRan = useRef(false);
  useEffect(() => {
    if (sharedSearchRan.current) return;
    if (!searchParams) return;
    // Saved-search deep links have their own handler; don't double-run.
    if (searchParams.get('savedSearch') || searchParams.get('editSearch')) return;
    if (!hasShareParams(searchParams)) return;

    const { query: sharedQuery, filters: parsedShared } =
      parseShareParams(searchParams, LEGACY_BASE_FILTERS, ALL_PRESET_PRINT_RUNS);
    const sharedFilters = withPriceNoMax(parsedShared);
    if (!sharedQuery) return;

    sharedSearchRan.current = true;
    setQuery(sharedQuery);
    setFilters(sharedFilters);
    handleSearch(sharedQuery, sharedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Card modal: reconcile URL → modal state ──────────────────────
  // Watches ?card=<id> and opens the matching item if found in current
  // results. If the id is present but no match → expired state. Empty
  // param closes the modal. Runs whenever search params or results
  // change, so a fresh search that includes the URL's card id will
  // promote the modal from expired → real automatically.
  //
  // COLD-START PATH (email deep links): when someone arrives at
  // /?card=<id> with no search run (alert-email click), there are no
  // results to match against — so we hydrate the item directly from
  // /api/listing/<id> and open the modal fully populated. The modal's
  // own image fetch then hits the same 5-min edge cache, so this costs
  // one eBay call total.
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
      return;
    }
    if (results.length > 0 || appStage === 'searched') {
      // Results have loaded but the id isn't among them → expired
      setSelectedCardItem({ id: cardId, title: '', url: '', image: null });
      setSelectedExpired(true);
      return;
    }
    // Cold arrival — no search context. Fetch the listing and hydrate.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listing/${encodeURIComponent(cardId)}`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (data?.ok) {
          setSelectedCardItem({
            id: cardId,
            title: data.title || '',
            price: data.price ?? null,
            image: Array.isArray(data.images) && data.images[0] ? data.images[0] : null,
            url: data.url || '',
            isAuction: !!data.isAuction,
            endTime: data.endTime || null,
          });
          setSelectedExpired(false);
        } else {
          // Listing gone (404/expired) or fetch failed — show expired state
          setSelectedCardItem({ id: cardId, title: '', url: '', image: null });
          setSelectedExpired(true);
        }
      } catch {
        if (!cancelled) {
          setSelectedCardItem({ id: cardId, title: '', url: '', image: null });
          setSelectedExpired(true);
        }
      }
    })();
    return () => { cancelled = true; };
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
  const sidebarRef = useRef(null);

  // "Did you mean" for the searched name (lib/playerSuggest.js, loaded lazily).
  // Only a suggestion: the search always runs exactly as typed.
  const playerSuggest = usePlayerSuggest();

  // Recent searches with proper capitals and near-duplicates merged. Shows
  // the raw list until the matcher has loaded.
  const tidyRecents = useMemo(
    () => (playerSuggest ? tidyRecentSearches(recentSearches, playerSuggest, 5) : recentSearches.slice(0, 5)),
    [playerSuggest, recentSearches],
  );
  const [dismissedFix, setDismissedFix] = useState(null);
  const nameFix = useMemo(
    () => (playerSuggest && appStage === 'searched' && !teamFromQuery(query) ? playerSuggest.didYouMean(query) : null),
    [playerSuggest, appStage, query],
  );
  function searchFix(fixed) {
    setQuery(fixed);
    handleSearch(fixed);
  }

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
      if (hasGrail) chips.push({ label: 'Grail · 1 to 25 made', tier: 'grail' });
      if (hasUltra) chips.push({ label: 'Ultra · 26 to 99 made', tier: 'ultra' });
      if (hasRare) chips.push({ label: 'Rare · 100 to 249 made', tier: 'rare' });
      if (hasScarce) chips.push({ label: 'Scarce · 250 or more made', tier: 'scarce' });
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
    brandFilterLabels(filters.brands, filters.brandLines).forEach((label) => chips.push({ label, tier: 'neutral' }));
    teamFilterLabels(filters.teams).forEach((label) => chips.push({ label, tier: 'neutral' }));
    shippingLabels(filters).forEach(({ label }) => chips.push({ label, tier: 'neutral' }));

    const min = filters.priceMin || 0;
    const max = filters.priceMax ?? PRICE_NO_MAX;
    if (min > 0 || !isPriceNoMax(max)) {
      chips.push({ label: priceRangeLabel(min, max === 5000 ? PRICE_NO_MAX : max), tier: 'neutral' });
    }

    return chips;
  }

  // Open the save modal — or redirect to login if signed out.
  function handleOpenSave() {
    if (!user) {
      setSavePromptOpen(true);
      return;
    }
    setSaveModalOpen(true);
  }

  // Called from the landing hero (Enter, go button, a name chip). Runs the
  // search straight away with the current filters (numbered, rarest first by
  // default); filters are adjusted from the results page. The 'configuring'
  // stage (FilterPanel) is now only used to edit a saved search.
  function handleQuerySubmit(overrideQuery) {
    handleSearch(overrideQuery);
  }

  async function handleSearch(overrideQuery, overrideFilters) {
    const q = (overrideQuery ?? query).trim();
    if (!q) {
      setError('Enter a card name to begin.');
      return;
    }
    if (overrideQuery) setQuery(overrideQuery);
    const f = overrideFilters || filters;
    // Remember it so returning visitors get their own hunts as shortcuts
    // instead of the generic athlete chips.
    addRecentSearch(q);
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
          priceMax: f.priceMax === 5000 || f.priceMax >= PRICE_NO_MAX ? null : f.priceMax,
          sortBy: f.sortBy,
          brands: f.brands || [],
          brandLines: f.brandLines || [],
          teams: f.teams || [],
          freeShip: !!f.freeShip,
          offers: !!f.offers,
          shipFrom: f.shipFrom || '',
          returns: !!f.returns,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed.');
        setResults([]);
      } else {
        // Funnel tracking: filter types only, never the search text.
        track('searched', { listing: f.listingType || 'any', graded: f.condition === 'graded', auto: !!f.autoCards });
        // Store raw results; sorting happens via useMemo so changing the sort
        // option instantly re-orders without re-fetching from eBay.
        // The searched player's sport helps the card popup pick the right
        // set's colour list (e.g. Topps Chrome football vs baseball).
        const sportHint = playerSuggest?.sportOfPlayer?.(q) || null;
        setResults(sportHint ? (data.items || []).map((it) => ({ ...it, sportHint })) : (data.items || []));
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
                  text: 'Fields & Floors Collectors is a search tool for sports card collectors. It filters eBay listings by autograph, print run, rookie status, condition and price at the same time, which eBay\'s own search does not offer. Users can save searches and get email alerts when new matching cards list.',
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
                  text: PAYMENTS_LIVE
                    ? 'Searching is free, including the watchlist. Free accounts include 1 live email alert. Up to 5 alerts and bid reminders require the Base plan at $6.99 CAD per month ($59 CAD per year), with a 14-day free trial. A Premium tier is planned but not yet available.'
                    : 'Fields & Floors is free during early access, including search, the watchlist, and email alerts on up to 5 saved searches. Paid plans are not available yet.',
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
                  text: 'After saving a search with your filters, Fields & Floors polls eBay once per hour for matching listings. The moment a new listing matches every filter (player, print run, condition, price ceiling), you get an email. This applies on up to 5 saved searches with the Base plan.',
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
          __html: `try{var s=new URLSearchParams(window.location.search),c=document.documentElement.classList;if(s.get('savedSearch')||s.get('editSearch'))c.add('ff-deep-link');if(s.get('savedSearch')||s.get('editSearch')||s.get('card')||s.get('q')||s.get('tour')||sessionStorage.getItem('ffIntroPlayed')==='1')c.add('ff-no-intro');}catch(e){}`,
        }}
      />
      {/* Stage 1: idle landing — hero with search bar, then the why-section.
          data-ff-idle hides this via CSS when the deep-link class is set. */}
      {appStage === 'idle' && (
        <div data-ff-idle>
          {user ? (
            <SignedInHome
              query={query}
              setQuery={setQuery}
              onSearch={() => handleQuerySubmit()}
              onSuggested={(q) => handleQuerySubmit(q)}
              recentSearches={tidyRecents}
              onCardClick={openCard}
              error={error}
            />
          ) : (
          <>
          <Hero
            query={query}
            setQuery={setQuery}
            onSearch={() => handleQuerySubmit()}
            error={error}
            loading={false}
            onSuggested={(s) => handleQuerySubmit(s)}
            user={user}
            onCardClick={openCard}
            isReturning={isReturning}
            recentSearches={tidyRecents}
            presetHunts={PRESET_HUNTS}
            onChipSearch={(chipQuery, partialFilters) => {
              // Apply the matching filters and run the search immediately. The
              // selected filters remain visible in the Stage 3 results sidebar,
              // so the visitor sees BOTH which toggles produced the example and
              // the resulting cards — no extra click needed. Starts from the
              // defaults so leftovers from an earlier search don't leak in.
              const merged = { ...DEFAULT_FILTERS, sortBy: filters.sortBy, ...partialFilters };
              setFilters(merged);
              handleSearch(chipQuery, merged);
            }}
          />
          <WhyFields user={user} />
          </>
          )}
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
        <ResultsContext.Provider value={results}>
        <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-10 pb-16 relative z-10 stage-in">
          {/* Header bar — full width above both columns.
              The searched player name is the big editable headline; click it
              to type a new name and run another search without scrolling
              back to the hero. Listing count moves to a subtitle. */}
          <div className="min-w-0">
            <h1 className="sr-only">{query} cards</h1>
            <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
              <EditableSearchHeading
                value={query}
                onSubmit={(next) => {
                  const trimmed = (next || '').trim();
                  if (!trimmed || trimmed === query) return;
                  setQuery(trimmed);
                  handleSearch(trimmed);
                }}
              />
              {/* No count while searching: "0 for sale" read as no results. */}
              {!loading && (
                <span className="text-body" style={{ color: 'var(--ink-400)' }}>
                  {resultsSummary(sortedResults.length, query, filters.sortBy)}
                </span>
              )}
            </div>
            {/* Quiet typo hint. With zero results, NoResultsState shows it
                as a button instead, so it's hidden here. */}
            {nameFix && !loading && sortedResults.length > 0 && dismissedFix !== query && (
              <DidYouMeanLine
                fix={nameFix.query}
                onPick={() => searchFix(nameFix.query)}
                onDismiss={() => setDismissedFix(query)}
              />
            )}
          </div>

          {/* One row of controls: Filters, Sort, Get alerts, Share, List / Grid.
              Sticky on phones so it stays in reach while scrolling. */}
          <ResultsToolbar
            activeCount={countActiveFilters(filters)}
            onFilters={() => {
              if (isDesktopViewport) {
                sidebarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                sidebarRef.current?.querySelector('button')?.focus({ preventScroll: true });
              } else {
                setMobileFiltersOpen(true);
              }
            }}
            sortBy={filters.sortBy}
            onSort={(v) => setFilter('sortBy', v)}
            onAlerts={handleOpenSave}
            share={<ShareSearchButton query={query} filters={filters} allPresetRuns={ALL_PRESET_PRINT_RUNS} />}
            view={resultsView}
            onView={setResultsView}
          />

          {/* Two-column layout: 280px sidebar + flexible results */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-x-12 gap-y-8 items-start">
            <div ref={sidebarRef} className="hidden lg:block scroll-mt-6">
              <ResultsSidebar
                onSearch={() => handleSearch()}
                hasPending={filtersDifferFromApplied()}
              >
                <FilterControls filters={filters} setFilter={setFilter} compact />
              </ResultsSidebar>
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
              nameFix={nameFix?.query || null}
              onNameFix={searchFix}
              query={query}
              onAlert={handleOpenSave}
              view={resultsView}
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
            onSearch={() => { handleSearch(); setMobileFiltersOpen(false); }}
          >
            <FilterControls filters={filters} setFilter={setFilter} compact />
          </MobileFilterDrawer>

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
        </ResultsContext.Provider>
      )}

      {savePromptOpen && (
        <SaveSearchPrompt query={query} returnPath={sportsReturnPath(query, filters) || '/'} onClose={() => setSavePromptOpen(false)} />
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
/* Splash intro — one continuous motion from the seal to the header, played
   once each time someone opens the site (once per browser tab session, so
   it doesn't replay on every return to the home page) and finished in under
   a second. Landon wants it on every visit, not just the first. In the iOS
   app every launch is a new session, so it plays on every launch.
   The iOS app's launch screen shows this exact seal (same image, same size,
   same centre), so the app hands off from the native launch screen with no
   visible jump. Then: a gold bloom, the wordmark rises beneath the seal, and
   both fly up to dock into the header's seal and brand while the hero rises
   in underneath. "Collectors" fades in once the brand has landed.
   Portalled to <body> so it covers the header too. The "already played this
   session" flag is sessionStorage ffIntroPlayed. An inline script further
   down hides the server-rendered overlay before first paint when it has
   already played, so there's no flash of the seal. Skipped for deep links
   and reduced-motion users. */
const INTRO_PLAYED_KEY = 'ffIntroPlayed';
const SPLASH_SEAL = 150; // px — matches SplashSeal in the iOS launch screen
const SPLASH_DOCK_AT = 430; // ms — wordmark is up; start the flight
const SPLASH_FLIGHT = 460;  // ms — flight into the header; total ≈ 0.9s

function SplashIntro() {
  const [phase, setPhase] = useState('boot'); // 'boot' | 'in' | 'dock' | 'skip'
  const [mounted, setMounted] = useState(false);
  const [centerY, setCenterY] = useState(null);
  const [started, setStarted] = useState(false);
  const sealRef = useRef(null);
  const brandRef = useRef(null);
  const subRef = useRef(null);

  // Before first paint: decide skip, and in the iOS app line the seal up with
  // the native launch screen. The web view there starts below the status bar
  // and ends above the home indicator, so screen-centre isn't view-centre.
  useLayoutEffectSafe(() => {
    setMounted(true);
    let skip = false;
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('savedSearch') || sp.get('editSearch') || sp.get('card') || sp.get('q') || sp.get('tour')) skip = true;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) skip = true;
      if (window.sessionStorage.getItem(INTRO_PLAYED_KEY) === '1') skip = true;
    } catch {
      skip = true;
    }
    if (skip) { setPhase('skip'); announceIntroDone(); return; }
    // NativeBridge reads this to hand off from the iOS launch screen with no
    // fade (the seal is in the same place on both).
    window.__ffIntroPlaying = true;

    if (window.Capacitor?.isNativePlatform?.()) {
      const insets = Math.max(0, window.screen.height - window.innerHeight);
      const bottom = insets > 40 ? 34 : 0; // Face ID iPhones: 34pt home indicator
      const top = insets - bottom;
      setCenterY(window.innerHeight / 2 - (top - bottom) / 2);
    }
    setPhase('in');
    setStarted(true);
  }, []);

  // Keyed on `started`, not `phase` — the phase changes mid-sequence and
  // re-running this effect would cancel the landing timer.
  useEffect(() => {
    if (!started) return;
    const headerSeal = document.querySelector('[data-ff-seal]');
    const core = document.querySelector('[data-ff-brand]');
    const coll = document.querySelector('[data-ff-collectors]');
    for (const el of [headerSeal, core, coll]) if (el) el.style.opacity = '0';

    const fly = (el, target, scale) => {
      const from = el.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      el.style.transition = `transform ${SPLASH_FLIGHT}ms cubic-bezier(0.65, 0, 0.25, 1)`;
      el.style.transform = `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(${scale})`;
    };

    const t1 = setTimeout(() => {
      // The header seal is an SVG whose ring fills 91% of its box; the intro
      // seal image's ring fills 78.5%. Scale ring-to-ring so they match.
      if (sealRef.current && headerSeal) {
        const to = headerSeal.getBoundingClientRect();
        fly(sealRef.current, headerSeal, (to.width * 0.91) / (SPLASH_SEAL * 0.785));
      }
      if (brandRef.current && core) {
        const scale = core.getBoundingClientRect().height / brandRef.current.getBoundingClientRect().height;
        fly(brandRef.current, core, scale);
      }
      if (subRef.current) subRef.current.style.opacity = '0';
      setPhase('dock');
    }, SPLASH_DOCK_AT);

    const t2 = setTimeout(() => {
      if (headerSeal) { headerSeal.style.transition = 'opacity 0.15s'; headerSeal.style.opacity = '1'; }
      if (core) { core.style.transition = 'opacity 0.15s'; core.style.opacity = '1'; }
      if (coll) { coll.style.transition = 'opacity 0.5s ease 0.15s'; coll.style.opacity = '1'; }
      setPhase('skip');
      window.__ffIntroPlaying = false;
      // Set on completion, not start: React's dev double-run would otherwise
      // see its own flag and skip the intro.
      try { window.sessionStorage.setItem(INTRO_PLAYED_KEY, '1'); } catch { /* plays again next time */ }
      announceIntroDone();
    }, SPLASH_DOCK_AT + SPLASH_FLIGHT + 20);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      for (const el of [headerSeal, core, coll]) if (el) el.style.opacity = '';
    };
  }, [started]);

  if (phase === 'skip') return null;

  const sealStyle = {
    width: SPLASH_SEAL,
    height: SPLASH_SEAL,
    position: 'absolute',
    left: '50%',
    top: centerY != null ? centerY : '50%',
    marginLeft: -SPLASH_SEAL / 2,
    marginTop: -SPLASH_SEAL / 2,
  };

  const overlay = (
    <div data-ff-splash className="fixed inset-0 z-[200]" style={{ pointerEvents: phase === 'dock' ? 'none' : 'auto' }}>
      {/* Base layer fades during the flight, revealing the page beneath. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--bg-base)',
          transition: 'opacity 0.35s ease 0.1s',
          opacity: phase === 'dock' ? 0 : 1,
        }}
      />
      {phase !== 'boot' && (
        <div
          aria-hidden="true"
          className="absolute ff-bloom"
          style={{
            width: 360, height: 360, left: '50%', marginLeft: -180,
            top: centerY != null ? centerY - 180 : 'calc(50% - 180px)',
            background: 'radial-gradient(circle, rgba(230,185,107,0.22), transparent 62%)',
            opacity: phase === 'dock' ? 0 : undefined,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={sealRef} src="/brand/seal.png" alt="" style={sealStyle} />
      {phase !== 'boot' && (
        <div
          className="absolute left-0 right-0 flex flex-col items-center"
          style={{ top: `calc(${centerY != null ? `${centerY}px` : '50%'} + ${SPLASH_SEAL / 2 + 18}px)` }}
        >
          <div
            ref={brandRef}
            className="font-display text-[clamp(2.2rem,8.5vw,3.4rem)] tracking-tight leading-none rise"
            style={{ animationDelay: '60ms', animationDuration: '380ms' }}
          >
            Fields <em className="text-[var(--accent)] not-italic">&amp;</em> Floors
          </div>
          <div
            ref={subRef}
            className="mt-4 text-fine text-[var(--accent)] rise"
            style={{ animationDelay: '160ms', animationDuration: '320ms', transition: 'opacity 0.2s ease', fontFamily: 'ui-monospace, monospace' }}
          >
            A Holy Grail search engine
          </div>
        </div>
      )}
    </div>
  );

  // First render (server + hydration) can't portal; render in place. It's
  // fixed and full-screen either way, and portals on the next frame.
  return mounted ? createPortal(overlay, document.body) : overlay;
}

// Other overlays (e.g. the new-user tour) wait for the intro to finish:
// check window.__ffIntroDone, else listen for the 'ff:intro-done' event.
function announceIntroDone() {
  window.__ffIntroDone = true;
  window.dispatchEvent(new Event('ff:intro-done'));
}

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useLayoutEffectSafe = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function Hero({ query, setQuery, onSearch, error, loading, onSuggested, onChipSearch, user, onCardClick, isReturning, recentSearches = [], presetHunts = [] }) {
  // Player-name dropdown under the search field.
  // Picking a suggestion searches it straight away (QA #15).
  const suggest = useSuggestBox(query, (v) => { setQuery(v); onSuggested(v); });
  // One fetch feeds both the desktop floating card and the phone's small
  // "Live right now" row.
  const featured = useFeatured();
  const recent = recentSearches;
  // Signed in after starring a card from the sign-up prompt? Save it now.
  usePendingStarSave();
  // "Caitlin Clark autos /1–25" → text plus a tier-coloured range chip.
  const hunts = presetHunts.map((h) => {
    const m = h.label.match(/^(.*?)\s+(\/\d+[–-]\d+)$/);
    const firstRun = h.filters?.selectedPrintRuns?.[0];
    return m
      ? { ...h, text: m[1], chip: m[2], tier: (firstRun && tierForRun(firstRun)) || null }
      : { ...h, text: h.label, chip: null, tier: null };
  });
  return (
    <section className="relative border-b border-[var(--line-soft)] overflow-hidden">
      {/* Gold bloom — behind the headline on phones, behind the card on desktop. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none md:hidden"
        style={{ background: 'radial-gradient(80% 30% at 50% 18%, rgba(201,149,74,0.12), transparent 72%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none hidden md:block"
        style={{ background: 'radial-gradient(38% 55% at 72% 48%, rgba(201,149,74,0.14), transparent 72%)' }}
      />

      {/* Say what it is, then the search. Desktop: copy left, the live
          featured card floating right. Phones: copy and search first so the
          search box is on screen without scrolling; the card shrinks to a
          "Live right now" row underneath. */}
      <div className="relative max-w-[1120px] mx-auto px-6 lg:px-10 pt-8 pb-14 md:pt-20 md:pb-28 grid md:grid-cols-[1.05fr_0.95fr] gap-9 md:gap-16 items-center">
        <div className="text-left">
          {/* Show, don't tell: a name, an invitation, the search. The real
              cards in RarityStrip below do the explaining. */}
          <h1
            className="font-display text-[clamp(2.75rem,9vw,4.25rem)] leading-[1] tracking-[-0.015em] rise"
            style={{ animationDelay: '220ms', textWrap: 'balance' }}
          >
            The <em className="text-[var(--accent-bright)]">Grail</em> Hunter.
            <span className="sr-only"> Search eBay for rare numbered sports cards, rarest first.</span>
          </h1>
          <p
            className="mt-5 md:mt-7 font-display italic text-h3 md:text-h3 leading-none rise"
            style={{ color: 'var(--accent-bright)', animationDelay: '300ms' }}
          >
            Just try it.
          </p>

          {/* Search — a solid gold-edged field with a labelled gold button. */}
          <div className="mt-3 rise" style={{ animationDelay: '380ms' }}>
            <div
              ref={suggest.anchorRef}
              className="relative flex items-center rounded-xl transition-colors focus-within:border-[var(--accent)]"
              style={{
                border: '0.5px solid var(--accent-deep)',
                background: 'rgba(20,17,12,0.85)',
                boxShadow: '0 0 0 4px rgba(201,149,74,0.05), 0 18px 40px rgba(0,0,0,0.45)',
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); suggest.openBox(); }}
                onKeyDown={(e) => {
                  if (suggest.handleKey(e)) return;
                  if (e.key === 'Enter' && !loading) { suggest.close(); onSearch(); }
                }}
                onFocus={suggest.openBox}
                onBlur={suggest.close}
                {...suggest.inputProps}
                disabled={loading}
                aria-label="Search a player"
                className="relative w-full pl-5 pr-[128px] py-4 md:py-5 bg-transparent border-0 text-h3 md:text-price font-display text-[var(--ink-100)] focus:outline-none"
              />
              {!query && !loading && <RotatingPlaceholder align="left" padRight="128px" />}
              <button
                onClick={onSearch}
                disabled={loading}
                className="absolute right-2 h-11 px-4 rounded-lg flex items-center gap-1.5 text-meta font-semibold whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-40 z-10"
                style={{ background: 'var(--accent-bright)', color: 'var(--ink-on-accent)' }}
              >
                Show cards
                <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {suggest.dropdown}
            {error && <p className="mt-3 text-meta text-[var(--crit)]">{error}</p>}

            <p className="mt-2 text-fine" style={{ color: 'var(--ink-600)' }}>Not affiliated with eBay</p>
          </div>

          {/* Returning visitors get their own searches back; everyone else
              gets ready-made hunts that land straight on results. */}
          <div className="mt-7 rise" style={{ animationDelay: '460ms' }}>
            <div
              className="text-fine mb-3 font-mono"
              style={{ color: 'var(--ink-600)' }}
            >
              {recent.length > 0 ? 'Pick up where you left off' : 'Popular hunts'}
            </div>
            {recent.length > 0 || hunts.length === 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {(recent.length > 0
                  ? recent
                  : ['Caitlin Clark', 'Victor Wembanyama', 'Connor Bedard', 'Cooper Flagg', 'Paul Skenes']
                ).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSuggested(name)}
                    disabled={loading}
                    className="text-meta px-4 py-2 rounded-full transition-colors disabled:opacity-40 hover:border-[var(--accent-deep)] hover:text-[var(--accent-bright)]"
                    style={{ border: '0.5px solid var(--line)', color: 'var(--ink-200)', background: 'var(--bg-elev)' }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {hunts.map((h) => (
                  <button
                    key={h.label}
                    type="button"
                    onClick={() => onChipSearch(h.query, h.filters)}
                    disabled={loading}
                    aria-label={h.label}
                    className="group inline-flex items-center gap-2 text-meta pl-4 pr-2 py-1.5 rounded-full transition-colors disabled:opacity-40 hover:border-[var(--accent-deep)]"
                    style={{ border: '0.5px solid var(--line)', background: 'var(--bg-elev)', color: 'var(--ink-200)', minHeight: 36 }}
                  >
                    <span className="group-hover:text-[var(--accent-bright)] transition-colors">{h.text}</span>
                    {h.chip && (
                      h.tier
                        ? <Badge mono tier={h.tier}>{h.chip}</Badge>
                        : <Badge>{h.chip}</Badge>
                    )}
                    {!h.chip && <span className="w-2" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phones only: the featured card as a compact live row. */}
          <div className="md:hidden mt-8 rise" style={{ animationDelay: '540ms' }}>
            <HeroLiveRow featured={featured} onCardClick={onCardClick} />
          </div>

          {/* Returning-user shortcuts only show to logged-in users. */}
          {user && (
            <div className="mt-8 flex gap-8 rise" style={{ animationDelay: '560ms' }}>
              <Link
                href="/watchlist"
                className="flex items-center gap-2 text-fine text-[var(--ink-400)] hover:text-[var(--accent-bright)] transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.6} aria-hidden="true" /> My hunts
              </Link>
              <Link
                href="/watchlist-cards"
                className="flex items-center gap-2 text-fine text-[var(--ink-400)] hover:text-[var(--accent-bright)] transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.6} aria-hidden="true" /> Watchlist
              </Link>
            </div>
          )}
        </div>

        {/* Desktop: the floating featured card. */}
        <div className="hidden md:flex flex-col items-center rise" style={{ animationDelay: '120ms' }}>
          <HeroCard featured={featured} onCardClick={onCardClick} />
        </div>
      </div>

      <RarityStrip onCardClick={onCardClick} onChipSearch={onChipSearch} />
    </section>
  );
}

/* RarityStrip — "show, don't tell" for what makes us different from eBay:
   one search across many print runs, sorted rarest first. Real, live
   listings from /api/rarest (our own search, cached hourly). Hidden if there
   aren't enough cards; never placeholders. Tapping a card opens the card
   popup; "See all" runs the same search. */
const RARITY_STRIP_RUNS = ['/1', '/5', '/10', '/15', '/25', '/49', '/50'];

function RarityStrip({ onCardClick, onChipSearch }) {
  const [data, setData] = useState(null); // null = loading
  useEffect(() => {
    let cancelled = false;
    fetch('/api/rarest')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .catch(() => ({ items: [] }))
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);

  if (data && !(data.items?.length >= 6)) return null;
  const items = data?.items || [];
  const fmt = (p) => `$${Number(p).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="relative border-t border-[var(--line-soft)]">
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10 pt-10 pb-12 md:pt-14 md:pb-16">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] leading-tight">
              One search. <em className="text-[var(--accent-bright)]">Rarest first.</em>
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 min-h-[24px]">
              {data?.player && (
                <>
                  <Badge>{data.player}</Badge>
                  <Badge>Auto</Badge>
                  <Badge mono tier="grail">/1–25</Badge>
                  <Badge mono tier="ultra">/26–50</Badge>
                </>
              )}
            </div>
          </div>
          {data?.player && (
            <button
              type="button"
              onClick={() => onChipSearch(data.player, { autoCards: true, numberedCards: true, selectedPrintRuns: RARITY_STRIP_RUNS })}
              className="py-3 -my-3 inline-flex items-center gap-1.5 text-fine text-[var(--ink-400)] hover:text-[var(--accent-bright)] transition-colors"
            >
              See all <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Phones: a sideways-scrolling row. Desktop: all eight in one line. */}
        <div className="mt-6 -mx-6 px-6 md:mx-0 md:px-0 flex md:grid md:grid-cols-8 gap-3 overflow-x-auto md:overflow-visible snap-x pb-2">
          {(data ? items : Array.from({ length: 8 }, (_, i) => ({ id: `s${i}` }))).map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => it.title && onCardClick?.(it)}
              disabled={!it.title}
              aria-label={it.title ? `${it.title}, ${fmt(it.price)}` : 'Loading'}
              className="group flex-none w-[128px] md:w-auto snap-start text-left grid gap-1.5 content-start"
            >
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[var(--bg-elev-2)]">
                {!it.title && <div className="absolute inset-0 shimmer" />}
                {it.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={upscaleEbayImage(it.image)}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              {it.printRun != null && (
                <span className="justify-self-start">
                  <Badge mono tier={tierForRun(`/${it.printRun}`) || 'grail'}>/{it.printRun}</Badge>
                </span>
              )}
              {it.title && (
                <span className="text-fine leading-snug line-clamp-2" style={{ color: 'var(--ink-400)' }}>{it.title}</span>
              )}
              {it.price != null && (
                <span className="font-display text-lede leading-none text-[var(--accent-bright)]">{fmt(it.price)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Rotating animated placeholder for the search bar.
   Cycles through SUGGESTED_SEARCHES with a slide-up fade transition.
   Each entry sits for ~3 seconds before animating in the next one. */
function RotatingPlaceholder({ align = 'center', padRight = '4rem' }) {
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
      className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden flex items-center ${align === 'left' ? 'justify-start pl-5' : 'justify-center text-center'}`}
      style={{ height: '2.4em', paddingRight: align === 'left' ? padRight : undefined }}
    >
      <span
        key={animKey}
        className={`block font-display italic text-[var(--ink-600)] rotate-placeholder ${align === 'left' ? 'text-h3 md:text-price truncate' : 'text-price md:text-price text-center'}`}
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
  // How it works as three icons, then the plans. Show, don't tell: the card
  // strip above already demonstrates the product.
  const steps = [
    [ListFilter, 'Pick print runs'],
    [Star, 'Star cards'],
    [Bell, 'Get alerted'],
  ];
  return (
    <>
      <section id="why" className="max-w-[1040px] mx-auto px-6 lg:px-10 pt-12 lg:pt-16 scroll-mt-24">
        <h2 className="sr-only">How it works</h2>
        <ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-3 border-y" style={{ borderColor: 'var(--line)' }}>
          {steps.map(([Icon, label], i) => (
            <li
              key={label}
              className={`flex items-center gap-3 py-4 md:py-5 md:px-5 text-lede font-medium ${i ? 'border-t md:border-t-0 md:border-l' : ''}`}
              style={{ borderColor: 'var(--line-soft)', color: 'var(--ink-100)' }}
            >
              <Icon className="w-[22px] h-[22px] flex-none" strokeWidth={1.75} style={{ color: 'var(--accent-bright)' }} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>
      <PlansSection user={user} />
    </>
  );
}

/* Reusable tier-coloured chip. Always single source of truth for print-run
   colors via tierForRun + tierChipStyle from rarityUtils. */
function TierChip({ run }) {
  const tier = tierForRun(run);
  if (!tier) return null;
  return (
    <span
      className="font-mono text-fine px-1.5 py-[2px] rounded flex-none"
      style={tierChipStyle(tier)}
    >
      {run.startsWith('/') ? run : `/${run}`}
    </span>
  );
}

/* One plan: a price and one line. `featured` raises Base (and puts it first
   on phones); the others collapse to a single row on phones. */
function PlanCard({ name, price, unit, line, ctaLabel, ctaHref, featured = false, muted = false }) {
  return (
    <div
      className={`rounded-xl p-4 md:p-5 flex ${featured ? 'flex-col gap-1.5 order-first md:order-none' : 'flex-row md:flex-col items-center md:items-stretch justify-between gap-3 md:gap-1.5'}`}
      style={featured
        ? { background: 'var(--bg-elev)', border: '1px solid var(--accent-bright)' }
        : { border: '1px solid var(--line)', opacity: muted ? 0.8 : 1 }}
    >
      <div className="min-w-0">
        <div className="text-meta font-medium" style={{ color: featured ? 'var(--accent)' : 'var(--ink-400)' }}>{name}</div>
        <div className="font-display italic leading-none text-price md:text-h1 mt-1" style={{ color: muted ? 'var(--ink-400)' : 'var(--ink-100)' }}>
          {price}{unit && <small className="not-italic font-sans text-meta ml-1" style={{ color: 'var(--ink-400)' }}>{unit}</small>}
        </div>
        <div className="text-body mt-1.5" style={{ color: 'var(--ink-200)' }}>{line}</div>
      </div>
      <Link
        href={ctaHref}
        className={`flex-none text-center rounded-lg text-fine font-semibold no-underline whitespace-nowrap ${featured ? 'mt-3 py-3' : 'px-3.5 py-2.5 md:mt-3 md:py-3'}`}
        style={featured
          ? { background: 'var(--accent-bright)', color: 'var(--ink-on-accent)' }
          : { color: 'var(--ink-100)', border: '1px solid var(--ink-600)' }}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

/* Plans: a price and one line each. Inside the iOS app no web price is shown;
   Apple bills the trial and /subscribe shows the App Store price. */
function PlansSection({ user }) {
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  // Early access: no plans or prices, just one plain line.
  if (!PAYMENTS_LIVE) {
    return (
      <section className="max-w-[1040px] mx-auto px-6 lg:px-10 pt-8 pb-16">
        <p className="text-center text-body" style={{ color: 'var(--ink-200)' }}>
          Free during early access. Alerts on up to 5 saved searches.
        </p>
      </section>
    );
  }
  return (
    <section className="max-w-[1040px] mx-auto px-6 lg:px-10 pt-8 pb-16">
      <h2 className="sr-only">Plans</h2>
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_1.15fr_1fr] md:items-stretch">
        <PlanCard
          name="Free"
          price="$0"
          line="Search, watchlist and 1 alert."
          ctaLabel={user ? 'Signed in' : 'Sign up'}
          ctaHref={user ? '/watchlist-cards' : '/signup?src=banner'}
        />
        <PlanCard
          featured
          name="Base"
          price={native ? '14 days free' : '$6.99'}
          unit={native ? null : '/mo'}
          line={native ? 'Alerts on 5 searches. Billed by Apple.' : 'Alerts on 5 searches. 14 days free.'}
          ctaLabel="Start free trial"
          ctaHref={user ? '/subscribe' : '/signup?next=/subscribe'}
        />
        <PlanCard
          muted
          name="Premium"
          price="Soon"
          line="Tell us what you'd want."
          ctaLabel="Tell us"
          ctaHref="/contact"
        />
      </div>
      {!native && (
        <p className="text-center text-fine mt-5" style={{ color: 'var(--ink-600)' }}>
          Base is also $59/yr, over 3 months free. Prices in CAD, plus applicable taxes.
        </p>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Signed-in home. Members already know what the site does, so no pitch:
   search first (their saved and recent searches as chips), then what
   changed since their last visit, then a small row of live cards. Free
   members on the website get one upgrade line. The iOS app skips that
   line and the header nav, since the tab bar covers it.
   Data: /api/home (our tables only) and /api/featured (cached hourly).
   ────────────────────────────────────────────────────────────────────── */
function SignedInHome({ query, setQuery, onSearch, onSuggested, recentSearches = [], onCardClick, error }) {
  // Save a card starred while signed out, now that they're back signed in.
  usePendingStarSave();
  // Same as-you-type player and team suggestions as the visitor search.
  // Picking a suggestion searches it straight away (QA #15).
  const suggest = useSuggestBox(query, (v) => { setQuery(v); onSuggested(v); });
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  const [saved, setSaved] = useState([]);
  const [home, setHome] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/saved-searches').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!cancelled && d?.searches) setSaved(d.searches.slice(0, 4));
    }).catch(() => {});
    // One summary per visit: /api/home moves "last seen" forward, so reuse the
    // first answer for the rest of this browser session.
    let cachedHome = null;
    try { cachedHome = JSON.parse(sessionStorage.getItem('ffHomeSummary') || 'null'); } catch {}
    if (cachedHome) { setHome(cachedHome); }
    else {
      fetch('/api/home').then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (cancelled || !d) return;
        setHome(d);
        try { sessionStorage.setItem('ffHomeSummary', JSON.stringify(d)); } catch {}
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, []);

  const recents = recentSearches.filter((r) => !saved.some((s) => s.query?.toLowerCase() === r.toLowerCase())).slice(0, 4);

  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-6 lg:px-10 pt-12 md:pt-24 pb-20">
      {/* Search is the centrepiece: big, centred, with the member's hunts under it.
          Heading reuses the approved hero name and strip line (no new copy). */}
      <div className="max-w-[760px] mx-auto">
      <h1 className="text-center font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[1] tracking-[-0.015em]" style={{ textWrap: 'balance' }}>
        The <em className="text-[var(--accent-bright)]">Grail</em> Hunter.
      </h1>
      <p className="text-center mt-3 mb-7 md:mb-9 font-display italic text-h3 md:text-h3 leading-none" style={{ color: 'var(--ink-400)' }}>
        One search. Rarest first.
      </p>
      <form
        ref={suggest.anchorRef}
        onSubmit={(e) => { e.preventDefault(); suggest.close(); onSearch(); }}
        className="flex items-center gap-3 rounded-xl pl-5 pr-2 py-2"
        style={{ background: 'var(--bg-elev)', border: '1.5px solid var(--accent-deep)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}
      >
        <Search className="w-6 h-6 flex-none" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); suggest.openBox(); }}
          onKeyDown={(e) => { suggest.handleKey(e); }}
          onFocus={suggest.openBox}
          onBlur={suggest.close}
          {...suggest.inputProps}
          placeholder="Search a player or team"
          aria-label="Search a player or team"
          className="flex-1 min-w-0 bg-transparent outline-none text-h3 md:text-h3 py-3"
          style={{ color: 'var(--ink-100)' }}
        />
        <button type="submit" aria-label="Show cards" className="h-12 md:h-14 px-4 md:px-6 rounded-xl inline-flex items-center gap-2 flex-none text-lede font-semibold" style={{ background: 'var(--accent-bright)', color: 'var(--ink-on-accent)' }}>
          <span className="hidden md:inline">Show cards</span>
          <ArrowRight className="w-5 h-5" strokeWidth={2} />
        </button>
      </form>
      {suggest.dropdown}
      {error && <p className="text-meta mt-2" style={{ color: 'var(--crit)' }}>{error}</p>}

      {(saved.length > 0 || recents.length > 0) && (
        <div className="flex gap-2.5 mt-5 overflow-x-auto md:flex-wrap md:justify-center pb-1 -mx-1 px-1">
          {saved.map((s) => (
            <a key={s.id} href={`/?savedSearch=${s.id}`} className="flex-none inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-body whitespace-nowrap"
               style={{ color: 'var(--ink-200)', border: '1px solid var(--accent-deep)' }}>
              <Crosshair className="w-4 h-4" strokeWidth={1.75} style={{ color: 'var(--accent)' }} aria-hidden="true" />{s.name}
            </a>
          ))}
          {recents.map((r) => (
            <button key={r} type="button" onClick={() => onSuggested(r)} className="flex-none inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-body whitespace-nowrap"
                    style={{ color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
              <Clock className="w-4 h-4" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />{r}
            </button>
          ))}
        </div>
      )}

      </div>

      <SinceLastVisit home={home} hasSaved={saved.length > 0} />
      <LiveRightNow onCardClick={onCardClick} recentSearches={recentSearches} />

      {PAYMENTS_LIVE && !native && home && home.tier === 'free' && (
        <div className="flex items-center justify-between gap-3 mt-8 rounded-xl px-4 py-3 text-body" style={{ border: '1px solid var(--line)', color: 'var(--ink-200)' }}>
          <span>You have 1 alert on the free plan.</span>
          <Link href="/subscribe" className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--accent-bright)' }}>
            Get alerts on 5 searches <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}

function sinceLabel(iso) {
  if (!iso) return null;
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'Earlier today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

function timeLeft(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function SinceLastVisit({ home, hasSaved }) {
  const matches = home?.newMatches || [];
  const drops = home?.priceDrops || [];
  const ending = home?.endingSoon || [];
  const nothing = home && !matches.length && !drops.length && !ending.length;
  const Head = (
    <div className="flex items-baseline justify-between mt-14 mb-4">
      <h2 className="font-display italic text-price md:text-price">Since you were last here</h2>
      {home?.since && <span className="text-meta" style={{ color: 'var(--ink-400)' }}>{sinceLabel(home.since)}</span>}
    </div>
  );
  if (!home) return <>{Head}<div className="h-[120px] rounded-xl shimmer" style={{ background: 'var(--bg-elev)' }} /></>;
  if (nothing) {
    return (
      <>{Head}
        <div className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 text-body" style={{ color: 'var(--ink-200)' }}>
            <Bell className="w-4 h-4" strokeWidth={1.75} style={{ color: 'var(--accent)' }} aria-hidden="true" />Nothing new yet
          </div>
          <p className="text-meta mt-1.5" style={{ color: 'var(--ink-600)' }}>
            {hasSaved ? 'New matches, price drops and ending auctions will show up here.' : 'Save a search or star a card and changes will show up here.'}
          </p>
        </div>
      </>
    );
  }
  const Panel = ({ icon: Icon, title, children }) => (
    <div className="rounded-xl px-5 py-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2 text-lede font-medium mb-1.5" style={{ color: 'var(--ink-100)' }}>
        <Icon className="w-5 h-5" strokeWidth={1.75} style={{ color: 'var(--accent)' }} aria-hidden="true" />{title}
      </div>
      {children}
    </div>
  );
  const Row = ({ href, image, title, meta, right, rightSub, rightTone }) => (
    <a href={href} className="grid grid-cols-[48px_1fr_auto] gap-3 items-center py-2.5" style={{ borderTop: '1px solid var(--line-soft)' }}>
      <span className="w-[48px] aspect-[3/4] rounded overflow-hidden flex-none" style={{ background: 'var(--bg-elev-2)' }}>
        {image && <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />}
      </span>
      <span className="min-w-0">
        <span className="block text-body leading-snug line-clamp-2" style={{ color: 'var(--ink-200)' }}>{title}</span>
        {meta && <span className="block text-fine mt-0.5" style={{ color: 'var(--ink-400)' }}>{meta}</span>}
      </span>
      <span className="text-right whitespace-nowrap">
        <span className="block text-lede font-medium" style={{ color: rightTone || 'var(--ink-100)' }}>{right}</span>
        {rightSub && <span className="block text-fine" style={{ color: 'var(--ink-400)' }}>{rightSub}</span>}
      </span>
    </a>
  );
  const money = (v) => (v != null ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '');
  return (
    <>{Head}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {matches.length > 0 && (
          <Panel icon={Bell} title={`${matches.reduce((n, m) => n + m.count, 0)} new matches`}>
            {matches.map((m) => (
              <a key={m.id} href={`/?savedSearch=${m.id}`} className="flex items-center justify-between gap-3 py-2.5 text-body" style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--ink-200)' }}>
                <span className="truncate">{m.name}</span>
                <span className="whitespace-nowrap" style={{ color: 'var(--accent-bright)' }}>{m.count} new</span>
              </a>
            ))}
          </Panel>
        )}
        {drops.length > 0 && (
          <Panel icon={TrendingDown} title={`${drops.length} price ${drops.length === 1 ? 'drop' : 'drops'}`}>
            {drops.map((d) => (
              <Row key={d.id} href="/watchlist-cards" image={d.image_url} title={d.title} meta={`Was ${money(d.price_when_saved)}`}
                   right={money(d.price)} rightSub={`−${d.dropPct}%`} rightTone="#7fd49a" />
            ))}
          </Panel>
        )}
        {ending.length > 0 && (
          <Panel icon={Hourglass} title={`${ending.length} ${ending.length === 1 ? 'auction' : 'auctions'} ending soon`}>
            {ending.map((d) => (
              <Row key={d.id} href="/watchlist-cards" image={d.image_url} title={d.title}
                   meta={d.bid_count != null ? `${d.bid_count} ${d.bid_count === 1 ? 'bid' : 'bids'}` : null}
                   right={money(d.price)} rightSub={timeLeft(d.msLeft)} />
            ))}
          </Panel>
        )}
      </div>
    </>
  );
}

/* LiveRightNow — live cards from the member's own hunts (their newest saved
   searches, then recently searched players) via /api/live-for-you, which
   caches each search for an hour. Falls back to the featured Grail cards
   when they have no hunts yet or nothing comes back. */
function LiveRightNow({ onCardClick, recentSearches = [] }) {
  const [items, setItems] = useState(null);
  const recentKey = recentSearches.slice(0, 2).join('|');
  useEffect(() => {
    let cancelled = false;
    const featured = () => fetch('/api/featured').then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.items || (d?.featured ? [d.featured] : []));
    fetch('/api/live-for-you', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recent: recentKey ? recentKey.split('|') : [] }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.items?.length ? d.items : featured()))
      .then((list) => { if (!cancelled) setItems(list || []); })
      .catch(() => featured().then((list) => { if (!cancelled) setItems(list || []); }).catch(() => { if (!cancelled) setItems([]); }));
    return () => { cancelled = true; };
  }, [recentKey]);
  if (items && items.length === 0) return null;
  return (
    <>
      <div className="flex items-baseline justify-between mt-14 mb-4">
        <h2 className="font-display italic text-price md:text-price">Live right now</h2>
        <span className="text-meta" style={{ color: 'var(--ink-400)' }}>Updated hourly</span>
      </div>
      <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto pb-1 -mx-1 px-1">
        {(items || Array.from({ length: 5 }, () => null)).map((it, i) => (
          <button key={it?.id || i} type="button" disabled={!it} onClick={() => it && onCardClick?.(it)}
                  className="w-[160px] md:w-auto flex-none text-left rounded-xl p-2.5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line-soft)' }}>
            <span className="block aspect-[3/4] rounded overflow-hidden mb-2" style={{ background: 'var(--bg-elev-2)' }}>
              {it?.image && <img src={upscaleEbayImage(it.image)} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </span>
            <span className="block text-body leading-snug h-[38px] overflow-hidden" style={{ color: 'var(--ink-200)' }}>
              {it?.printRun && <TierChip run={`/${it.printRun}`} />} {it?.title || ''}
            </span>
            <span className="block font-display text-h3 leading-none mt-2.5" style={{ color: 'var(--accent-bright)' }}>{it ? featuredPrice(it) : ''}</span>
            {it?.from && (
              <span className="block text-meta mt-1.5 truncate" style={{ color: 'var(--ink-400)' }}>From {it.from}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/* useFeatured — the live featured grail from /api/featured. The route is
   cached server-side (1-hour TTL, rotating athletes), so this costs no extra
   eBay quota per visit. Fetched once in Hero and shared by HeroCard (desktop)
   and HeroLiveRow (phones). */
function useFeatured() {
  const [state, setState] = useState({ item: null, loading: true, failed: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/featured');
        if (!res.ok) throw new Error('featured fetch failed');
        const data = await res.json();
        if (cancelled) return;
        setState(data.featured
          ? { item: data.featured, loading: false, failed: false }
          : { item: null, loading: false, failed: true });
      } catch {
        if (!cancelled) setState({ item: null, loading: false, failed: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}

function featuredPrice(item) {
  return item?.price != null
    ? `$${Number(item.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : null;
}

function featuredGrade(item) {
  return item && (
    (item.psaGrade && `PSA ${item.psaGrade}`) ||
    (item.bgsGrade && `BGS ${item.bgsGrade}`) ||
    (item.sgcGrade && `SGC ${item.sgcGrade}`) ||
    (item.cgcGrade && `CGC ${item.cgcGrade}`)
  );
}

/* HeroCard — the featured find as a floating, slabbed object with a slow
   foil sweep (desktop). Tapping opens the same CardModal search results use.
   Loading shows the empty frame at full size (no layout shift); if the
   fetch fails, the brand seal stands in so the hero never looks broken. */
function HeroCard({ featured, onCardClick }) {
  const { item, loading, failed } = featured;

  if (failed) {
    return (
      <div className="flex items-center justify-center w-[300px] aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/seal.png" alt="" className="w-[70%] opacity-90" />
      </div>
    );
  }

  const price = featuredPrice(item);
  const grade = featuredGrade(item);

  return (
    <>
      <button
        type="button"
        onClick={() => item && onCardClick?.(item)}
        disabled={!item}
        aria-label={item ? `Featured find: ${item.title}` : 'Loading featured find'}
        className="block w-[300px] group"
      >
        <div className="ff-float">
          <div
            className="relative rounded-xl p-2.5 transition-shadow duration-500"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03))',
              border: '0.5px solid rgba(255,255,255,0.2)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.7), 0 0 90px rgba(230,185,107,0.16)',
            }}
          >
            <div className="ff-sheen-wrap ff-sheen-loop relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-[var(--bg-elev-2)] via-[#1d180e] to-[#0e0b07]">
              {loading && <div className="absolute inset-0 shimmer" />}
              {item && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upscaleEbayImage(item.image)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              )}
              {item?.isAuction && item.endTime && <BidCountdown endTime={item.endTime} />}
            </div>
          </div>
        </div>
      </button>

      {/* Live line + chips + price — reads as a caption to the card. */}
      <div className="mt-6 flex items-center gap-2 font-mono text-fine" style={{ color: 'var(--ink-400)' }}>
        <span className="ff-live-dot" aria-hidden="true" />
        Featured find · Live on eBay
      </div>
      <div className="mt-3 min-h-[30px] flex items-center justify-center gap-1.5">
        {item && (
          <>
            {item.hasAuto && <Badge>Auto</Badge>}
            {item.printRun && <Badge mono tier={tierForRun(item.printRun) || 'grail'}>/{item.printRun}</Badge>}
            {grade && <Badge>{grade}</Badge>}
            {price && (
              <span className="ml-2 font-display text-h3 leading-none text-[var(--accent-bright)]">{price}</span>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* HeroLiveRow — phones only. The featured find as one compact tappable row
   under the search, so the search box stays above the fold. Hidden entirely
   if the fetch fails; a placeholder row would just be noise. */
function HeroLiveRow({ featured, onCardClick }) {
  const { item, loading, failed } = featured;
  if (failed) return null;
  const price = featuredPrice(item);
  const grade = featuredGrade(item);
  return (
    <>
      <div className="mb-3 flex items-center gap-2 font-mono text-fine" style={{ color: 'var(--ink-400)' }}>
        <span className="ff-live-dot" aria-hidden="true" />
        Live right now
      </div>
      <button
        type="button"
        onClick={() => item && onCardClick?.(item)}
        disabled={!item}
        aria-label={item ? `Featured find: ${item.title}` : 'Loading featured find'}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left"
        style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line)' }}
      >
        <div className="relative w-14 aspect-[3/4] flex-none rounded overflow-hidden bg-[var(--bg-elev-2)]">
          {loading && <div className="absolute inset-0 shimmer" />}
          {item && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={upscaleEbayImage(item.image)} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1 min-h-[20px]">
            {item?.printRun && <Badge mono tier={tierForRun(item.printRun) || 'grail'}>/{item.printRun}</Badge>}
            {item?.hasAuto && <Badge>Auto</Badge>}
            {grade && <Badge>{grade}</Badge>}
          </div>
          <div className="text-meta leading-snug line-clamp-2" style={{ color: 'var(--ink-200)' }}>
            {item ? item.title : ' '}
          </div>
        </div>
        {price && (
          <span className="flex-none font-display text-h3 leading-none text-[var(--accent-bright)]">{price}</span>
        )}
      </button>
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
        <SectionLabel>Card type</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <FilterChip on={!!filters.autoCards} onClick={() => setFilter('autoCards', !filters.autoCards)}>Autographs</FilterChip>
          <FilterChip on={!!filters.rookieCards} onClick={() => setFilter('rookieCards', !filters.rookieCards)}>Rookie cards</FilterChip>
          <FilterChip on={!!filters.numberedCards} onClick={() => setFilter('numberedCards', !filters.numberedCards)}>Numbered</FilterChip>
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
              <span className="text-fine text-[var(--accent)]">Print Run</span>
              <button
                onClick={() => {
                  const allSelected = filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length;
                  setFilter('selectedPrintRuns', allSelected ? [] : ALL_PRESET_PRINT_RUNS);
                }}
                className="py-2 -my-2 text-fine text-[var(--ink-400)] hover:text-[var(--accent)] transition-colors"
              >
                {filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-5">
              {PRINT_RUN_TIERS.map((tier) => {
                const allInTierSelected = tier.runs.every((r) => filters.selectedPrintRuns.includes(r));
                const someInTierSelected = tier.runs.some((r) => filters.selectedPrintRuns.includes(r));
                const tierKey = tier.key;
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
                        <span className="font-display text-lede leading-tight" style={{ color: tierColor }}>{tier.label}</span>
                        <span className="text-meta text-[var(--ink-400)]">{tier.made}</span>
                      </div>
                      <FilterChip on={allInTierSelected} onClick={toggleTier}>All {tier.label}</FilterChip>
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
                            aria-pressed={sel}
                            className="ff-pill font-mono text-meta inline-flex items-center rounded-full transition-all"
                            style={{
                              minHeight: 36,
                              padding: '0 14px',
                              border: `1px solid ${sel ? tierColor : 'var(--line)'}`,
                              background: sel ? tierColor : 'var(--bg-elev-2)',
                              color: sel ? 'var(--ink-on-accent)' : 'var(--ink-200)',
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

      <div>
        <SectionLabel>Listing type</SectionLabel>
        <SegmentedGroup
          value={filters.listingType}
          onChange={(v) => setFilter('listingType', v)}
          options={[
            ['any', 'All'],
            ['auction', 'Auction'],
            ['buyItNow', 'Buy It Now'],
          ]}
        />
      </div>

      <SectionDivider />

      <div>
        <SectionLabel>Price</SectionLabel>
        <PriceRangeSlider
          min={filters.priceMin}
          max={filters.priceMax === 5000 ? PRICE_NO_MAX : filters.priceMax}
          onChange={(min, max) => {
            setFilter('priceMin', min);
            setFilter('priceMax', max);
          }}
        />
      </div>

      <SectionDivider />

      {/* Company, League and Condition fold away (the 3 most-used filters stay open). */}
      <MoreFilters active={moreFiltersActive(filters)} label="Company · League · Condition">
        <CardCompanyFilter filters={filters} setFilter={setFilter} />
        <TeamFilter filters={filters} setFilter={setFilter} />
        <div>
          <SectionLabel>Condition</SectionLabel>
          <SegmentedGroup
            value={filters.condition}
            onChange={(v) => setFilter('condition', v)}
            options={[
              ['any', 'Any'],
              ['raw', 'Raw'],
              ['graded', 'Graded'],
            ]}
          />
        </div>
        <ShippingFilters filters={filters} setFilter={setFilter} />
      </MoreFilters>
    </div>
  );
}

// Filters inside "More filters" that are on, so it opens by itself.
function moreFiltersActive(f) {
  return (f.brands?.length ? 1 : 0) + (f.brandLines?.length ? 1 : 0) + (f.teams?.length ? 1 : 0)
    + (f.condition && f.condition !== 'any' ? 1 : 0) + shippingActive(f);
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
      <span className={`text-body ${checked ? 'text-[var(--ink-100)]' : 'text-[var(--ink-200)]'}`}>
        {label}
      </span>
      <span
        className="relative w-8 h-4 rounded-full transition-colors"
        style={{
          background: checked ? 'var(--accent-bright)' : 'rgba(255,255,255,0.10)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform"
          style={{
            background: checked ? 'var(--ink-on-accent)' : '#6a6356',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
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
        <p className="text-fine text-[var(--accent)]">
          <span className="inline-block w-6 h-px bg-[var(--accent)] align-middle mr-3 -translate-y-[2px]" />
          {isEditing ? (
            <>Editing · <span className="normal-case tracking-normal italic font-serif text-[var(--ink-100)] ml-1">{editingSearch.name}</span></>
          ) : (
            <>Refine</>
          )}
        </p>
        <button
          onClick={onCancel}
          className="text-fine text-[var(--ink-400)] hover:text-[var(--accent)] transition-colors"
        >
          {isEditing ? 'Cancel' : <><ArrowLeft className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />Back</>}
        </button>
      </div>

      {/* The query — editable inline */}
      <div className="mb-12 rise">
        <p className="text-fine text-[var(--ink-400)] mb-3">
          Searching for
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          className="w-full font-display text-h1 md:text-h1 bg-transparent border-b border-[var(--line)] focus:border-[var(--accent)] outline-none text-[var(--ink-100)] italic pb-2 transition-colors"
        />
      </div>

      {/* Filter controls */}
      <div className="mb-12 rise" style={{ animationDelay: '120ms' }}>
        <FilterControls filters={filters} setFilter={setFilter} />
      </div>

      {/* Search CTA — becomes "Update search criteria" in edit mode */}
      <div className="flex justify-between items-center rise" style={{ animationDelay: '220ms' }}>
        <span className="text-fine text-[var(--ink-600)]">All filters apply with AND logic</span>
        <button
          onClick={onSubmit}
          className="group inline-flex items-center gap-3 px-9 py-4 transition-all text-body font-semibold"
          style={{
            background: 'var(--accent-bright)',
            color: 'var(--ink-on-accent)',
          }}
        >
          {isEditing ? 'Update search criteria' : 'Search'}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </button>
      </div>
    </section>
  );
}

// Count of "narrowing" filters, for the Filters pill badge. Print-run subset
// is intentionally excluded to keep the number predictable.
function countActiveFilters(f) {
  let n = 0;
  if (f.autoCards) n++;
  if (f.rookieCards) n++;
  if (f.numberedCards) n++;
  if (f.condition && f.condition !== 'any') n++;
  if (f.listingType && f.listingType !== 'any') n++;
  if ((f.priceMin ?? 0) > 0 || !isPriceNoMax(f.priceMax ?? PRICE_NO_MAX)) n++;
  if (f.brands?.length) n++;
  if (f.teams?.length) n++;
  n += shippingActive(f);
  return n;
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
              <p className="text-fine text-[var(--ink-400)]">
                Print run
              </p>
              <button
                onClick={() => {
                  const allSelected = filters.selectedPrintRuns.length === ALL_PRESET_PRINT_RUNS.length;
                  setFilter('selectedPrintRuns', allSelected ? [] : ALL_PRESET_PRINT_RUNS);
                }}
                className="py-2 -my-2 text-fine text-[var(--ink-600)] hover:text-[var(--accent)] transition-colors"
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
                        ? 'border-[var(--accent)] bg-[var(--accent)]/[0.06] text-[var(--accent)]'
                        : partial
                          ? 'border-[var(--accent-deep)] bg-[var(--accent)]/[0.02] text-[var(--accent)]/85'
                          : 'border-[var(--line)] text-[var(--ink-400)] hover:text-[var(--ink-100)] hover:border-[var(--ink-400)]'
                    }`}
                  >
                    <span className="text-body">{tier.label}</span>
                    <span className="font-mono text-fine tracking-wider opacity-80">
                      {tier.range}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom print run section */}
            <div className="mt-5 pt-4 border-t border-[var(--line-soft)]">
              <p className="text-fine text-[var(--ink-600)] mb-2">
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
                className={`flex items-center gap-3 w-full text-left text-body py-1 transition-colors ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
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
                className={`flex items-center gap-3 w-full text-left text-body py-1 transition-colors ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
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
        <PriceRangeSlider
          min={filters.priceMin}
          max={filters.priceMax === 5000 ? PRICE_NO_MAX : filters.priceMax}
          onChange={(min, max) => {
            setFilter('priceMin', min);
            setFilter('priceMax', max);
          }}
        />
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
                className={`flex items-center gap-3 w-full text-left text-body py-1 transition-colors ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
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
      <span className="font-display text-lede">{label}</span>
      <span className="font-mono text-fine text-[var(--ink-600)] tracking-wider">{number}</span>
    </div>
  );
}

function FilterLabel({ children }) {
  return (
    <h3 className="text-fine text-[var(--ink-400)] mb-4">
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
        <span className="font-mono text-fine text-[var(--ink-400)]">/</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. 73"
          className="flex-1 min-w-0 bg-transparent border-b border-[var(--line)] focus:border-[var(--accent)] outline-none font-mono text-fine py-1 text-[var(--ink-100)] placeholder:text-[var(--ink-600)] transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!val.trim()}
          className="py-2 -my-2 text-fine text-[var(--accent)] disabled:text-[var(--ink-600)] disabled:cursor-not-allowed hover:text-[var(--accent-bright)] transition-colors"
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
              className="inline-flex items-center gap-1 px-2 py-1 font-mono text-fine text-[var(--accent)] bg-[var(--accent)]/[0.08] border border-[var(--accent-deep)] hover:bg-[var(--accent)]/[0.14] transition-colors"
              title="Click to remove"
            >
              {run}
              <span className="text-[var(--ink-400)] leading-none"><X className="w-3 h-3" strokeWidth={2} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      )}

      {err && <p className="text-fine text-[var(--crit)] mt-1.5">{err}</p>}
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
        className={`text-body transition-colors ${
          checked ? 'text-[var(--ink-100)]' : 'text-[var(--ink-200)] group-hover:text-[var(--ink-100)]'
        }`}
      >
        {label}
      </span>
      <span
        className={`relative w-7 h-3.5 rounded-full transition-colors ${
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
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

/* ─────────────────────────────────────────────
   Results — refined cards with badge system
   ───────────────────────────────────────────── */
const PAGE_DISPLAY_SIZE = 200; // how many cards to render at once

function Results({ loading, hasSearched, results, error, formatPrice, scanPhrase, onSuggested, appliedFilters, resultMeta, hasPendingFilters, onPendingClick, onCardClick, nameFix = null, onNameFix, query = '', onAlert, view = 'list' }) {
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
    return (
      <>
        <NoResultsState onSuggested={onSuggested} appliedFilters={appliedFilters} nameFix={nameFix} onNameFix={onNameFix} />
        <AlertBand query={query} filters={appliedFilters} onAlert={onAlert} returnPath={sportsReturnPath(query, appliedFilters)} />
      </>
    );

  const capped = resultMeta?.capped;
  const visible = results.slice(0, shown);
  const remaining = results.length - visible.length;

  return (
    <div>
      {capped && (
        <p className="text-fine text-[var(--ink-400)] mb-4 leading-relaxed">
          Showing the first {results.length} matches. This is a broad search.
          Add more filters to narrow it down to the rarest cards.
        </p>
      )}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
          {visible.map((item, i) => <SportsResultCard key={item.id} item={item} formatPrice={formatPrice} index={i} view="grid" hasPendingFilters={hasPendingFilters} onPendingClick={onPendingClick} onCardClick={onCardClick} />)}
        </div>
      ) : (
        <div className="divide-y divide-[var(--line-soft)]">
          {visible.flatMap((item, i) => {
            const card = <SportsResultCard key={item.id} item={item} formatPrice={formatPrice} index={i} hasPendingFilters={hasPendingFilters} onPendingClick={onPendingClick} onCardClick={onCardClick} />;
            // Sign-up prompt for visitors who aren't signed in, after the 4th card.
            return i === 3 ? [card, <SignupPromptCard key="signup-prompt" />] : [card];
          })}
        </div>
      )}

      {remaining > 0 && (
        <div className="pt-8 flex flex-col items-center gap-3">
          <span className="text-fine" style={{ color: 'var(--ink-600)' }}>
            Showing {visible.length} of {results.length}
          </span>
          <button
            onClick={() => setShown((n) => n + PAGE_DISPLAY_SIZE)}
            className="text-fine px-6 py-3 rounded-full transition-opacity hover:opacity-90"
            style={{ border: '0.5px solid rgba(201,149,74,0.5)', color: 'var(--accent)' }}
          >
            Load {Math.min(PAGE_DISPLAY_SIZE, remaining)} more
          </button>
        </div>
      )}

      <AlertBand query={query} filters={appliedFilters} onAlert={onAlert} returnPath={sportsReturnPath(query, appliedFilters)} />
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
    auto: hasAutoText(title),
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

// Back to this exact search after sign-up: "/" (not the /share preview
// route) with the share params, so the search re-runs.
function sportsReturnPath(query, filters) {
  const qs = query ? buildShareParams(query, filters || {}, ALL_PRESET_PRINT_RUNS) : '';
  return qs ? `/?${qs}` : null;
}

function SportsResultCard({ item, formatPrice, index, hasPendingFilters, onPendingClick, onCardClick, view = 'list' }) {
  // Heuristic badge detection from title
  const title = (item.title || '').toLowerCase();
  const hasAuto = hasAutoText(item.title || '');
  const hasRookie = /\brookie/.test(title) || /\brc\b/.test(title) || /\b1st\s+bowman\b/.test(title);
  // Print run detection — strict, to match the server-side verifier.
  // Looks for real print run patterns, rejects years/dates/inventory counts.
  const printRun = detectPrintRun(item.title || '');
  const tier = printRun ? printRunTier(printRun) : null;
  const psaMatch = item.title?.match(/PSA\s*(\d{1,2})/i);
  const bgsMatch = item.title?.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i);
  const sgcMatch = item.title?.match(/SGC\s*(\d{1,2}(?:\.\d)?)/i);
  const cgcMatch = item.title?.match(/CGC\s*(\d{1,2}(?:\.\d)?)/i);

  return (
    <ResultCard
      item={item} formatPrice={formatPrice} index={index} view={view}
      hasPendingFilters={hasPendingFilters} onPendingClick={onPendingClick} onCardClick={onCardClick}
      payload={watchlistPayload(item)}
      badges={<>
        {/* Tier first, by name and how many were made: "Grail · 5 made". */}
        {printRun && <Badge tier={tier}>{tierChipLabel(tier, printRun)}</Badge>}
        {hasAuto && <Badge>Autograph</Badge>}
        {hasRookie && <Badge>Rookie</Badge>}
        {psaMatch && <Badge>PSA {psaMatch[1]}</Badge>}
        {bgsMatch && <Badge>BGS {bgsMatch[1]}</Badge>}
        {sgcMatch && <Badge>SGC {sgcMatch[1]}</Badge>}
        {cgcMatch && <Badge>CGC {cgcMatch[1]}</Badge>}
      </>}
    />
  );
}

function watchlistPayload(item) {
  return {
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
  };
}

/* ─────────────────────────────────────────────
   State components — empty, loading, no-results
   ───────────────────────────────────────────── */
function ResolveState({ onSuggested }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lede">Begin</span>
        <span className="font-mono text-fine text-[var(--ink-600)] tracking-wider">02</span>
      </div>
      <p className="font-display italic text-price text-[var(--ink-200)] leading-relaxed text-balance max-w-md">
        The marketplace awaits. Try a search above, or one of these.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-y-2 gap-x-6 max-w-md">
        {SUGGESTED_SEARCHES.map((s, i) => (
          <button
            key={s}
            onClick={() => onSuggested(s)}
            className="group flex items-center gap-2 text-left py-1 text-body text-[var(--ink-200)] hover:text-[var(--accent)] transition-colors"
          >
            <span className="font-mono text-fine text-[var(--ink-600)] group-hover:text-[var(--accent)] transition-colors">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="border-b border-transparent group-hover:border-[var(--accent)] pb-0.5">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card company filter — pick companies, then optionally narrow to their
   product lines. Matching happens on the listing title (lib/cardBrands.js).
   ───────────────────────────────────────────── */
const COMPANY_NOTES = {
  topps: 'Bowman is made by Topps.',
  panini: 'Prizm is made by Panini.',
  'upper-deck': 'Young Guns is made by Upper Deck.',
};

function CardCompanyFilter({ filters, setFilter }) {
  const brands = Array.isArray(filters.brands) ? filters.brands : [];
  const lines = Array.isArray(filters.brandLines) ? filters.brandLines : [];

  function toggleCompany(key) {
    if (brands.includes(key)) {
      const company = CARD_COMPANIES.find((c) => c.key === key);
      const own = new Set(company.lines.map((l) => l.key));
      setFilter('brands', brands.filter((k) => k !== key));
      setFilter('brandLines', lines.filter((k) => !own.has(k)));
    } else {
      setFilter('brands', [...brands, key]);
    }
  }
  function toggleLine(key) {
    setFilter('brandLines', lines.includes(key) ? lines.filter((k) => k !== key) : [...lines, key]);
  }
  function clearAll() {
    setFilter('brands', []);
    setFilter('brandLines', []);
  }

  const chip = (on) => ({
    minHeight: 40,
    padding: '0 14px',
    fontSize: 15,
    border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
    background: on ? 'var(--accent-bright)' : 'var(--bg-elev-2)',
    color: on ? 'var(--ink-on-accent)' : 'var(--ink-200)',
    fontWeight: on ? 600 : 400,
  });

  return (
    <div>
      <SectionLabel>Company</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={clearAll} aria-pressed={brands.length === 0} className="ff-pill inline-flex items-center rounded-full transition-colors" style={chip(brands.length === 0)}>
          Any
        </button>
        {CARD_COMPANIES.map((c) => {
          const on = brands.includes(c.key);
          return (
            <button key={c.key} type="button" onClick={() => toggleCompany(c.key)} aria-pressed={on} className="ff-pill inline-flex items-center rounded-full transition-colors" style={chip(on)}>
              {c.label}
            </button>
          );
        })}
      </div>

      {CARD_COMPANIES.filter((c) => brands.includes(c.key) && c.lines.length > 0).map((c) => (
        <div
          key={c.key}
          className="mt-4 rise"
          style={{ animationDuration: '0.4s', padding: '16px 18px', background: 'rgba(20,17,13,0.3)', borderLeft: '2px solid var(--accent-deep)' }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-fine font-medium" style={{ color: 'var(--accent)' }}>{c.label} lines</span>
            <span className="text-meta" style={{ color: 'var(--ink-600)' }}>Optional</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.lines.map((l) => {
              const on = lines.includes(l.key);
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => toggleLine(l.key)}
                  aria-pressed={on}
                  className="inline-flex items-center rounded-full transition-colors"
                  style={{
                    minHeight: 36,
                    padding: '0 13px',
                    fontSize: 13,
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    background: on ? 'rgba(201,149,74,0.10)' : 'var(--bg-elev-2)',
                    color: on ? 'var(--accent-bright)' : 'var(--ink-200)',
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
          {COMPANY_NOTES[c.key] && (
            <p className="text-meta mt-3 leading-snug" style={{ color: 'var(--ink-600)' }}>{COMPANY_NOTES[c.key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Active filter chips under the results heading, plus "Edit filters"
   (desktop: jumps to the sidebar; phone: opens the filter drawer).
   ───────────────────────────────────────────── */
function activeFilterChips(f) {
  const chips = [];
  if (f.numberedCards) {
    const runs = new Set([...(f.selectedPrintRuns || []), ...(f.customPrintRuns || [])]);
    const allPresets = ALL_PRESET_PRINT_RUNS.every((r) => runs.has(r)) && !(f.customPrintRuns || []).length;
    if (allPresets || runs.size === 0) {
      chips.push({ label: 'Numbered' });
    } else {
      PRINT_RUN_TIERS.forEach((t) => {
        if (t.runs.some((r) => runs.has(r))) chips.push({ label: `${t.label} · ${t.made}`, tier: t.key });
      });
      if ((f.customPrintRuns || []).length) chips.push({ label: f.customPrintRuns.join(' ') });
    }
  }
  if (f.autoCards) chips.push({ label: 'Auto' });
  if (f.rookieCards) chips.push({ label: 'Rookie' });
  if (f.condition === 'graded') chips.push({ label: 'Graded' });
  if (f.condition === 'raw') chips.push({ label: 'Raw' });
  if (f.listingType === 'buyItNow') chips.push({ label: 'Buy It Now' });
  if (f.listingType === 'auction') chips.push({ label: 'Auction' });
  brandFilterLabels(f.brands, f.brandLines).forEach((label) => chips.push({ label }));
  teamFilterLabels(f.teams).forEach((label) => chips.push({ label }));
  shippingLabels(f).forEach((c) => chips.push(c));
  const min = f.priceMin || 0;
  const max = f.priceMax ?? PRICE_NO_MAX;
  if (min > 0 || !isPriceNoMax(max)) chips.push({ label: priceRangeLabel(min, max === 5000 ? PRICE_NO_MAX : max) });
  return chips;
}

/* "949 for sale · rarest first" under the searched name (a whole-team
   search says which league's team it is). */
function resultsSummary(n, query, sortBy) {
  const team = teamFromQuery(query);
  const sort = (SPORTS_SORT_OPTIONS.find(([v]) => v === sortBy)?.[1] || '').toLowerCase();
  return [`${n.toLocaleString('en-US')} for sale`, team && `${team.league} team`, sort].filter(Boolean).join(' · ');
}

/* The results controls in one row: Filters (with how many are on), Sort,
   Get alerts, Share, and List / Grid. */
function ResultsToolbar({ activeCount, onFilters, sortBy, onSort, onAlerts, share, view, onView }) {
  const pill = 'inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-body font-medium whitespace-nowrap transition-colors hover:border-[var(--accent-deep)]';
  const pillStyle = { border: '1px solid var(--line)', background: 'var(--bg-elev)', color: 'var(--ink-200)' };
  const icon = 'w-4 h-4 flex-none';
  return (
    <div className="sticky top-0 lg:static z-30 -mx-6 px-6 lg:mx-0 lg:px-0 py-3 mt-3 mb-4 lg:mb-6 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]"
         style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--line-soft)' }}>
      <button type="button" onClick={onFilters} className={pill} style={pillStyle}>
        <SlidersHorizontal className={icon} strokeWidth={1.8} aria-hidden="true" />Filters
        {activeCount > 0 && (
          <span className="inline-grid place-items-center min-w-[20px] h-5 px-1.5 rounded-full text-fine font-semibold" style={{ background: 'var(--accent-bright)', color: 'var(--ink-on-accent)' }}>{activeCount}</span>
        )}
      </button>
      <label className={`${pill} relative cursor-pointer`} style={pillStyle}>
        <span className="sr-only">Sort</span>
        <span aria-hidden="true" className="hidden sm:inline">Sort:</span>
        <span aria-hidden="true">{SPORTS_SORT_OPTIONS.find(([v]) => v === sortBy)?.[1] || 'Rarest first'}</span>
        <ChevronDown className={icon} strokeWidth={1.8} aria-hidden="true" />
        <select value={sortBy} onChange={(e) => onSort(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Sort">
          {SPORTS_SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {/* Phones: Filters, Sort and a bell for alerts on this search (signed-in
          members save it here; the header's Get alerts is for visitors). */}
      <button type="button" onClick={onAlerts} aria-label="Get alerts for this search" className={`${pill} max-sm:px-2.5`} style={pillStyle}>
        <Bell className={icon} strokeWidth={1.8} aria-hidden="true" /><span className="hidden sm:inline">Get alerts</span>
      </button>
      <span className="hidden sm:contents">{share}</span>
      <div className="ml-auto hidden sm:inline-flex flex-none p-[3px] rounded-full" role="group" aria-label="Show as" style={{ border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
        {[['list', 'List', List], ['grid', 'Grid', LayoutGrid]].map(([v, l, Icon]) => (
          <button key={v} type="button" onClick={() => onView(v)} aria-pressed={view === v}
                  className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full text-meta font-medium"
                  style={view === v ? { background: 'var(--bg-elev-2)', color: 'var(--ink-100)', boxShadow: 'inset 0 0 0 1px var(--line)' } : { color: 'var(--ink-400)' }}>
            <Icon className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /><span className="hidden sm:inline">{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveFilterChips({ filters, onEdit, query = '' }) {
  // A whole-team search shows which league's team it is first.
  const team = teamFromQuery(query);
  const chips = [...(team ? [{ label: `${team.league} team` }] : []), ...activeFilterChips(filters)];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className="inline-flex items-center rounded-full text-fine"
          style={{ minHeight: 26, padding: '0 10px', ...(c.tier ? tierChipStyle(c.tier) : OUTLINE_CHIP_STYLE) }}
        >
          {c.label}
        </span>
      ))}
      {chips.length === 0 && (
        <span className="text-meta" style={{ color: 'var(--ink-400)' }}>All cards</span>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="text-meta px-1 transition-colors hover:text-[var(--accent-bright)]"
        style={{ minHeight: 32, color: 'var(--ink-200)', borderBottom: '0.5px solid var(--accent-deep)' }}
      >
        Edit filters
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Team filter — pick a league, then the team. College adds a conference
   step. Teams that appear in the current results come first with a count;
   the rest are behind "+ N more". Title matching: lib/teams.js and, by
   player, lib/playerTeams.js (server).
   ───────────────────────────────────────────── */
// Current results, so filter UIs can count what's in them.
const ResultsContext = createContext([]);
const TEAMS_SHOWN = 8;

function TeamFilter({ filters, setFilter }) {
  const results = useContext(ResultsContext);
  const selected = Array.isArray(filters.teams) ? filters.teams : [];
  const firstTeam = selected.length ? getTeam(selected[0]) : null;
  const [league, setLeague] = useState(firstTeam?.league || null);
  const [conference, setConference] = useState(firstTeam?.conference || null);
  const [showAll, setShowAll] = useState(false);

  // How many current listings mention each team in the open league.
  const counts = useMemo(() => {
    const m = new Map();
    if (!league || !results?.length) return m;
    for (const t of TEAMS) {
      if (t.league !== league) continue;
      // item.teams: teams found through the players a title names (server).
      const n = results.reduce((acc, it) => acc + (titleMatchesTeam(t, it.title) || it.teams?.includes(t.key) ? 1 : 0), 0);
      if (n) m.set(t.key, n);
    }
    return m;
  }, [league, results]);

  const conferences = useMemo(
    () => [...new Set(TEAMS.filter((t) => t.league === 'College').map((t) => t.conference))].sort(),
    [],
  );
  const pool = TEAMS.filter((t) => t.league === league && (league !== 'College' || !conference || t.conference === conference));
  // Selected first, then teams in the results (most first), then A–Z.
  const ordered = [...pool].sort((a, b) =>
    (selected.includes(b.key) - selected.includes(a.key))
    || ((counts.get(b.key) || 0) - (counts.get(a.key) || 0))
    || a.short.localeCompare(b.short));
  const visibleTeams = showAll ? ordered : ordered.slice(0, TEAMS_SHOWN);
  const hidden = ordered.length - visibleTeams.length;

  function pickLeague(next) {
    setShowAll(false);
    setConference(null);
    if (next === null) { setLeague(null); setFilter('teams', []); return; }
    setLeague(next);
  }
  function toggleTeam(key) {
    setFilter('teams', selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  const chip = (on) => ({
    minHeight: 40,
    padding: '0 14px',
    fontSize: 15,
    border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
    background: on ? 'var(--accent-bright)' : 'var(--bg-elev-2)',
    color: on ? 'var(--ink-on-accent)' : 'var(--ink-200)',
    fontWeight: on ? 600 : 400,
  });
  const subChip = (on, dashed = false) => ({
    minHeight: 36,
    padding: '0 13px',
    fontSize: 13,
    border: `1px ${dashed ? 'dashed' : 'solid'} ${on ? 'var(--accent)' : 'var(--line)'}`,
    background: on ? 'rgba(201,149,74,0.10)' : 'var(--bg-elev-2)',
    color: on ? 'var(--accent-bright)' : dashed ? 'var(--ink-400)' : 'var(--ink-200)',
  });
  const subLabel = (text, hint) => (
    <div className="flex items-baseline justify-between mb-3">
      <span className="text-fine font-medium" style={{ color: 'var(--accent)' }}>{text}</span>
      {hint && <span className="text-fine" style={{ color: 'var(--ink-600)' }}>{hint}</span>}
    </div>
  );

  return (
    <div>
      <SectionLabel>League</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => pickLeague(null)} aria-pressed={!league && !selected.length} className="ff-pill inline-flex items-center rounded-full transition-colors" style={chip(!league && !selected.length)}>
          Any
        </button>
        {TEAM_LEAGUES.map((l) => (
          <button key={l} type="button" onClick={() => pickLeague(l)} aria-pressed={league === l} className="ff-pill inline-flex items-center rounded-full transition-colors" style={chip(league === l)}>
            {l}
          </button>
        ))}
      </div>

      {league && (
        <div className="mt-4 rise" style={{ animationDuration: '0.4s', padding: '16px 18px', background: 'rgba(20,17,13,0.3)', borderLeft: '2px solid var(--accent-deep)' }}>
          {league === 'College' && (
            <div className="mb-4">
              {subLabel('Conference')}
              <div className="flex flex-wrap gap-2">
                {conferences.map((c) => (
                  <button key={c} type="button" onClick={() => { setConference(conference === c ? null : c); setShowAll(false); }} aria-pressed={conference === c} className="inline-flex items-center rounded-full transition-colors" style={subChip(conference === c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(league !== 'College' || conference) && (
            <>
              {subLabel(league === 'College' ? `${conference} schools` : `${league} teams`, counts.size ? 'In your results first' : null)}
              <div className="flex flex-wrap gap-2">
                {visibleTeams.map((t) => {
                  const on = selected.includes(t.key);
                  const n = counts.get(t.key);
                  return (
                    <button key={t.key} type="button" onClick={() => toggleTeam(t.key)} aria-pressed={on} title={t.label} className="inline-flex items-center gap-1.5 rounded-full transition-colors" style={subChip(on)}>
                      {t.short}
                      {n ? <span className="text-fine" style={{ color: on ? 'var(--accent-bright)' : 'var(--ink-600)' }}>{n}</span> : null}
                    </button>
                  );
                })}
                {hidden > 0 && (
                  <button type="button" onClick={() => setShowAll(true)} className="inline-flex items-center rounded-full transition-colors" style={subChip(false, true)}>
                    + {hidden} more
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
