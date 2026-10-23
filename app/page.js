'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense, Fragment, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

/* Upscale eBay thumbnail URLs from the small default (~225px) to a sharper 640px
   version. eBay encodes the size as `s-l\d+` in the filename; we just swap it.
   Safe no-op for non-eBay URLs or missing/empty inputs. */
function upscaleEbayImage(url) {
  if (!url) return url;
  return url.replace(/\/s-l\d+\.(\w+)/, '/s-l640.$1');
}
import { ArrowRight, ArrowUpRight, ArrowUp, Star, Check, X, Crosshair, ArrowLeft, ImageOff, Search, Clock, Bell, TrendingDown, Hourglass, ListFilter } from 'lucide-react';
import SaveSearchModal from './components/SaveSearchModal';
import BidCountdown from './components/BidCountdown';
import CardModal from './components/CardModal';
import { tierForRun, tierChipStyle, tierRowStyle, OUTLINE_CHIP_STYLE } from './components/rarityUtils';
import ShareSearchButton from './components/ShareSearchButton';
import { isReturningVisitor, markVisited, getRecentSearches, addRecentSearch } from '../lib/visitState';
import { hasShareParams, parseShareParams, buildShareParams } from '../lib/shareLink';
import { track } from '../lib/track';
import { CARD_COMPANIES, brandFilterLabels } from '../lib/cardBrands';
import { TEAMS, TEAM_LEAGUES, suggestTeams, teamFromQuery, teamFilterLabels, titleMatchesTeam, getTeam } from '../lib/teams';
import { WatchlistContext, WatchlistProvider } from '../lib/watchlistContext';
import { useUser } from '../lib/useUser';
import { useRouter, useSearchParams } from 'next/navigation';
import { isNativeApp } from '../lib/native';

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
  priceMax: 1000,
  sortBy: 'printrun-rarest',
  brands: [],           // card companies, e.g. ['topps'] — lib/cardBrands.js
  brandLines: [],       // optional product lines within them, e.g. ['bowman-chrome']
  teams: [],            // Team filter, e.g. ['nba-dal'] — lib/teams.js
};

// Saved searches and share links written before numbered-by-default meant
// "numbered off" when the key was missing, so they decode against this.
const LEGACY_BASE_FILTERS = { ...DEFAULT_FILTERS, numberedCards: false };

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

const SEALED_PRODUCT = /\bsealed\s+(?:\w+\s+){0,2}(?:pack|packs|box|boxes|case|blaster|hanger|mega)\b|\b(?:mystery|repack|re-pack)\b|\bhobby\s+box\b/;
// "1/1 possible", "chance at a 1/1", "1/1 hit": a chase, not this card's run.
// Only words right next to the 1/1 count, so "Case hit SuperFractor 1/1" stays a 1/1.
function chaseAround(t, index) {
  const before = t.slice(Math.max(0, index - 14), index + 1);
  const after = t.slice(index, index + 22);
  return /\b(possible|chance|chances|look\s+for|odds)\b/.test(before)
    || /1\s*\/\s*1\W*(possible|chance|chances|hits?|odds)\b/.test(after);
}

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
  // Sealed packs, boxes and repacks aren't one card: "1/1 possible" there
  // is a chase, not this card's print run.
  if (SEALED_PRODUCT.test(t)) return null;

  // Find all candidate print-run patterns
  const candidates = [];
  const reSlash = /(?:^|[^0-9a-z])\/\s*(\d{1,4})\b/g;       // "/N" not preceded by digit/letter
  const reHash = /#\s*\d+\s*\/\s*(\d{1,4})\b/g;              // "#5/25"
  // "N/M" — bare format like "2/10", "5/25". Captures BOTH numbers so we can
  // verify N < M (real print run) and not return inventory like "12/12".
  const reBare = /(?:^|[^0-9a-z])(?!0)(\d{1,4})\s*\/\s*(\d{1,4})\b/g;
  const reOf = /\b\d+\s+of\s+(\d{1,4})\b/g;
  const reTo = /\b(?:numbered|limited|serial)\s+to\s+(\d{1,4})\b/g;
  // Not when a slash follows: "SSP 11/25" is serial 11 of 25, not a /11.
  const reNumbered = /\b(?:numbered|limited|serial|ssp|sp)\s+(\d{1,4})\b(?!\s*\/)/g;

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
    // N === M is the last copy ("25/25"); rank it behind the clearer forms.
    if (firstNum < secondNum || isOneOfOne) {
      candidates.push({ value: m[2], index: m.index, firstNum, rank: isOneOfOne ? 2 : 0 });
    } else if (firstNum === secondNum) {
      candidates.push({ value: m[2], index: m.index, firstNum, rank: 1 });
    }
  }

  if (candidates.length === 0) return null;
  // A "1/1" phrase ("eBay 1/1 color match") loses to any real serial.
  candidates.sort((a, b) => (a.rank || 0) - (b.rank || 0));

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
    if (c.value === "1" && chaseAround(t, c.index)) continue;
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
    if (searchParams?.get('savedSearch') || searchParams?.get('editSearch') || searchParams?.get('q')) {
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
      'brands', 'brandLines', 'teams',
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
        const restored = { ...LEGACY_BASE_FILTERS, ...(search.filters || {}) };
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

    const { query: sharedQuery, filters: sharedFilters } =
      parseShareParams(searchParams, LEGACY_BASE_FILTERS, ALL_PRESET_PRINT_RUNS);
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
    () => (playerSuggest ? playerSuggest.tidyRecentSearches(recentSearches, 5) : recentSearches.slice(0, 5)),
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
      if (hasGrail) chips.push({ label: 'Grail · /1–25', tier: 'grail' });
      if (hasUltra) chips.push({ label: 'Ultra · /26–99', tier: 'ultra' });
      if (hasRare) chips.push({ label: 'Rare · /100–249', tier: 'rare' });
      if (hasScarce) chips.push({ label: 'Scarce · /250–999', tier: 'scarce' });
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

    const min = filters.priceMin || 0;
    const max = filters.priceMax ?? 1000;
    if (min > 0 || max < 1000) {
      chips.push({ label: `$${min}–$${max}`, tier: 'neutral' });
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
          priceMax: f.priceMax === 5000 ? null : f.priceMax,
          sortBy: f.sortBy,
          brands: f.brands || [],
          brandLines: f.brandLines || [],
          teams: f.teams || [],
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
                  text: 'Searching is free, including the watchlist. Free accounts include 1 live email alert. Up to 5 alerts and bid reminders require the Base plan at $6.99 CAD per month ($59 CAD per year), with a 14-day free trial. A Premium tier is planned but not yet available.',
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
              {/* Quiet typo hint. With zero results, NoResultsState shows it
                  as a button instead, so it's hidden here. */}
              {nameFix && !loading && sortedResults.length > 0 && dismissedFix !== query && (
                <DidYouMeanLine
                  fix={nameFix.query}
                  onPick={() => searchFix(nameFix.query)}
                  onDismiss={() => setDismissedFix(query)}
                />
              )}
              {/* What this result set was filtered by, one tap from changing it. */}
              <ActiveFilterChips
                query={query}
                filters={appliedFilters || filters}
                onEdit={() => {
                  if (isDesktopViewport) {
                    sidebarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    sidebarRef.current?.querySelector('button')?.focus({ preventScroll: true });
                  } else {
                    setMobileFiltersOpen(true);
                  }
                }}
              />
              <p className="text-[13px] mt-3" style={{ color: 'var(--ink-400)' }}>
                <span style={{ color: 'var(--gold)' }}>{sortedResults.length}</span>{' '}
                {sortedResults.length === 1 ? 'listing' : 'listings'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {/* Share the current criteria as a link that reproduces this
                  exact search for whoever receives it. */}
              <ShareSearchButton
                query={query}
                filters={filters}
                allPresetRuns={ALL_PRESET_PRINT_RUNS}
              />
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
            <div ref={sidebarRef} className="hidden lg:block scroll-mt-6">
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
              nameFix={nameFix?.query || null}
              onNameFix={searchFix}
              query={query}
              onAlert={handleOpenSave}
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
        </ResultsContext.Provider>
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
            Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors
          </div>
          <div
            ref={subRef}
            className="mt-4 text-[11px] tracking-[0.32em] uppercase text-[var(--gold)] rise"
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
  // Player-name dropdown under the search field. Picking fills the field.
  const suggest = useSuggestBox(query, (v) => setQuery(v));
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
            The <em className="text-[var(--gold-bright)]">Grail</em> Hunter.
            <span className="sr-only"> Search eBay for rare numbered sports cards, rarest first.</span>
          </h1>
          <p
            className="mt-5 md:mt-7 font-display italic text-[20px] md:text-[22px] leading-none rise"
            style={{ color: 'var(--gold-bright)', animationDelay: '300ms' }}
          >
            Just try it.
          </p>

          {/* Search — a solid gold-edged field with a labelled gold button. */}
          <div className="mt-3 rise" style={{ animationDelay: '380ms' }}>
            <div
              ref={suggest.anchorRef}
              className="relative flex items-center rounded-xl transition-colors focus-within:border-[var(--gold)]"
              style={{
                border: '0.5px solid var(--gold-deep)',
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
                className="relative w-full pl-5 pr-[128px] py-4 md:py-5 bg-transparent border-0 text-xl md:text-2xl font-display text-[var(--ink-100)] focus:outline-none"
              />
              {!query && !loading && <RotatingPlaceholder align="left" padRight="128px" />}
              <button
                onClick={onSearch}
                disabled={loading}
                className="absolute right-2 h-11 px-4 rounded-lg flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-40 z-10"
                style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}
              >
                Show cards
                <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {suggest.dropdown}
            {error && <p className="mt-3 text-[13px] text-[var(--crit)]">{error}</p>}

            <p className="mt-2 text-[11px]" style={{ color: 'var(--ink-600)' }}>Not affiliated with eBay</p>
          </div>

          {/* Returning visitors get their own searches back; everyone else
              gets ready-made hunts that land straight on results. */}
          <div className="mt-7 rise" style={{ animationDelay: '460ms' }}>
            <div
              className="text-[10px] uppercase tracking-[0.24em] mb-3 font-mono"
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
                    className="text-[13px] px-4 py-2 rounded-full transition-colors disabled:opacity-40 hover:border-[var(--gold-deep)] hover:text-[var(--gold-bright)]"
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
                    className="group inline-flex items-center gap-2 text-[13px] pl-4 pr-2 py-1.5 rounded-full transition-colors disabled:opacity-40 hover:border-[var(--gold-deep)]"
                    style={{ border: '0.5px solid var(--line)', background: 'var(--bg-elev)', color: 'var(--ink-200)', minHeight: 36 }}
                  >
                    <span className="group-hover:text-[var(--gold-bright)] transition-colors">{h.text}</span>
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
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5 text-[var(--gold)]" strokeWidth={1.6} aria-hidden="true" /> My hunts
              </Link>
              <Link
                href="/watchlist-cards"
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-[var(--gold)]" strokeWidth={1.6} aria-hidden="true" /> Watchlist
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
              One search. <em className="text-[var(--gold-bright)]">Rarest first.</em>
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
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-400)] hover:text-[var(--gold-bright)] transition-colors"
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
                <span className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--ink-400)' }}>{it.title}</span>
              )}
              {it.price != null && (
                <span className="font-display text-[17px] leading-none text-[var(--gold-bright)]">{fmt(it.price)}</span>
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
        className={`block font-display italic text-[var(--ink-600)] rotate-placeholder ${align === 'left' ? 'text-xl md:text-2xl truncate' : 'text-2xl md:text-3xl text-center'}`}
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
              className={`flex items-center gap-3 py-4 md:py-5 md:px-5 text-[16px] font-medium ${i ? 'border-t md:border-t-0 md:border-l' : ''}`}
              style={{ borderColor: 'var(--line-soft)', color: 'var(--ink-100)' }}
            >
              <Icon className="w-[22px] h-[22px] flex-none" strokeWidth={1.75} style={{ color: 'var(--gold-bright)' }} aria-hidden="true" />
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
      className="font-mono text-[11px] px-1.5 py-[2px] rounded flex-none"
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
        ? { background: 'var(--bg-elev)', border: '1px solid var(--gold-bright)' }
        : { border: '1px solid var(--line)', opacity: muted ? 0.8 : 1 }}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-medium" style={{ color: featured ? 'var(--gold)' : 'var(--ink-400)' }}>{name}</div>
        <div className="font-display italic leading-none text-[28px] md:text-[34px] mt-1" style={{ color: muted ? 'var(--ink-400)' : 'var(--ink-100)' }}>
          {price}{unit && <small className="not-italic font-sans text-[13px] ml-1" style={{ color: 'var(--ink-400)' }}>{unit}</small>}
        </div>
        <div className="text-[14px] mt-1.5" style={{ color: 'var(--ink-200)' }}>{line}</div>
      </div>
      <Link
        href={ctaHref}
        className={`flex-none text-center rounded-lg text-[12px] tracking-[0.12em] uppercase font-semibold no-underline whitespace-nowrap ${featured ? 'mt-3 py-3' : 'px-3.5 py-2.5 md:mt-3 md:py-3'}`}
        style={featured
          ? { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }
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
        <p className="text-center text-[12px] mt-5" style={{ color: 'var(--ink-600)' }}>
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
    <section className="max-w-[1040px] mx-auto px-5 md:px-6 lg:px-10 pt-8 md:pt-12 pb-16">
      <form
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
        className="flex items-center gap-2.5 rounded-xl pl-4 pr-1.5 py-1.5"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--gold-deep)' }}
      >
        <Search className="w-[18px] h-[18px] flex-none" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a player or team"
          aria-label="Search a player or team"
          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] py-2.5"
          style={{ color: 'var(--ink-100)' }}
        />
        <button type="submit" aria-label="Search" className="w-11 h-11 rounded-lg grid place-items-center flex-none" style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
          <ArrowRight className="w-5 h-5" strokeWidth={2} />
        </button>
      </form>
      {error && <p className="text-[13px] mt-2" style={{ color: 'var(--crit)' }}>{error}</p>}

      {(saved.length > 0 || recents.length > 0) && (
        <div className="flex gap-2 mt-3 overflow-x-auto md:flex-wrap pb-1 -mx-1 px-1">
          {saved.map((s) => (
            <a key={s.id} href={`/?savedSearch=${s.id}`} className="flex-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap"
               style={{ color: 'var(--ink-200)', border: '1px solid var(--gold-deep)' }}>
              <Crosshair className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: 'var(--gold)' }} aria-hidden="true" />{s.name}
            </a>
          ))}
          {recents.map((r) => (
            <button key={r} type="button" onClick={() => onSuggested(r)} className="flex-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap"
                    style={{ color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
              <Clock className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />{r}
            </button>
          ))}
        </div>
      )}

      <SinceLastVisit home={home} hasSaved={saved.length > 0} />
      <LiveRightNow onCardClick={onCardClick} />

      {!native && home && home.tier === 'free' && (
        <div className="flex items-center justify-between gap-3 mt-8 rounded-xl px-4 py-3 text-[14px]" style={{ border: '1px solid var(--line)', color: 'var(--ink-200)' }}>
          <span>You have 1 alert on the free plan.</span>
          <Link href="/subscribe" className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--gold-bright)' }}>
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
    <div className="flex items-baseline justify-between mt-9 mb-3">
      <h2 className="font-display italic text-[22px]">Since you were last here</h2>
      {home?.since && <span className="text-[13px]" style={{ color: 'var(--ink-400)' }}>{sinceLabel(home.since)}</span>}
    </div>
  );
  if (!home) return <>{Head}<div className="h-[120px] rounded-xl shimmer" style={{ background: 'var(--bg-elev)' }} /></>;
  if (nothing) {
    return (
      <>{Head}
        <div className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--ink-200)' }}>
            <Bell className="w-4 h-4" strokeWidth={1.75} style={{ color: 'var(--gold)' }} aria-hidden="true" />Nothing new yet
          </div>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--ink-600)' }}>
            {hasSaved ? 'New matches, price drops and ending auctions will show up here.' : 'Save a search or star a card and changes will show up here.'}
          </p>
        </div>
      </>
    );
  }
  const Panel = ({ icon: Icon, title, children }) => (
    <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2 text-[14px] font-medium mb-1" style={{ color: 'var(--ink-100)' }}>
        <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: 'var(--gold)' }} aria-hidden="true" />{title}
      </div>
      {children}
    </div>
  );
  const Row = ({ href, image, title, meta, right, rightSub, rightTone }) => (
    <a href={href} className="grid grid-cols-[38px_1fr_auto] gap-2.5 items-center py-2" style={{ borderTop: '1px solid var(--line-soft)' }}>
      <span className="w-[38px] aspect-[3/4] rounded-[3px] overflow-hidden flex-none" style={{ background: 'var(--bg-elev-2)' }}>
        {image && <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-snug line-clamp-2" style={{ color: 'var(--ink-200)' }}>{title}</span>
        {meta && <span className="block text-[12px] mt-0.5" style={{ color: 'var(--ink-400)' }}>{meta}</span>}
      </span>
      <span className="text-right whitespace-nowrap">
        <span className="block text-[14px] font-medium" style={{ color: rightTone || 'var(--ink-100)' }}>{right}</span>
        {rightSub && <span className="block text-[12px]" style={{ color: 'var(--ink-400)' }}>{rightSub}</span>}
      </span>
    </a>
  );
  const money = (v) => (v != null ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '');
  return (
    <>{Head}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {matches.length > 0 && (
          <Panel icon={Bell} title={`${matches.reduce((n, m) => n + m.count, 0)} new matches`}>
            {matches.map((m) => (
              <a key={m.id} href={`/?savedSearch=${m.id}`} className="flex items-center justify-between gap-3 py-2 text-[13px]" style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--ink-200)' }}>
                <span className="truncate">{m.name}</span>
                <span className="whitespace-nowrap" style={{ color: 'var(--gold-bright)' }}>{m.count} new</span>
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

function LiveRightNow({ onCardClick }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/featured').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!cancelled) setItems(d?.items || (d?.featured ? [d.featured] : []));
    }).catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);
  if (items && items.length === 0) return null;
  return (
    <>
      <div className="flex items-baseline justify-between mt-9 mb-3">
        <h2 className="font-display italic text-[22px]">Live right now</h2>
        <span className="text-[13px]" style={{ color: 'var(--ink-400)' }}>Updated hourly</span>
      </div>
      <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {(items || Array.from({ length: 5 }, () => null)).map((it, i) => (
          <button key={it?.id || i} type="button" disabled={!it} onClick={() => it && onCardClick?.(it)}
                  className="w-[124px] md:w-auto flex-none text-left rounded-lg p-2" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line-soft)' }}>
            <span className="block aspect-[3/4] rounded overflow-hidden mb-2" style={{ background: 'var(--bg-elev-2)' }}>
              {it?.image && <img src={upscaleEbayImage(it.image)} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </span>
            <span className="block text-[12px] leading-snug h-[32px] overflow-hidden" style={{ color: 'var(--ink-200)' }}>
              {it?.printRun && <TierChip run={`/${it.printRun}`} />} {it?.title || ''}
            </span>
            <span className="block text-[14px] font-medium mt-1.5">{it ? featuredPrice(it) : ''}</span>
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
      <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink-400)' }}>
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
              <span className="ml-2 font-display text-[22px] leading-none text-[var(--gold-bright)]">{price}</span>
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
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink-400)' }}>
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
          <div className="text-[13px] leading-snug line-clamp-2" style={{ color: 'var(--ink-200)' }}>
            {item ? item.title : ' '}
          </div>
        </div>
        {price && (
          <span className="flex-none font-display text-[20px] leading-none text-[var(--gold-bright)]">{price}</span>
        )}
      </button>
    </>
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
  // Picking a suggested name runs that search straight away.
  const suggest = useSuggestBox(pending, (v) => { setPending(v); setEditing(false); onSubmit(v); });

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
      <div ref={suggest.anchorRef}>
      <input
        ref={inputRef}
        type="text"
        value={pending}
        onChange={(e) => { setPending(e.target.value); suggest.openBox(); }}
        onKeyDown={(e) => {
          if (suggest.handleKey(e)) return;
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        {...suggest.inputProps}
        onBlur={() => { suggest.close(); commit(); }}
        className="font-display italic w-full bg-transparent border-0 border-b outline-none p-0 m-0"
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 3.6rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: 'var(--gold-bright)',
          borderBottomColor: 'var(--gold)',
        }}
      />
      {suggest.dropdown}
      </div>
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
                        <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--ink-600)]">{tier.range.replace('–', ' – ')}</span>
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
                              color: sel ? 'var(--ink-on-gold)' : 'var(--ink-200)',
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

      {/* Card company — optional, off by default (title match on the server) */}
      <CardCompanyFilter filters={filters} setFilter={setFilter} />

      <SectionDivider />

      {/* Team — league first, then team (College: conference, then school) */}
      <TeamFilter filters={filters} setFilter={setFilter} />

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
        <span className="text-[var(--ink-600)] mx-2">–</span>
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
          background: checked ? 'var(--gold-bright)' : 'rgba(255,255,255,0.10)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform"
          style={{
            background: checked ? 'var(--ink-on-gold)' : '#6a6356',
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
              className="px-3.5 py-2.5 text-[13px] tracking-[0.04em] text-left transition-all border"
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
            className={`flex-1 px-3 py-3 text-[13px] tracking-[0.06em] transition-colors text-center ${
              idx !== options.length - 1 ? 'border-r border-[var(--line-soft)]' : ''
            }`}
            style={
              active
                ? {
                    background: 'var(--gold-bright)',
                    color: 'var(--ink-on-gold)',
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
            <>Refine</>
          )}
        </p>
        <button
          onClick={onCancel}
          className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
        >
          {isEditing ? 'Cancel' : <><ArrowLeft className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />Back</>}
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
            background: 'var(--gold-bright)',
            color: 'var(--ink-on-gold)',
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
            background: 'var(--gold-bright)',
            color: 'var(--ink-on-gold)',
          }}
        >
          Search <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
        </button>
        {hasPending && (
          <p className="text-[11px] text-[var(--gold)] italic text-center mt-3 leading-tight">
            Filters changed. Press Search to update.
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
  if (f.brands?.length) n++;
  if (f.teams?.length) n++;
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
            style={{ minWidth: 18, height: 18, padding: '0 5px', background: 'var(--gold)', color: 'var(--ink-on-gold)', letterSpacing: 0 }}
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
            <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
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
            borderRadius: 12,
            background: 'var(--gold-bright)',
            color: 'var(--ink-on-gold)',
          }}
        >
          Search <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
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
    ['price-low', 'Price: low to high'],
    ['price-high', 'Price: high to low'],
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
              {sel && <span style={{ color: 'var(--gold-bright)' }}><Check className="inline-block w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" /></span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] italic mt-3 leading-relaxed" style={{ color: 'var(--ink-600)' }}>
        Sort is instant. It reorders the cards you already have without a new search.
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
    ['price-low', 'Price: low to high'],
    ['price-high', 'Price: high to low'],
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
                className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-600)] hover:text-[var(--gold)] transition-colors"
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
                    <span className="font-mono text-[11px] tracking-wider opacity-80">
                      {tier.range}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom print run section */}
            <div className="mt-5 pt-4 border-t border-[var(--line-soft)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-600)] mb-2">
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
      <span className="font-mono text-[11px] text-[var(--ink-600)] tracking-wider">{number}</span>
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
              className="inline-flex items-center gap-1 px-2 py-1 font-mono text-[11px] text-[var(--gold)] bg-[var(--gold)]/[0.08] border border-[var(--gold-deep)] hover:bg-[var(--gold)]/[0.14] transition-colors"
              title="Click to remove"
            >
              {run}
              <span className="text-[var(--ink-400)] leading-none"><X className="w-3 h-3" strokeWidth={2} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      )}

      {err && <p className="text-[11px] text-[var(--crit)] mt-1.5">{err}</p>}
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
        className={`relative w-full max-w-[400px] rounded-lg p-7 text-center ${floating ? 'pointer-events-auto' : ''}`}
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
            <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
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
            className="w-full min-h-[48px] rounded-lg text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{
              background: 'var(--gold-bright)',
              color: 'var(--ink-on-gold)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Search <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" />
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

function Results({ loading, hasSearched, results, error, formatPrice, scanPhrase, onSuggested, appliedFilters, resultMeta, hasPendingFilters, onPendingClick, onCardClick, nameFix = null, onNameFix, query = '', onAlert }) {
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
        <AlertBand query={query} filters={appliedFilters} onAlert={onAlert} />
      </>
    );

  const capped = resultMeta?.capped;
  const visible = results.slice(0, shown);
  const remaining = results.length - visible.length;

  return (
    <div>
      {capped && (
        <p className="text-[12px] text-[var(--ink-400)] mb-4 leading-relaxed">
          Showing the first {results.length} matches. This is a broad search.
          Narrow it with filters like print run, auto, or condition to surface the
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
          <span className="text-[12px]" style={{ color: 'var(--ink-600)' }}>
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

      <AlertBand query={query} filters={appliedFilters} onAlert={onAlert} />
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
  const ctx = useContext(WatchlistContext);
  const [busy, setBusy] = useState(false);

  const saved = ctx ? ctx.isSaved(item.id) : false;
  const [promptOpen, setPromptOpen] = useState(false);
  usePendingStarSave();

  async function saveNow() {
    ctx?.markSaved(item.id);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watchlistPayload(item)),
      });
      if (!res.ok) throw new Error(`Watchlist request failed (${res.status})`);
    } catch (err) {
      console.error('Watchlist save failed:', err?.message || err);
      ctx?.markUnsaved(item.id);
    }
  }

  async function toggle(e) {
    // Critical: stop the parent <a> from navigating to eBay.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    // Logged-out visitors get the "Keep this card" sign-up prompt.
    if (!user) {
      setPromptOpen(true);
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
      let res;
      if (saved) {
        res = await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      } else {
        res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(watchlistPayload(item)),
        });
      }
      // fetch() only rejects on NETWORK failure — a 401/500 resolves
      // normally, so without this check a server-side error left the star
      // filled while nothing was saved. Surface it instead.
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error || `Watchlist request failed (${res.status})`);
      }
    } catch (err) {
      // Revert optimistic update on failure
      console.error('Watchlist save failed:', err?.message || err);
      if (saved) ctx?.markSaved(item.id);
      else ctx?.markUnsaved(item.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
      <Star className="w-4 h-4" strokeWidth={1.6} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
    {promptOpen && (
      <KeepCardPrompt item={item} onClose={() => setPromptOpen(false)} onSaved={saveNow} />
    )}
    </>
  );
}

/* ── Keep-this-card + alert band (signed-out sign-up moments) ───────────
   Two places where a visitor actually wants an account: starring a card,
   and wanting to hear when a new match lists. Both send them through
   sign-up and back to the same search.

   Return trip: the results page doesn't keep the search in its URL, so the
   AlertBand (which knows the query and applied filters) records the current
   search here; WatchStar turns it into a share link to come back to. The
   starred card itself waits in localStorage (public eBay listing data only,
   nothing personal) and is saved once the visitor is signed in. */
let lastResultsSearch = null;

function resultsReturnPath(fallbackCardId) {
  if (lastResultsSearch?.query) {
    // Straight back to "/" (not the /share preview route) so the search re-runs.
    const qs = buildShareParams(lastResultsSearch.query, lastResultsSearch.filters || {}, ALL_PRESET_PRINT_RUNS);
    if (qs) return `/?${qs}`;
  }
  return fallbackCardId ? `/?card=${encodeURIComponent(fallbackCardId)}` : '/';
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

const PENDING_STAR_KEY = 'ffPendingStar';
const PENDING_STAR_TTL = 60 * 60 * 1000; // an hour is plenty for a sign-up round trip

function stashPendingStar(item) {
  try {
    localStorage.setItem(PENDING_STAR_KEY, JSON.stringify({ at: Date.now(), payload: watchlistPayload(item) }));
  } catch { /* storage blocked: they'll just star it again */ }
}

function takePendingStar() {
  try {
    const raw = localStorage.getItem(PENDING_STAR_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_STAR_KEY);
    const { at, payload } = JSON.parse(raw);
    if (!payload?.listing_id || Date.now() - at > PENDING_STAR_TTL) return null;
    return payload;
  } catch {
    return null;
  }
}

/* Once signed in, save the card they starred before signing up. Runs from
   Hero and every WatchStar; the module flag keeps it to one save. */
let pendingStarHandled = false;
function usePendingStarSave() {
  const { user } = useUser();
  const ctx = useContext(WatchlistContext);
  useEffect(() => {
    if (!user || pendingStarHandled) return;
    pendingStarHandled = true;
    const payload = takePendingStar();
    if (!payload) return;
    ctx?.markSaved(payload.listing_id);
    fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => { if (!res.ok) ctx?.markUnsaved(payload.listing_id); })
      .catch(() => ctx?.markUnsaved(payload.listing_id));
  }, [user, ctx]);
}

/* KeepCardPrompt — the sign-up ask when a signed-out visitor stars a card.
   Web: Apple + Google + email. iOS app: Google blocks sign-in inside app web
   views, so native Apple + email only; native Apple signs in without leaving
   the page, so the card is saved on the spot. */
function KeepCardPrompt({ item, onClose, onSaved }) {
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef(null);
  useEffect(() => {
    setNative(isNativeApp());
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const next = resultsReturnPath(item.id);
  const emailHref = `/signup?next=${encodeURIComponent(next)}&src=star`;

  async function continueWith(provider) {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const { createClient } = await import('../lib/supabaseClient');
      const supabase = createClient();
      if (native && provider === 'apple') {
        const { signInWithAppleNative } = await import('../lib/native');
        await signInWithAppleNative(supabase);
        track('signed_up', undefined, 'star'); // server only counts brand-new accounts
        await onSaved();
        onClose();
        return;
      }
      stashPendingStar(item);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&src=star` },
      });
      if (oauthError) throw oauthError;
    } catch (e) {
      // Closing Apple's sheet isn't an error worth showing.
      if (!/cancel/i.test(e?.message || '')) setError('Sign-in didn’t go through. Try again, or use email.');
      setBusy(false);
    }
  }

  const btn = 'w-full h-11 rounded-lg flex items-center justify-center gap-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keep-card-title"
        className="relative w-full max-w-[400px] rounded-xl p-6"
        style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--gold-deep)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[18px] text-[var(--ink-400)] hover:text-[var(--ink-100)]"
        >
          <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--gold)' }}>Free account</div>
        <h2 id="keep-card-title" className="font-display italic text-[26px] leading-tight mt-2">Keep this card</h2>
        {item.title && (
          <p className="mt-2 text-[13px] leading-snug line-clamp-2" style={{ color: 'var(--ink-200)' }}>{item.title}</p>
        )}
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-400)' }}>
          We’ll keep its price up to date and tell you if it sells. No credit card.
        </p>
        <div className="mt-5 grid gap-2">
          <button type="button" disabled={busy} onClick={() => continueWith('apple')} className={btn} style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
            Continue with Apple
          </button>
          {!native && (
            <button type="button" disabled={busy} onClick={() => continueWith('google')} className={btn} style={{ background: 'transparent', color: 'var(--ink-100)', border: '0.5px solid var(--ink-600)' }}>
              Continue with Google
            </button>
          )}
          <Link
            href={emailHref}
            onClick={() => stashPendingStar(item)}
            className={btn}
            style={{ background: 'transparent', color: 'var(--ink-200)', border: '0.5px solid var(--line)' }}
          >
            Use email instead
          </Link>
        </div>
        {error && <p className="mt-3 text-[13px] text-[var(--crit)]">{error}</p>}
        <p className="mt-4 text-[11px] text-center" style={{ color: 'var(--ink-600)' }}>
          Already have an account?{' '}
          <Link href="/login" onClick={() => stashPendingStar(item)} className="underline underline-offset-2 hover:text-[var(--gold-bright)]">Sign in</Link>
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* AlertBand — under results (or under "no results"): the moment the alert
   plan sells itself. Signed-in visitors open the save-search flow; signed-out
   ones go through sign-up and come back to this search. Hidden until the
   results call site passes the query. */
function AlertBand({ query, filters, onAlert }) {
  const { user } = useUser();
  useEffect(() => {
    if (query) lastResultsSearch = { query, filters };
  }, [query, filters]);
  if (!query) return null;

  const next = resultsReturnPath(null);
  const ctaClass = 'inline-flex items-center gap-2 h-11 px-5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90';
  const ctaStyle = { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' };
  return (
    <div
      className="mt-10 rounded-xl px-5 py-5 md:px-6 flex flex-wrap items-center justify-between gap-4"
      style={{ border: '0.5px solid var(--gold-deep)', background: 'linear-gradient(90deg, rgba(201,149,74,0.09), transparent)' }}
    >
      <div className="min-w-0 max-w-[520px]">
        <p className="font-display text-[20px] md:text-[22px] leading-snug">
          Get an email when a new <em className="text-[var(--gold-bright)]">{query}</em> card lists.
        </p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-400)' }}>
          We check eBay every hour with these filters. Your first alert is free.
        </p>
      </div>
      {user ? (
        <button type="button" onClick={onAlert} className={ctaClass} style={ctaStyle}>
          Turn on alert <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        </button>
      ) : (
        <Link href={`/signup?next=${encodeURIComponent(next)}&src=alert`} className={ctaClass} style={ctaStyle}>
          Turn on alert <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
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
  const tierStyle = tier ? tierRowStyle(tier) : null;

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
        ...tierStyle,
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
            <div className="w-full h-full flex items-center justify-center text-[var(--ink-600)] font-display text-3xl italic"><ImageOff className="w-7 h-7" strokeWidth={1.5} aria-hidden="true" /></div>
          )}
          {item.isAuction && (
            <span className="absolute top-1.5 left-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--gold)] bg-[var(--bg-base)]/85 px-1 py-0.5 border border-[var(--gold-deep)]/30">
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
                <ImageOff className="w-7 h-7" strokeWidth={1.5} aria-hidden="true" />
              </div>
            )}
            {item.isAuction && (
              <span className="absolute top-2 left-2 text-[10px] uppercase tracking-[0.18em] text-[var(--gold)] bg-[var(--bg-base)]/85 backdrop-blur-sm px-1.5 py-0.5 border border-[var(--gold-deep)]/30">
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
    className = 'text-[var(--ink-on-gold)] font-bold';
    inlineStyle = {
      borderColor: '#ffc14d',
      backgroundImage: 'linear-gradient(180deg, var(--gold-fill-top) 0%, var(--gold-fill-bottom) 100%)',
    };
  } else if (tier === 'ultra') {
    // Ultra Rare tier (/26–/99) — cool platinum-blue
    className = 'text-[var(--ink-on-gold)] font-bold';
    inlineStyle = {
      borderColor: '#c8d4e0',
      backgroundImage: 'linear-gradient(180deg, #e0e8f0 0%, #98a5b3 100%)',
    };
  } else if (tier === 'rare') {
    // Rare tier (/100–/249) — deep bronze-orange
    className = 'text-[var(--ink-on-gold)] font-bold';
    inlineStyle = {
      borderColor: '#d6722d',
      backgroundImage: 'linear-gradient(180deg, #d6884a 0%, #8e4f1f 100%)',
    };
  } else if (tier === 'scarce') {
    // Scarce tier (/250–/999) — steel-gray
    className = 'text-[var(--ink-on-gold)] font-semibold';
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
        <span className="font-mono text-[11px] text-[var(--ink-600)] tracking-wider">02</span>
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
            <span className="font-mono text-[11px] text-[var(--ink-600)] group-hover:text-[var(--gold)] transition-colors">
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
        <span className="font-mono text-[11px] text-[var(--gold)] tracking-wider shimmer">●</span>
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

function NoResultsState({ onSuggested, appliedFilters, nameFix = null, onNameFix }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lg">No matches</span>
        <span className="font-mono text-[11px] text-[var(--ink-600)] tracking-wider">00</span>
      </div>
      {nameFix ? (
        <>
          <p className="font-display italic text-2xl text-[var(--ink-200)] leading-snug text-balance max-w-md">
            Nothing found. Did you mean <span style={{ color: 'var(--gold-bright)' }}>{nameFix}</span>?
          </p>
          <button
            type="button"
            onClick={() => onNameFix?.(nameFix)}
            className="mt-5 inline-flex items-center gap-2 rounded-full text-[14px] font-semibold transition-opacity hover:opacity-90"
            style={{ minHeight: 44, padding: '0 18px', background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}
          >
            Search {nameFix} <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </>
      ) : (
        <p className="font-display italic text-2xl text-[var(--ink-200)] leading-snug text-balance max-w-md">
          No results found with your current filters. Adjust them and try again.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Player-name help — autocomplete + "Did you mean".
   The matcher and player list (lib/playerSuggest.js) load lazily after
   first paint, so they never slow the landing page. Until they arrive the
   search box simply works without suggestions.
   ───────────────────────────────────────────── */
let playerSuggestModule = null;
function usePlayerSuggest() {
  const [mod, setMod] = useState(null);
  useEffect(() => {
    let alive = true;
    playerSuggestModule = playerSuggestModule || import('../lib/playerSuggest');
    playerSuggestModule.then((m) => { if (alive) setMod(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return mod;
}

/* Wires a text input to the suggestion dropdown. Returns props/handlers for
   the input, a ref for the element the dropdown sits under, and the
   dropdown itself (portalled to <body> so overflow-hidden parents never
   clip it). */
function useSuggestBox(value, onPick) {
  const mod = usePlayerSuggest();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState(null);

  const rows = useMemo(() => {
    if (!open) return [];
    // Teams come first ("pira" → Pittsburgh Pirates); they need no loading.
    const teams = suggestTeams(value, 5).map((t) => ({ kind: 'team', value: t.label, sport: `${t.league} team` }));
    if (!mod) return teams;
    const typed = mod.normalizeName(value);
    if (typed.length < 2) return [];
    let players = mod.suggestPlayers(value, 6);
    // Mid-word ("wemb") isn't a typo: skip the fix while the last word is
    // still the start of a name we're suggesting.
    const lastWord = typed.split(' ').pop();
    const stillTyping = players.some((p) => mod.normalizeName(p.name).split(' ').some((t) => t !== lastWord && t.startsWith(lastWord)));
    const fix = stillTyping || teamFromQuery(value) ? null : mod.didYouMean(value);
    // The fixed player's full name, if typing hasn't already surfaced it.
    if (fix?.sport && !players.some((p) => p.name === fix.name)) players = [{ name: fix.name, sport: fix.sport }, ...players];
    players = players.filter((p) => !fix || mod.normalizeName(p.name) !== mod.normalizeName(fix.query));
    // With a team on the list, keep only players whose name really starts
    // with what's typed ("duke" → Duke Clark), not near-misses.
    if (teams.length) {
      const words = typed.split(' ');
      players = players.filter((p) => words.every((w) => mod.normalizeName(p.name).split(' ').some((t) => t.startsWith(w))));
    }
    const list = [
      ...teams,
      ...(fix ? [{ kind: 'fix', value: fix.query }] : []),
      ...players.map((p) => ({ kind: 'player', value: p.name, sport: p.sport })),
    ].slice(0, 7);
    // Nothing to offer if the only row is exactly what's typed.
    if (list.length === 1 && mod.normalizeName(list[0].value) === typed) return [];
    return list;
  }, [mod, open, value]);

  useEffect(() => { setActive(-1); }, [value]);

  const visible = open && rows.length > 0;
  useLayoutEffect(() => {
    if (!visible) return;
    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setRect({ left: r.left + window.scrollX, top: r.bottom + window.scrollY, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [visible, rows.length]);

  const pick = (v) => { setOpen(false); onPick(v); };

  // Returns true when the key was used by the dropdown.
  function handleKey(e) {
    if (!visible) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % rows.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? rows.length - 1 : i - 1)); return true; }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(rows[active].value); return true; }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return true; }
    return false;
  }

  const listId = useMemo(() => `ff-suggest-${Math.random().toString(36).slice(2, 8)}`, []);
  const dropdown = visible && rect && typeof document !== 'undefined'
    ? createPortal(
        <PlayerSuggestDropdown
          id={listId}
          rows={rows}
          active={active}
          typed={value}
          rect={rect}
          onHover={setActive}
          onPick={pick}
        />,
        document.body,
      )
    : null;

  return {
    anchorRef,
    dropdown,
    handleKey,
    openBox: () => setOpen(true),
    close: () => setOpen(false),
    inputProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': visible,
      'aria-controls': visible ? listId : undefined,
      'aria-activedescendant': visible && active >= 0 ? `${listId}-${active}` : undefined,
      autoComplete: 'off',
      spellCheck: false,
    },
  };
}

// Wrap the typed words where they start a word in the name.
function highlightTyped(name, typed) {
  const words = String(typed || '').trim().split(/\s+/).filter(Boolean)
    .map((w) => w.replace(/[^\p{L}\p{N}'.-]/gu, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (!words.length) return name;
  const re = new RegExp(`(^|[\\s'-])(${words.join('|')})`, 'gi');
  const out = [];
  let last = 0;
  name.replace(re, (m, pre, word, idx) => {
    const start = idx + pre.length;
    if (start > last) out.push(name.slice(last, start));
    out.push(<mark key={start} style={{ background: 'none', color: 'var(--gold-bright)', fontWeight: 500 }}>{word}</mark>);
    last = start + word.length;
    return m;
  });
  if (last < name.length) out.push(name.slice(last));
  return out;
}

function PlayerSuggestDropdown({ id, rows, active, typed, rect, onHover, onPick }) {
  const width = Math.min(Math.max(rect.width, 280), 560);
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Player and team suggestions"
      className="overflow-hidden"
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top + 8,
        width,
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 60,
        margin: 0,
        padding: 0,
        listStyle: 'none',
        borderRadius: 12,
        border: '0.5px solid var(--line)',
        background: 'var(--bg-elev)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
        fontFamily: 'Geist, system-ui, sans-serif',
        fontStyle: 'normal',
      }}
    >
      {rows.map((row, i) => {
        const on = i === active;
        // "Teams" / "Players" labels, only when the list has teams in it.
        const group = row.kind === 'team' ? 'Teams' : 'Players';
        const prevGroup = i > 0 ? (rows[i - 1].kind === 'team' ? 'Teams' : 'Players') : null;
        const showGroup = rows.some((r) => r.kind === 'team') && group !== prevGroup;
        return (
          <Fragment key={`${row.kind}-${row.value}-${row.sport || ''}`}>
          {showGroup && (
            <li role="presentation" style={{ fontSize: 12, color: 'var(--ink-600)', padding: '10px 16px 6px', background: 'var(--bg-base)' }}>
              {group}
            </li>
          )}
          <li
            id={`${id}-${i}`}
            role="option"
            aria-selected={on}
            // mousedown, not click: keeps focus in the input so blur doesn't
            // close the list (or commit the heading) before the pick lands.
            onMouseDown={(e) => { e.preventDefault(); onPick(row.value); }}
            onMouseEnter={() => onHover(i)}
            className="flex items-center justify-between gap-3 cursor-pointer"
            style={{
              minHeight: 48,
              padding: '0 16px',
              fontSize: row.kind === 'fix' ? 14 : 15,
              color: row.kind === 'fix' ? 'var(--ink-400)' : on ? 'var(--ink-100)' : 'var(--ink-200)',
              background: on || row.kind === 'fix' ? 'var(--bg-elev-2)' : 'transparent',
              borderBottom: i < rows.length - 1 ? '0.5px solid var(--line-soft)' : 'none',
            }}
          >
            {row.kind === 'fix' ? (
              <span>
                Did you mean <strong style={{ color: 'var(--gold-bright)', fontWeight: 500 }}>{row.value}</strong>?
              </span>
            ) : (
              <>
                <span className="truncate">{highlightTyped(row.value, typed)}</span>
                <span
                  className="font-mono uppercase flex-none rounded-full"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: row.kind === 'team' ? 'var(--gold)' : 'var(--ink-600)',
                    border: `0.5px solid ${row.kind === 'team' ? 'var(--gold-deep)' : 'var(--line)'}`,
                    padding: '3px 8px',
                  }}
                >
                  {row.sport}
                </span>
              </>
            )}
          </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

/* One quiet line under the results heading when the name looks misspelled. */
function DidYouMeanLine({ fix, onPick, onDismiss }) {
  return (
    <p className="mt-3 text-[15px]" style={{ color: 'var(--ink-400)' }}>
      Did you mean{' '}
      <button
        type="button"
        onClick={onPick}
        className="transition-colors hover:text-[var(--ink-100)]"
        style={{ color: 'var(--gold-bright)', borderBottom: '0.5px solid var(--gold-deep)' }}
      >
        {fix}
      </button>
      ?
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss suggestion"
        className="ml-2 text-[13px] px-1 transition-colors hover:text-[var(--ink-200)]"
        style={{ color: 'var(--ink-600)' }}
      >
        <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </p>
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
    padding: '0 16px',
    fontSize: 14,
    border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
    background: on ? 'var(--gold-bright)' : 'var(--bg-elev-2)',
    color: on ? 'var(--ink-on-gold)' : 'var(--ink-200)',
    fontWeight: on ? 600 : 400,
  });

  return (
    <div>
      <SectionLabel>Card Company</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={clearAll} aria-pressed={brands.length === 0} className="inline-flex items-center rounded-full transition-colors" style={chip(brands.length === 0)}>
          Any
        </button>
        {CARD_COMPANIES.map((c) => {
          const on = brands.includes(c.key);
          return (
            <button key={c.key} type="button" onClick={() => toggleCompany(c.key)} aria-pressed={on} className="inline-flex items-center rounded-full transition-colors" style={chip(on)}>
              {c.label}
            </button>
          );
        })}
      </div>

      {CARD_COMPANIES.filter((c) => brands.includes(c.key) && c.lines.length > 0).map((c) => (
        <div
          key={c.key}
          className="mt-4 rise"
          style={{ animationDuration: '0.4s', padding: '16px 18px', background: 'rgba(20,17,13,0.3)', borderLeft: '2px solid var(--gold-deep)' }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--gold)' }}>{c.label} lines</span>
            <span className="text-[13px]" style={{ color: 'var(--ink-600)' }}>Optional</span>
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
                    border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`,
                    background: on ? 'rgba(201,149,74,0.10)' : 'var(--bg-elev-2)',
                    color: on ? 'var(--gold-bright)' : 'var(--ink-200)',
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
          {COMPANY_NOTES[c.key] && (
            <p className="text-[13px] mt-3 leading-snug" style={{ color: 'var(--ink-600)' }}>{COMPANY_NOTES[c.key]}</p>
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
        if (t.runs.some((r) => runs.has(r))) chips.push({ label: `/${t.range}`, tier: tierForRun(t.runs[t.runs.length - 1]) });
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
  const min = f.priceMin || 0;
  const max = f.priceMax ?? 1000;
  if (min > 0 || max < 1000) chips.push({ label: max >= 5000 ? `$${min}+` : `$${min}–$${max}` });
  return chips;
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
          className="inline-flex items-center rounded-full text-[12px]"
          style={{ minHeight: 26, padding: '0 10px', ...(c.tier ? tierChipStyle(c.tier) : OUTLINE_CHIP_STYLE) }}
        >
          {c.label}
        </span>
      ))}
      {chips.length === 0 && (
        <span className="text-[13px]" style={{ color: 'var(--ink-400)' }}>All cards</span>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="text-[13px] px-1 transition-colors hover:text-[var(--gold-bright)]"
        style={{ minHeight: 32, color: 'var(--ink-200)', borderBottom: '0.5px solid var(--gold-deep)' }}
      >
        Edit filters
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Team filter — pick a league, then the team. College adds a conference
   step. Teams that appear in the current results come first with a count;
   the rest are behind "+ N more". Title matching: lib/teams.js.
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
      const n = results.reduce((acc, it) => acc + (titleMatchesTeam(t, it.title) ? 1 : 0), 0);
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
    padding: '0 16px',
    fontSize: 14,
    border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
    background: on ? 'var(--gold-bright)' : 'var(--bg-elev-2)',
    color: on ? 'var(--ink-on-gold)' : 'var(--ink-200)',
    fontWeight: on ? 600 : 400,
  });
  const subChip = (on, dashed = false) => ({
    minHeight: 36,
    padding: '0 13px',
    fontSize: 13,
    border: `1px ${dashed ? 'dashed' : 'solid'} ${on ? 'var(--gold)' : 'var(--line)'}`,
    background: on ? 'rgba(201,149,74,0.10)' : 'var(--bg-elev-2)',
    color: on ? 'var(--gold-bright)' : dashed ? 'var(--ink-400)' : 'var(--ink-200)',
  });
  const subLabel = (text, hint) => (
    <div className="flex items-baseline justify-between mb-3">
      <span className="text-[11px] uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--gold)' }}>{text}</span>
      {hint && <span className="text-[12px]" style={{ color: 'var(--ink-600)' }}>{hint}</span>}
    </div>
  );

  return (
    <div>
      <SectionLabel>Team</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => pickLeague(null)} aria-pressed={!league && !selected.length} className="inline-flex items-center rounded-full transition-colors" style={chip(!league && !selected.length)}>
          Any
        </button>
        {TEAM_LEAGUES.map((l) => (
          <button key={l} type="button" onClick={() => pickLeague(l)} aria-pressed={league === l} className="inline-flex items-center rounded-full transition-colors" style={chip(league === l)}>
            {l}
          </button>
        ))}
      </div>

      {league && (
        <div className="mt-4 rise" style={{ animationDuration: '0.4s', padding: '16px 18px', background: 'rgba(20,17,13,0.3)', borderLeft: '2px solid var(--gold-deep)' }}>
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
                      {n ? <span className="text-[12px]" style={{ color: on ? 'var(--gold-bright)' : 'var(--ink-600)' }}>{n}</span> : null}
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
