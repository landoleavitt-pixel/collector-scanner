'use client';

// Foils & Fables: home (signed out / signed in), results and the saved-search
// edit page. Behaves exactly like Fields & Floors (DECISIONS.md: only colours,
// fonts and game filters differ), so it's built from the same shared pieces
// in app/components/search: name suggestions and "Did you mean", the editable
// heading, the filter sidebar and phone drawer, "Search with new filters?",
// sort, result rows, stars, the alert band and the card popup. The Night foil
// look comes from the [data-side="fables"] tokens in globals.css.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, Clock, Crosshair, Bookmark, Layers, Check, Bell, List } from 'lucide-react';
import { useUser } from '../../lib/useUser';
import { PAYMENTS_LIVE } from '../../lib/payments';
import { track } from '../../lib/track';
import SignupPromptCard from '../components/SignupPromptCard';
import SaveSearchModal from '../components/SaveSearchModal';
import SaveSearchPrompt from '../components/search/SaveSearchPrompt';
import ShareSearchButton from '../components/ShareSearchButton';
import CardModal from '../components/CardModal';
import { useNameSuggest, useSuggestBox, DidYouMeanLine, EditableSearchHeading } from '../components/search/SuggestBox';
import {
  PRICE_NO_MAX, SectionLabel, SectionDivider, PriceRangeSlider, priceRangeLabel, SegmentedGroup, ResultsSidebar,
  MobileFilterBar, MobileFilterDrawer, MobileSortSheet, SortDropdown, PendingSearchModal, BackToTop, LoadingState, NoResultsState,
  MoreFilters, ShippingFilters, shippingActive, shippingLabels,
} from '../components/search/SearchUI';
import { usePendingStarSave, AlertBand } from '../components/search/WatchStar';
import { ResultCard, Badge, upscaleEbayImage } from '../components/search/ResultCard';
import SetFilter from './SetFilter';
import { SIDE, fetchMeta, searchCards, toParams, fromParams, LANG_LABEL, serialOf, gradeText } from './data';
import { RARITY_GROUPS, RARITY_SOURCE, GROUP_ROW, groupOf, GroupChip } from './rarity';
import VersionsView from './VersionsView';
import useSetName from './useSetName';
import { PopularListsRow } from './CardListTiles';
import { VERSION_GAMES, VERSION_GAMES_TEXT, gameQuery } from './versions';

const DEFAULT_FILTERS = {
  game: '', rarity: [], lang: [], graded: 'any', grader: '', grade: '', firstEd: false, serialOnly: false,
  listing: 'any', priceMin: 0, priceMax: PRICE_NO_MAX, sort: 'rarest',
  // More filters (research/fables-filters-2.md)
  set: '', finish: [], art: [], promos: 'show', cond: [], freeShip: false, offers: false, shipFrom: '', returns: false,
};
// How many More filters are in use (for the fold's count and the badge).
const moreActive = (f) => (f.set ? 1 : 0) + (f.finish?.length ? 1 : 0) + (f.art?.length ? 1 : 0) + (f.promos && f.promos !== 'show' ? 1 : 0)
  + (f.graded === 'raw' && f.cond?.length ? 1 : 0) + shippingActive(f);
// Filters that need a new search when changed. Sort is left out, as on sports:
// it reorders without asking.
const COMPARE_KEYS = Object.keys(DEFAULT_FILTERS).filter((k) => k !== 'sort');
// Any of these in the URL is a shared search link that runs on arrival.
const SEARCH_KEYS = ['q', ...COMPARE_KEYS, 'sort'];
const SORT_OPTIONS = [
  ['rarest', 'Rarest first'],
  ['price-low', 'Price: low to high'],
  ['price-high', 'Price: high to low'],
  ['ending', 'Ending soonest'],
  ['newest', 'Newest first'],
];
const RECENTS_KEY = 'ffFablesRecents';

// Tier chip colours for this side. Names on chips are the card's own printed
// rarity, so no tier names are shown.
const TIER_STYLE = {
  grail: { background: 'var(--foil)', color: '#0b0f1a' },
  ultra: { background: 'linear-gradient(180deg,#c9d3f5,#8b97c7)', color: '#0b0f1a' },
  rare: { background: 'linear-gradient(180deg,#9fe3f5,#4b98ad)', color: '#071018' },
  scarce: { background: 'linear-gradient(180deg,#7a8199,#4a5068)', color: '#eef0f7' },
};
// Row tint by tier, same strength as sports' tierRowStyle.
// Row tint: the rarity group, or the old tier until every item has a group.
export const rowStyleFor = (item) => GROUP_ROW[item.rarityGroup] || TIER_ROW[item.tier] || null;
export const TIER_ROW = {
  grail: { backgroundImage: 'linear-gradient(90deg, rgba(182,168,240,0.30) 0%, rgba(240,179,208,0.10) 22%, transparent 55%)', borderLeft: '2px solid #d7c4f2' },
  ultra: { backgroundImage: 'linear-gradient(90deg, rgba(201,211,245,0.22) 0%, rgba(201,211,245,0.06) 18%, transparent 40%)', borderLeft: '2px solid #c9d3f5' },
  rare: { backgroundImage: 'linear-gradient(90deg, rgba(159,227,245,0.20) 0%, rgba(159,227,245,0.05) 16%, transparent 32%)', borderLeft: '2px solid #9fe3f5' },
  scarce: { backgroundImage: 'linear-gradient(90deg, rgba(122,129,153,0.18) 0%, transparent 24%)', borderLeft: '2px solid #7a8199' },
};

function getRecents() { try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; } }
function addRecent(q) {
  if (!q) return;
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify([q, ...getRecents().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 10))); } catch {}
}
const money = (v, c = 'USD') => (v == null ? '' : `${c === 'USD' ? '$' : ''}${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${c !== 'USD' ? ` ${c}` : ''}`);
const isDefault = (f) => COMPARE_KEYS.every((k) => JSON.stringify(f[k]) === JSON.stringify(DEFAULT_FILTERS[k]));
const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://fieldsandfloors.com');

function countActiveFilters(f) {
  let n = 0;
  if (f.game) n++;
  if (f.rarity?.length) n++;
  if (f.lang?.length) n++;
  if (f.graded && f.graded !== 'any') n++;
  if (f.firstEd) n++;
  if (f.serialOnly) n++;
  if (f.listing && f.listing !== 'any') n++;
  if ((f.priceMin || 0) > 0 || (f.priceMax ?? PRICE_NO_MAX) < PRICE_NO_MAX) n++;
  return n + moreActive(f);
}

// Plain-text chips for what a search is filtered by (results heading and the
// save modal).
function filterLabels(f, meta, setName) {
  const out = [];
  const game = meta?.games?.find((g) => g.key === f.game);
  if (game) out.push({ label: game.label });
  (f.rarity || []).forEach((k) => { const g = groupOf(k); if (g) out.push({ label: g.label, group: k }); });
  (f.lang || []).forEach((k) => out.push({ label: LANG_LABEL[k] || k }));
  if (f.graded === 'graded') out.push({ label: [f.grader || 'Graded', f.grade ? (f.grade === '10' ? '10' : `${f.grade}+`) : ''].filter(Boolean).join(' ') });
  if (f.graded === 'raw') out.push({ label: 'Raw' });
  if (f.firstEd) out.push({ label: '1st Edition' });
  if (f.serialOnly) out.push({ label: 'Serial-numbered' });
  if (f.listing === 'bin') out.push({ label: 'Buy It Now' });
  if (f.listing === 'auction') out.push({ label: 'Auction' });
  const min = f.priceMin || 0;
  const max = f.priceMax ?? PRICE_NO_MAX;
  if (min > 0 || max < PRICE_NO_MAX) out.push({ label: priceRangeLabel(min, max) });
  const more = meta?.more;
  const labelOf = (lists, k) => Object.values(lists || {}).flat().find(([key]) => key === k)?.[1] || k;
  if (f.set) out.push({ label: setName || 'Set' });
  (f.finish || []).forEach((k) => out.push({ label: labelOf(more?.finishes, k) }));
  (f.art || []).forEach((k) => out.push({ label: labelOf(more?.arts, k) }));
  if (f.promos === 'hide') out.push({ label: 'No promos' });
  if (f.promos === 'only') out.push({ label: 'Promos only' });
  if (f.graded === 'raw') (f.cond || []).forEach((k) => out.push({ label: more?.conditions?.find((c) => c.key === k)?.label || k }));
  shippingLabels(f).forEach((c) => out.push(c));
  return out;
}

export function fablesPayload(item) {
  return {
    listing_id: item.id, title: item.title, price: item.price, currency: item.currency || 'USD',
    image_url: item.image, listing_url: item.url, is_auction: !!item.isAuction,
    end_time: item.endTime || null, bid_count: item.bidCount ?? null,
    badges: { game: item.game, rarity: item.rarity, tier: item.tier, serial: serialOf(item), grade: gradeText(item), language: LANG_LABEL[item.language] || item.language || null, firstEdition: item.firstEdition },
    side: SIDE,
  };
}

export default function FablesHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const names = useNameSuggest('fables');
  const [meta, setMeta] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // The query and filters behind the results on screen.
  const [applied, setApplied] = useState(null); // { q, f }
  // 'transition' while a deep link (?savedSearch=, ?editSearch=, a shared
  // search) resolves, so the home page doesn't flash first.
  const [stage, setStage] = useState(() => (
    searchParams?.get('savedSearch') || searchParams?.get('editSearch') || SEARCH_KEYS.some((k) => searchParams?.get(k)) ? 'transition' : 'idle'
  ));
  const [res, setRes] = useState({ items: [], total: 0, nextOffset: null });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [editingSearch, setEditingSearch] = useState(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [pendingSearchOpen, setPendingSearchOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [dismissedFix, setDismissedFix] = useState(null);
  const [selectedCardItem, setSelectedCardItem] = useState(null);
  const [selectedExpired, setSelectedExpired] = useState(false);
  // Versions-first search: the shopper asked for the full list, or this search has no versions view.
  const [showAllListings, setShowAllListings] = useState(false);
  const [versionsOff, setVersionsOff] = useState(false);
  const sidebarRef = useRef(null);
  const searchSeq = useRef(0);

  useEffect(() => { fetchMeta().then(setMeta); setRecentSearches(getRecents()); }, []);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, ...(key === 'game' && value !== f.game ? { set: '', finish: [], art: [] } : {}) }));
  const appliedFilters = applied?.f || null;
  function filtersDifferFromApplied() {
    if (!appliedFilters) return false;
    return COMPARE_KEYS.some((k) => JSON.stringify(filters[k]) !== JSON.stringify(appliedFilters[k]));
  }
  function revertFiltersToApplied() {
    if (appliedFilters) setFilters((f) => ({ ...appliedFilters, sort: f.sort }));
  }

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktopViewport(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Desktop: the "Search with new filters?" prompt floats while filters
  // differ from the results on screen (same as sports).
  useEffect(() => {
    if (mobileFiltersOpen || !appliedFilters || !isDesktopViewport) return;
    setPendingSearchOpen(filtersDifferFromApplied());
  }, [filters, appliedFilters, mobileFiltersOpen, isDesktopViewport]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch(overrideQuery, overrideFilters) {
    const q = (overrideQuery ?? query).trim();
    const f = overrideFilters || filters;
    if (!q && isDefault(f)) {
      setError('Enter a card or character name, or pick a game.');
      return;
    }
    if (overrideQuery !== undefined) setQuery(overrideQuery);
    if (overrideFilters) setFilters(overrideFilters);
    if (q) { addRecent(q); setRecentSearches(getRecents()); }
    if (q !== applied?.q) { setShowAllListings(false); setVersionsOff(false); }
    setError(null);
    setLoading(true);
    setStage('results');
    const seq = ++searchSeq.current;
    const r = await searchCards(q, f);
    if (seq !== searchSeq.current) return; // a newer search took over
    if (r.error) {
      setError(r.error);
      setRes({ items: [], total: 0, nextOffset: null });
    } else {
      // Funnel tracking: filter types only, never the search text.
      track('searched', { side: SIDE, game: f.game || 'any', listing: f.listing || 'any', graded: f.graded === 'graded' });
      setRes(r);
    }
    setApplied({ q, f: { ...f } });
    setLoading(false);
  }

  async function loadMore() {
    if (res.nextOffset == null || loadingMore || !applied) return;
    setLoadingMore(true);
    const seq = searchSeq.current;
    const r = await searchCards(applied.q, applied.f, res.nextOffset);
    if (seq === searchSeq.current) setRes((prev) => ({ ...r, items: [...prev.items, ...(r.items || [])], total: r.total ?? prev.total }));
    setLoadingMore(false);
  }

  // Sort re-runs the shown search in the new order. Unapplied filter edits
  // stay pending, as on sports.
  function changeSort(v) {
    setFilter('sort', v);
    if (applied) handleSearch(applied.q, { ...applied.f, sort: v }).then(() => setFilters((f) => ({ ...f, sort: v })));
  }

  // ── Deep links ─────────────────────────────────────────────────────
  // ?savedSearch=<id> runs a saved search, ?editSearch=<id> opens it for
  // editing (no eBay call), and a shared link (/fables?q=…&game=…) runs.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return;
    const viewId = searchParams.get('savedSearch');
    const editId = searchParams.get('editSearch');
    if (viewId || editId) {
      if (userLoading) return;
      deepLinked.current = true;
      (async () => {
        try {
          const r = await fetch(`/api/saved-searches/${editId || viewId}`);
          const { search } = r.ok ? await r.json() : {};
          if (!search) throw new Error('not found');
          const restored = { ...DEFAULT_FILTERS, ...(search.filters || {}) };
          setFilters(restored);
          setQuery(search.query || '');
          router.replace('/fables', { scroll: false });
          if (editId) {
            setEditingSearch({ id: search.id, name: search.name, notify_enabled: search.notify_enabled });
            setStage('configuring');
          } else {
            handleSearch(search.query || '', restored);
          }
        } catch {
          setStage('idle');
        }
      })();
      return;
    }
    if (SEARCH_KEYS.some((k) => searchParams.get(k))) {
      deepLinked.current = true;
      const { q, filters: shared } = fromParams(searchParams);
      handleSearch(q, { ...DEFAULT_FILTERS, ...shared });
    }
  }, [userLoading, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Card popup (?card=<id>), same as sports ────────────────────────
  function openCard(item) {
    if (!item?.id) return;
    setSelectedCardItem(item);
    setSelectedExpired(false);
    const next = new URLSearchParams(window.location.search);
    next.set('card', item.id);
    window.history.pushState({ cardOpen: true }, '', `${window.location.pathname}?${next}`);
  }
  function closeCard() {
    setSelectedCardItem(null);
    setSelectedExpired(false);
    const next = new URLSearchParams(window.location.search);
    next.delete('card');
    const qs = next.toString();
    if (window.history.state?.cardOpen) window.history.back();
    else window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }
  useEffect(() => {
    const cardId = searchParams.get('card');
    if (!cardId) { setSelectedCardItem(null); setSelectedExpired(false); return; }
    const match = res.items.find((r) => r.id === cardId);
    if (match) { setSelectedCardItem(match); setSelectedExpired(false); return; }
    if (res.items.length > 0 || stage === 'results') {
      setSelectedCardItem({ id: cardId, title: '', url: '', image: null });
      setSelectedExpired(true);
      return;
    }
    // Cold arrival (alert email): load the listing and open it.
    let cancelled = false;
    fetch(`/api/listing/${encodeURIComponent(cardId)}`).then((r) => r.json()).catch(() => null).then((d) => {
      if (cancelled) return;
      if (d?.ok) {
        setSelectedCardItem({
          id: cardId, title: d.title || '', price: d.price ?? null, currency: d.currency || 'USD',
          image: Array.isArray(d.images) && d.images[0] ? d.images[0] : null, url: d.url || '',
          isAuction: !!d.isAuction, endTime: d.endTime || null,
        });
        setSelectedExpired(false);
      } else {
        setSelectedCardItem({ id: cardId, title: '', url: '', image: null });
        setSelectedExpired(true);
      }
    });
    return () => { cancelled = true; };
  }, [searchParams, res.items, stage]);
  useEffect(() => {
    const onPop = () => { if (!new URLSearchParams(window.location.search).get('card')) { setSelectedCardItem(null); setSelectedExpired(false); } };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Name help ──────────────────────────────────────────────────────
  const tidyRecents = useMemo(
    () => (names ? names.tidyRecentSearches(recentSearches, 5) : recentSearches.slice(0, 5)),
    [names, recentSearches],
  );
  const shownQuery = applied?.q ?? query;
  const nameFix = useMemo(
    () => (names && stage === 'results' && shownQuery ? names.didYouMean(shownQuery) : null),
    [names, stage, shownQuery],
  );
  const searchFix = (fixed) => handleSearch(fixed);

  function newSearch() {
    setStage('idle');
    setQuery('');
    setFilters(DEFAULT_FILTERS);
    setRes({ items: [], total: 0, nextOffset: null });
    setError(null);
    setApplied(null);
    setShowAllListings(false);
    setVersionsOff(false);
    window.scrollTo({ top: 0 });
  }

  const saveSetName = useSetName(filters.game, filters.set);
  const gameLabel = meta?.games?.find((g) => g.key === (appliedFilters || filters).game)?.label;
  function handleOpenSave() {
    if (!user) { setSavePromptOpen(true); return; }
    setSaveModalOpen(true);
  }
  const saveModal = (
    <SaveSearchModal
      open={saveModalOpen}
      onClose={() => { setSaveModalOpen(false); if (editingSearch) setEditingSearch(null); }}
      query={query || gameLabel || ''}
      filters={filters}
      chips={filterLabels(filters, meta, saveSetName).map((c) => ({ label: c.label, tier: 'neutral' }))}
      editingSearch={editingSearch}
      side={SIDE}
    />
  );

  const cardModal = selectedCardItem && (
    <CardModal
      item={selectedCardItem}
      printRun={null}
      onClose={closeCard}
      expired={selectedExpired}
      side={SIDE}
      chips={selectedExpired ? null : <CardBadges item={selectedCardItem} meaning />}
      watchPayload={fablesPayload(selectedCardItem)}
    />
  );

  if (stage === 'transition') return <main className="min-h-[70vh]" />;

  if (stage === 'configuring') {
    return (
      <main>
        <EditPanel
          meta={meta} query={query} setQuery={setQuery} filters={filters} setFilter={setFilter} editingSearch={editingSearch}
          onSubmit={() => setSaveModalOpen(true)}
          onCancel={() => { setEditingSearch(null); router.push('/watchlist'); }}
        />
        {saveModal}
      </main>
    );
  }

  if (stage === 'results') {
    // Searches that name a card in a game with a catalog open on its versions;
    // filters and One Piece use the normal list below.
    const plainSearch = loading ? (query.trim() && isDefault(filters)) : (applied?.q && isDefault(applied.f));
    const versionsGame = !loading && applied ? (applied.f.game || mainGame(res.items)) : null;
    const canHaveVersions = plainSearch && !versionsOff && (loading || VERSION_GAMES.includes(versionsGame));
    if (canHaveVersions && !showAllListings) {
      return (
        <main className="relative min-h-screen z-10">
          {loading
            ? <div className="max-w-[720px] mx-auto px-5 md:px-6 pt-8 pb-16"><LoadingState phrase="Searching eBay" /></div>
            : <VersionsView
                query={applied.q}
                game={versionsGame}
                onUnavailable={() => setVersionsOff(true)}
                onNewSearch={newSearch}
                onSearch={(t) => handleSearch(t, { ...filters })}
                onShowAll={() => setShowAllListings(true)}
              />}
          {cardModal}
          <BackToTop />
        </main>
      );
    }
    const resultsReturn = applied ? `/fables?${toParams(applied.q, applied.f)}` : null;
    const pending = filtersDifferFromApplied();
    return (
      <main className="relative min-h-screen z-10">
        <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-10 pb-16 relative z-10 stage-in">
          <div className="flex flex-wrap items-end justify-between gap-6 pb-6 mb-8 border-b border-[var(--line)]">
            <div className="min-w-0 flex-1">
              <h1 className="sr-only">{shownQuery || gameLabel || 'All games'} cards</h1>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-2">Searching for</p>
              <EditableSearchHeading
                side="fables"
                value={shownQuery}
                placeholder={gameLabel || 'All games'}
                onSubmit={(next) => {
                  const trimmed = (next || '').trim();
                  if (trimmed === shownQuery) return;
                  handleSearch(trimmed, { ...filters });
                }}
              />
              {nameFix && !loading && res.items.length > 0 && dismissedFix !== shownQuery && (
                <DidYouMeanLine fix={nameFix.query} onPick={() => searchFix(nameFix.query)} onDismiss={() => setDismissedFix(shownQuery)} />
              )}
              <FilterChips
                meta={meta}
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
              {!loading && (
                <p className="text-[13px] mt-3" style={{ color: 'var(--ink-400)' }}>
                  <span style={{ color: 'var(--gold)' }}>{res.total}</span>{' '}
                  {res.total === 1 ? 'listing' : 'listings'}, rarest first{res.stub ? ' (sample data)' : ''}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <ShareSearchButton
                query={query}
                filters={filters}
                url={`${origin()}/fables?${toParams(query, filters)}`}
                siteName="Foils & Fables"
              />
              <div className="hidden lg:block">
                <SortDropdown value={filters.sort} onChange={changeSort} options={SORT_OPTIONS} />
              </div>
              <button
                onClick={handleOpenSave}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] transition-colors"
                style={{ border: '0.5px solid var(--gold)', color: 'var(--gold)', background: 'transparent' }}
              >
                <Bookmark className="w-[13px] h-[13px]" strokeWidth={1.6} aria-hidden="true" />
                Save this search
              </button>
              <button
                onClick={newSearch}
                className="py-3 -my-3 text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors"
              >
                New search
              </button>
            </div>
          </div>

          {applied?.q && !loading && (canHaveVersions ? (
            <button type="button" onClick={() => setShowAllListings(false)}
                    className="w-full lg:w-auto lg:px-6 min-h-[56px] rounded-2xl inline-flex items-center justify-center gap-2 text-[16px] font-semibold mb-6"
                    style={{ border: '1.5px solid var(--gold-bright)', color: 'var(--gold-bright)' }}>
              <Layers className="w-5 h-5" strokeWidth={2} aria-hidden="true" />See every version
            </button>
          ) : <EveryCardButton query={applied.q} game={appliedFilters?.game || mainGame(res.items)} />)}

          <MobileFilterBar
            activeCount={countActiveFilters(filters)}
            onOpenFilters={() => setMobileFiltersOpen(true)}
            onOpenSort={() => setMobileSortOpen(true)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-x-12 gap-y-8 items-start">
            <div ref={sidebarRef} className="hidden lg:block scroll-mt-6">
              <ResultsSidebar onSearch={() => handleSearch()} hasPending={pending}>
                <FilterControls meta={meta} filters={filters} setFilter={setFilter} compact />
              </ResultsSidebar>
            </div>
            <ResultsList
              loading={loading}
              loadingMore={loadingMore}
              res={res}
              error={error}
              query={applied?.q || gameLabel || ''}
              appliedFilters={appliedFilters}
              hasPendingFilters={pending}
              onPendingClick={() => setPendingSearchOpen(true)}
              onCardClick={openCard}
              nameFix={nameFix?.query || null}
              onNameFix={searchFix}
              onAlert={handleOpenSave}
              returnPath={resultsReturn}
              onMore={loadMore}
            />
          </div>

          <MobileFilterDrawer
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            onCloseWithChanges={() => { setMobileFiltersOpen(false); setPendingSearchOpen(true); }}
            filters={filters}
            onSearch={() => { handleSearch(); setMobileFiltersOpen(false); }}
          >
            <FilterControls meta={meta} filters={filters} setFilter={setFilter} compact />
          </MobileFilterDrawer>
          <MobileSortSheet
            open={mobileSortOpen}
            onClose={() => setMobileSortOpen(false)}
            value={filters.sort}
            options={SORT_OPTIONS}
            note="Sort reloads these results in the new order. Your filters stay the same."
            onChange={(v) => { changeSort(v); setMobileSortOpen(false); }}
          />
          <PendingSearchModal
            open={pendingSearchOpen}
            floating={isDesktopViewport}
            onSearch={() => { setPendingSearchOpen(false); handleSearch(); }}
            onCancel={() => { setPendingSearchOpen(false); revertFiltersToApplied(); }}
            onDismiss={() => setPendingSearchOpen(false)}
          />
        </section>
        {saveModal}
        {savePromptOpen && (
          <SaveSearchPrompt query={query || gameLabel || ''} returnPath={`/fables?${toParams(query, filters)}`} onClose={() => setSavePromptOpen(false)} />
        )}
        {cardModal}
        <BackToTop />
      </main>
    );
  }

  return (
    <main>
      {!userLoading && user
        ? <SignedIn query={query} setQuery={setQuery} onSearch={handleSearch} recents={tidyRecents} error={error} onCardClick={openCard} />
        : <SignedOut query={query} setQuery={setQuery} onSearch={handleSearch} error={error} onCardClick={openCard} />}
      {cardModal}
    </main>
  );
}

/* ── "See every Charizard card" (opens the checklist) ────────────────── */

// The game most of these results are from (null if under half).
function mainGame(items) {
  const top = (items || []).slice(0, 20).filter((it) => it.game);
  const counts = {};
  for (const it of top) counts[it.game] = (counts[it.game] || 0) + 1;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] * 2 >= top.length ? best[0] : null;
}
const normName = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Shown above results when the search names a card we have a list for. `game` is the game filter, or else the game most of
// the results are from, so a Lorcana "Stitch" search doesn't offer a Magic list.
// The shortest catalog name inside the search is the family ("charizard ex sir"
// → Charizard). Failing that, the search itself if it names a small family
// ("ragavan" → Ragavan, Nimble Pilferer).
const FAMILY_BUTTON_MAX = 40;
function EveryCardButton({ query, game }) {
  const [family, setFamily] = useState(null);
  useEffect(() => {
    setFamily(null);
    if (!VERSION_GAMES.includes(game)) return undefined;
    let alive = true;
    const q = ` ${normName(query)} `;
    const get = (params) => fetch(`/api/tcg-versions?game=${game}&${params}`).then((r) => (r.ok ? r.json() : { cards: [] })).catch(() => ({ cards: [] }));
    // The name lookup matches from the start of a name, so ask for each of the
    // first few words ("charizard ex sir" → "charizard", "ex", "sir").
    const words = [...new Set(normName(query).split(' ').filter((w) => w.length >= 3))].slice(0, 3);
    Promise.all([...words.map((w) => get(`q=${encodeURIComponent(w)}`)), get(`q=${encodeURIComponent(query)}&family=1`)]).then((all) => {
      if (!alive) return;
      const phrase = all.pop();
      const inside = all.flatMap((d) => d.cards || []).filter((c) => q.includes(` ${normName(c.name)} `));
      inside.sort((a, b) => a.name.length - b.name.length);
      if (inside[0]) setFamily(inside[0].name);
      else if (phrase.cards?.length && phrase.cards.length <= FAMILY_BUTTON_MAX) setFamily(query.trim().replace(/\b\w/g, (c) => c.toUpperCase()));
    });
    return () => { alive = false; };
  }, [query, game]);
  if (!family) return null;
  return (
    <Link href={`/fables/checklist?${gameQuery(game)}name=${encodeURIComponent(family)}`}
          className="w-full lg:w-auto lg:px-6 min-h-[56px] rounded-2xl inline-flex items-center justify-center gap-2 text-[16px] font-semibold mb-6"
          style={{ border: '1.5px solid var(--gold-bright)', color: 'var(--gold-bright)' }}>
      <Layers className="w-5 h-5" strokeWidth={2} aria-hidden="true" />See every {family} card
    </Link>
  );
}

/* ── search box (home) ───────────────────────────────────────────────── */

function SearchBar({ query, setQuery, onSubmit, onPick }) {
  // Picking a suggestion searches it straight away, as on sports.
  const suggest = useSuggestBox(query, (v) => { setQuery(v); onPick?.(v); }, { side: 'fables' });
  return (
    <>
      <form
        ref={suggest.anchorRef}
        onSubmit={(e) => { e.preventDefault(); suggest.close(); onSubmit(); }}
        className="flex items-center gap-2.5 min-h-[64px] rounded-2xl pl-[18px] pr-1.5 py-1.5 ff-foil-edge"
      >
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); suggest.openBox(); }}
          onKeyDown={(e) => { suggest.handleKey(e); }}
          onFocus={suggest.openBox}
          onBlur={suggest.close}
          {...suggest.inputProps}
          placeholder="Which card? Try Charizard" aria-label="Which card?"
          className="flex-1 min-w-0 bg-transparent outline-none text-[18px] py-2" style={{ color: 'var(--ink-100)' }}
        />
        <button type="submit" aria-label="Show cards" className="w-[52px] h-[52px] rounded-xl grid place-items-center flex-none"
                style={{ background: 'linear-gradient(180deg,var(--gold-fill-top),var(--gold-fill-bottom))', color: 'var(--ink-on-gold)' }}>
          <Search className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </form>
      {suggest.dropdown}
      <p className="text-[13px] mt-2.5 px-0.5 md:text-center" style={{ color: 'var(--ink-600)' }}>Every version for {VERSION_GAMES_TEXT}.</p>
    </>
  );
}

export function TcgChip({ item }) {
  const of = serialOf(item);
  if (of) return <span className="inline-flex items-center px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.1em]" style={TIER_STYLE.grail}>/{of}</span>;
  if (!item.rarity) return null;
  return (
    <span className="inline-block max-w-full align-middle px-2.5 py-1 text-[11px] leading-snug font-semibold tracking-[0.04em]" style={TIER_STYLE[item.tier] || { color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
      {item.rarity}
    </span>
  );
}

// Badges on a result row and in the card popup: the rarity group with the
// game's own rarity small beside it ("Extremely rare · Hyper Rare"), then the
// other tags. Items without a group yet show the game's rarity chip as before.
// `meaning` adds the popup's plain line ("Extremely rare: fewer than one in a
// box of packs").
export function CardBadges({ item, meaning = false }) {
  const g = groupOf(item.rarityGroup);
  const of = serialOf(item);
  return (
    <>
      {g ? (
        <>
          <GroupChip group={item.rarityGroup} />
          {item.rarity && item.rarity !== g.label && <span className="self-center text-[12px]" style={{ color: 'var(--ink-400)' }}>{item.rarity}</span>}
          {of && <Badge mono>/{of}</Badge>}
        </>
      ) : <TcgChip item={item} />}
      {item.firstEdition && <Badge>1st Edition</Badge>}
      {item.language && item.language !== 'en' && item.language !== 'English' && <Badge>{LANG_LABEL[item.language] || item.language}</Badge>}
      {item.shadowless && <Badge>Shadowless</Badge>}
      {gradeText(item) && <Badge>{gradeText(item)}</Badge>}
      {meaning && g && (
        <p className="w-full text-[14px] mt-1" style={{ color: 'var(--ink-200)' }}><b className="font-semibold">{g.label}:</b> {g.meaning.charAt(0).toLowerCase() + g.meaning.slice(1)}.</p>
      )}
    </>
  );
}
export const hasCardBadges = (item) => !!(item.rarityGroup || serialOf(item) || item.rarity || item.firstEdition || (item.language && item.language !== 'en') || item.shadowless || gradeText(item));

function CardImage({ src, alt, className = '' }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={`block aspect-[3/4] rounded overflow-hidden ${className}`} style={{ background: 'var(--bg-elev-2)' }}>
      {src && !bad
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={upscaleEbayImage(src)} alt={alt} className="w-full h-full object-cover" loading="lazy" onError={() => setBad(true)} />
        : null}
    </span>
  );
}

/* ── signed-out home ─────────────────────────────────────────────────── */

const REASON_LINES = [
  [Layers, 'Every version for sale, from one search. A version is the same card in a different set, finish or language.'],
  [Check, 'Mark the cards you own on its card list. Only you can see them.'],
  [Bell, 'Get told when a version you don’t own yet is listed.'],
];

function SignedOut({ query, setQuery, onSearch, error }) {
  usePendingStarSave();
  return (
    <>
      <section className="max-w-[760px] mx-auto px-5 md:px-6 pt-7 md:pt-14">
        <h1 className="font-display text-[40px] md:text-[60px] leading-[1.04] tracking-[-0.01em] mb-2 md:text-center">
          Find any card. <em className="ff-foil-text">See every version.</em>
        </h1>
        <p className="text-[18px] mb-5 md:mb-7 md:text-center" style={{ color: 'var(--ink-200)' }}>Then keep track of the ones you have.</p>
        <SearchBar query={query} setQuery={setQuery} onSubmit={() => onSearch()} onPick={(v) => onSearch(v)} />
        {error && <p className="text-[13px] mt-2" style={{ color: 'var(--crit)' }}>{error}</p>}
      </section>
      <div className="max-w-[1080px] mx-auto px-5 md:px-8 mt-8 md:mt-10">
        <PopularListsRow />
        <Link href="/fables/lists" className="flex md:inline-flex items-center justify-center gap-2 min-h-[56px] md:px-8 mt-4 rounded-2xl text-[16px] font-medium"
              style={{ border: '1.5px solid var(--line)', color: 'var(--ink-100)' }}>
          <List className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Browse every card list
        </Link>
        <ul className="list-none m-0 p-0 mt-7 grid gap-3.5 md:grid-cols-3 md:gap-6">
          {REASON_LINES.map(([Icon, line]) => (
            <li key={line} className="flex items-center gap-3 text-[15px]" style={{ color: 'var(--ink-400)' }}>
              <span className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-none" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--gold-bright)' }}>
                <Icon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>
      <p className="max-w-[760px] mx-auto px-5 text-center text-[12px] leading-relaxed mt-8 pb-4" style={{ color: 'var(--ink-600)' }}>
        {!PAYMENTS_LIVE && 'Free during early access. '}Not affiliated with eBay or any game publisher.
      </p>
    </>
  );
}

/* ── signed-in home ──────────────────────────────────────────────────── */

function SignedIn({ query, setQuery, onSearch, recents, error, onCardClick }) {
  usePendingStarSave();
  const [saved, setSaved] = useState([]);
  useEffect(() => {
    fetch(`/api/saved-searches?side=${SIDE}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      setSaved((d?.searches || []).filter((s) => s.side === SIDE).slice(0, 4));
    }).catch(() => {});
  }, []);
  const shownRecents = recents.filter((r) => !saved.some((s) => s.query?.toLowerCase() === r.toLowerCase())).slice(0, 4);
  return (
    <section className="max-w-[1040px] mx-auto px-5 md:px-6 lg:px-10 pt-8 md:pt-12 pb-16">
      <SearchBar query={query} setQuery={setQuery} onSubmit={() => onSearch()} onPick={(v) => onSearch(v)} />
      {error && <p className="text-[13px] mt-2" style={{ color: 'var(--crit)' }}>{error}</p>}
      {(saved.length > 0 || shownRecents.length > 0) && (
        <div className="flex gap-2 mt-3 overflow-x-auto md:flex-wrap pb-1">
          {saved.map((s) => (
            <button key={s.id} type="button" onClick={() => onSearch(s.query || '', { ...DEFAULT_FILTERS, ...(s.filters || {}) })}
                    className="flex-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap" style={{ color: 'var(--ink-200)', border: '1px solid var(--gold-deep)' }}>
              <Crosshair className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: 'var(--gold)' }} aria-hidden="true" />{s.name}
            </button>
          ))}
          {shownRecents.map((r) => (
            <button key={r} type="button" onClick={() => onSearch(r, DEFAULT_FILTERS)}
                    className="flex-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap" style={{ color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
              <Clock className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />{r}
            </button>
          ))}
        </div>
      )}
      <div className="mt-9"><PopularListsRow /></div>
      <div className="mt-9"><ForSaleShelf count={5} onCardClick={onCardClick} /></div>
    </section>
  );
}

/* ── for sale now ───────────────────────────────────────────────────── */

function ForSaleShelf({ count, onCardClick }) {
  const [items, setItems] = useState(null);
  // A $100 floor keeps the shelf to real chase cards, not $1 prize-card listings.
  useEffect(() => { searchCards('', { ...DEFAULT_FILTERS, priceMin: 100 }).then((r) => {
    // Two sellers' listings of one card can share a title: show it once.
    const seen = new Set();
    setItems(r.items.filter((it) => { const t = normName(it.title); if (seen.has(t)) return false; seen.add(t); return true; }).slice(0, count));
  }); }, [count]);
  if (items && !items.length) return null;
  return (
    <div>
      <h2 className="text-[13px] font-normal mb-3" style={{ color: 'var(--ink-400)' }}>For sale now on eBay</h2>
      <div className={`grid gap-3 ${count > 2 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2'}`}>
        {(items || Array.from({ length: count }, () => null)).map((it, i) => (
          <a key={it?.id || i} href={it?.url || undefined} target="_blank" rel="noopener noreferrer"
             onClick={(e) => { if (it && onCardClick && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); onCardClick(it); } }}
             className="block min-w-0">
            <CardImage src={it?.image} alt={it?.title || ''} className="mb-2 rounded-lg" />
            <span className="block text-[14px] font-medium leading-snug line-clamp-2">{it?.title}</span>
            <span className="text-[14px]" style={{ color: 'var(--ink-200)' }}>{it ? money(it.price, it.currency) : ''}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── results ─────────────────────────────────────────────────────────── */

function FilterChips({ meta, filters, onEdit }) {
  const chips = filterLabels(filters, meta, useSetName(filters.game, filters.set));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c.label} className="inline-flex items-center rounded-full text-[12px]"
              style={{ minHeight: 26, padding: '0 10px', ...(c.group ? groupOf(c.group).chip : { color: 'var(--gold-bright)', background: 'rgba(143,211,232,0.06)', border: '0.5px solid var(--gold-deep)' }) }}>
          {c.label}
        </span>
      ))}
      {chips.length === 0 && <span className="text-[13px]" style={{ color: 'var(--ink-400)' }}>All cards</span>}
      <button type="button" onClick={onEdit} className="text-[13px] px-1 transition-colors hover:text-[var(--gold-bright)]"
              style={{ minHeight: 32, color: 'var(--ink-200)', borderBottom: '0.5px solid var(--gold-deep)' }}>
        Edit filters
      </button>
    </div>
  );
}

function ResultsList({ loading, loadingMore, res, error, query, appliedFilters, hasPendingFilters, onPendingClick, onCardClick, nameFix, onNameFix, onAlert, returnPath, onMore }) {
  if (loading) return <LoadingState phrase="Searching eBay" />;
  if (res.items.length === 0) {
    return (
      <div>
        {error
          ? <p className="font-display italic text-2xl leading-snug pt-2" style={{ color: 'var(--crit)' }}>{error}</p>
          : <NoResultsState appliedFilters={appliedFilters} nameFix={nameFix} onNameFix={onNameFix} emptyText="No cards found with your current filters. Try fewer filters or another spelling." />}
        <AlertBand query={query} filters={appliedFilters} onAlert={onAlert} returnPath={returnPath} />
      </div>
    );
  }
  const formatPrice = (p) => money(p);
  const remaining = Math.max(0, (res.total || 0) - res.items.length);
  return (
    <div>
      <div className="divide-y divide-[var(--line-soft)]">
        {res.items.flatMap((item, i) => {
          const card = (
            <ResultCard
              key={item.id} item={item} formatPrice={formatPrice} index={i}
              hasPendingFilters={hasPendingFilters} onPendingClick={onPendingClick} onCardClick={onCardClick}
              payload={fablesPayload(item)} rowStyle={rowStyleFor(item)}
              badges={<CardBadges item={item} />} hasBadges={hasCardBadges(item)}
            />
          );
          return i === 3 ? [card, <SignupPromptCard key="signup-prompt" />] : [card];
        })}
      </div>
      {res.nextOffset != null && (
        <div className="pt-8 flex flex-col items-center gap-3">
          <span className="text-[12px]" style={{ color: 'var(--ink-600)' }}>Showing {res.items.length} of {res.total}</span>
          <button
            onClick={onMore}
            disabled={loadingMore}
            className="text-[11px] uppercase tracking-[0.2em] px-6 py-3 rounded-full transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ border: '0.5px solid var(--gold-deep)', color: 'var(--gold)' }}
          >
            {loadingMore ? 'Loading…' : `Load ${Math.min(48, remaining || 48)} more`}
          </button>
        </div>
      )}
      <AlertBand query={query} filters={appliedFilters} onAlert={onAlert} returnPath={returnPath} />
    </div>
  );
}

/* ── filter controls (sidebar, phone drawer, edit page) ──────────────── */

// Chip toggle styled like the sports print-run chips.
function Chip({ on, onClick, children, tier }) {
  const onStyle = tier && TIER_STYLE[tier]
    ? { ...TIER_STYLE[tier], border: '1px solid transparent', fontWeight: 600 }
    : { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', border: '1px solid var(--gold-bright)', fontWeight: 600 };
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
            className="text-[13px] inline-flex items-center rounded-full transition-all whitespace-nowrap"
            style={{ minHeight: 36, padding: '0 14px', ...(on ? onStyle : { border: '1px solid var(--line)', background: 'var(--bg-elev-2)', color: 'var(--ink-200)', fontWeight: 500 }) }}>
      {children}
    </button>
  );
}

function FilterControls({ meta, filters, setFilter, compact = false }) {
  if (!meta) return <div className="h-40 rounded-xl shimmer" style={{ background: 'var(--bg-elev)' }} />;
  const toggleIn = (k, v) => setFilter(k, filters[k].includes(v) ? filters[k].filter((x) => x !== v) : [...filters[k], v]);
  return (
    <div className={compact ? 'space-y-7' : 'space-y-10'}>
      <div>
        <SectionLabel>Game</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Chip on={!filters.game} onClick={() => setFilter('game', '')}>Any</Chip>
          {meta.games.map((g) => <Chip key={g.key} on={filters.game === g.key} onClick={() => setFilter('game', g.key)}>{g.label}</Chip>)}
        </div>
      </div>
      <div>
        <SectionLabel>Rarity</SectionLabel>
        {RARITY_GROUPS.map((g) => {
          const on = filters.rarity.includes(g.key);
          return (
            <button key={g.key} type="button" onClick={() => toggleIn('rarity', g.key)} aria-pressed={on}
                    className="w-full flex items-center gap-3 min-h-[58px] px-3 py-2 rounded-xl mb-2 text-left"
                    style={{ background: on ? 'var(--bg-elev-2)' : 'var(--bg-base)', border: `1.5px solid ${on ? 'var(--gold-bright)' : 'var(--line)'}` }}>
              <span className="w-[22px] h-[22px] rounded-md flex-none" style={g.dot ? { background: g.dot } : { border: '1px solid var(--line)' }} aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-medium" style={{ color: 'var(--ink-100)' }}>{g.label}</span>
                <span className="text-[13px]" style={{ color: 'var(--ink-400)' }}>{g.meaning}</span>
              </span>
              <span className="w-6 h-6 rounded-md grid place-items-center flex-none"
                    style={on ? { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' } : { border: '2px solid var(--ink-600)' }}>
                {on && <Check className="w-[15px] h-[15px]" strokeWidth={3} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
        <p className="text-[12px] mt-1" style={{ color: 'var(--ink-600)' }}>{RARITY_SOURCE}</p>
      </div>
      <SectionDivider />
      <div>
        <SectionLabel>Language</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Chip on={!filters.lang.length} onClick={() => setFilter('lang', [])}>All</Chip>
          {(meta.languages || []).map((l) => <Chip key={l.key} on={filters.lang.includes(l.key)} onClick={() => toggleIn('lang', l.key)}>{l.label}</Chip>)}
        </div>
      </div>
      <SectionDivider />
      <div className={compact ? 'space-y-7' : 'grid grid-cols-1 md:grid-cols-2 gap-8'}>
        <div>
          <SectionLabel>Listing Type</SectionLabel>
          <SegmentedGroup value={filters.listing} onChange={(v) => setFilter('listing', v)} vertical={compact}
                          options={[['any', 'Any'], ['bin', 'Buy It Now'], ['auction', 'Auction']]} />
        </div>
        <div>
          <SectionLabel>Condition</SectionLabel>
          <SegmentedGroup value={filters.graded} onChange={(v) => setFilter('graded', v)} vertical={compact}
                          options={[['any', 'Any'], ['raw', 'Raw'], ['graded', 'Graded']]} />
        </div>
      </div>
      {filters.graded === 'graded' && (
        <div className="space-y-5">
          <div>
            <SectionLabel>Grader</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <Chip on={!filters.grader} onClick={() => setFilter('grader', '')}>Any</Chip>
              {(meta.graders || []).map((g) => <Chip key={g} on={filters.grader === g} onClick={() => setFilter('grader', g)}>{g}</Chip>)}
            </div>
          </div>
          <div>
            <SectionLabel>Grade</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {[['', 'Any'], ['10', '10'], ['9.5', '9.5+'], ['9', '9+']].map(([k, l]) => <Chip key={l} on={filters.grade === k} onClick={() => setFilter('grade', k)}>{l}</Chip>)}
            </div>
          </div>
        </div>
      )}
      <SectionDivider />
      <div>
        <SectionLabel>Only</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Chip on={filters.firstEd} onClick={() => setFilter('firstEd', !filters.firstEd)}>1st Edition</Chip>
          <Chip on={filters.serialOnly} onClick={() => setFilter('serialOnly', !filters.serialOnly)}>Serial-numbered</Chip>
        </div>
      </div>
      <SectionDivider />
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <SectionLabel className="!mb-0">Price Range</SectionLabel>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-600)]">USD</span>
        </div>
        <PriceRangeSlider
          min={filters.priceMin}
          max={filters.priceMax}
          onChange={(min, max) => { setFilter('priceMin', min); setFilter('priceMax', max); }}
        />
      </div>
      <SectionDivider />
      <MoreFilters active={moreActive(filters)}>
        <MoreFablesFilters meta={meta} filters={filters} setFilter={setFilter} />
      </MoreFilters>
      <p className="text-[12px]" style={{ color: 'var(--ink-600)' }}>Sealed product, lots and proxies are hidden.</p>
    </div>
  );
}

// Behind "More filters". Finish and special art show only for a picked game
// that has them, and Condition only for raw cards. Title-read filters keep
// only listings whose title says so; they never hide the rest of a game.
function MoreFablesFilters({ meta, filters, setFilter }) {
  const more = meta.more || {};
  const finishes = filters.game ? more.finishes?.[filters.game] || [] : [];
  const arts = filters.game ? more.arts?.[filters.game] || [] : [];
  const toggleIn = (k, v) => setFilter(k, (filters[k] || []).includes(v) ? filters[k].filter((x) => x !== v) : [...(filters[k] || []), v]);
  return (
    <>
      <SetFilter game={filters.game} value={filters.set || ''} onChange={(v) => setFilter('set', v)} />
      {finishes.length > 0 && (
        <div>
          <SectionLabel>Foil or holo</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {finishes.map(([k, l]) => <Chip key={k} on={(filters.finish || []).includes(k)} onClick={() => toggleIn('finish', k)}>{l}</Chip>)}
          </div>
          <p className="text-[12px] mt-2" style={{ color: 'var(--ink-600)' }}>Shows listings whose title says so.</p>
        </div>
      )}
      {arts.length > 0 && (
        <div>
          <SectionLabel>Special art</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {arts.map(([k, l]) => <Chip key={k} on={(filters.art || []).includes(k)} onClick={() => toggleIn('art', k)}>{l}</Chip>)}
          </div>
        </div>
      )}
      {!filters.game && <p className="text-[13px]" style={{ color: 'var(--ink-600)' }}>Pick a game for foil and special-art filters.</p>}
      {filters.graded === 'raw' && more.conditions?.length > 0 && (
        <div>
          <SectionLabel>Card condition</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {more.conditions.map((c) => <Chip key={c.key} on={(filters.cond || []).includes(c.key)} onClick={() => toggleIn('cond', c.key)}>{c.label}</Chip>)}
          </div>
          <p className="text-[12px] mt-2" style={{ color: 'var(--ink-600)' }}>{more.conditionNote || 'Hides listings with no condition stated'}</p>
        </div>
      )}
      <div>
        <SectionLabel>Promo cards</SectionLabel>
        <SegmentedGroup value={filters.promos || 'show'} onChange={(v) => setFilter('promos', v)}
                        options={more.promos || [['show', 'Show'], ['hide', 'Hide'], ['only', 'Only promos']]} />
      </div>
      <ShippingFilters filters={filters} setFilter={setFilter} />
    </>
  );
}

/* ── edit a saved search (?editSearch=<id>), same as sports ──────────── */

function EditPanel({ meta, query, setQuery, filters, setFilter, editingSearch, onSubmit, onCancel }) {
  return (
    <section className="relative max-w-[1100px] mx-auto px-6 lg:px-10 pt-12 lg:pt-16 pb-16">
      <div className="flex items-center justify-between mb-9">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)]">
          <span className="inline-block w-6 h-px bg-[var(--gold)] align-middle mr-3 -translate-y-[2px]" />
          Editing · <span className="normal-case tracking-normal italic font-display text-[var(--ink-100)] ml-1">{editingSearch?.name}</span>
        </p>
        <button onClick={onCancel} className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)] hover:text-[var(--gold)] transition-colors">
          Cancel
        </button>
      </div>
      <div className="mb-12 rise">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-400)] mb-3">Searching for</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          placeholder="Any card"
          className="w-full font-display text-4xl md:text-5xl bg-transparent border-b border-[var(--line)] focus:border-[var(--gold)] outline-none text-[var(--ink-100)] italic pb-2 transition-colors"
        />
      </div>
      <div className="mb-12 rise" style={{ animationDelay: '120ms' }}>
        <FilterControls meta={meta} filters={filters} setFilter={setFilter} />
      </div>
      <div className="flex justify-between items-center rise" style={{ animationDelay: '220ms' }}>
        <span className="text-[11px] text-[var(--ink-600)]">All filters apply together</span>
        <button onClick={onSubmit} className="group inline-flex items-center gap-3 px-9 py-4 transition-all text-sm font-semibold tracking-[0.12em] uppercase"
                style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
          Update search criteria
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </button>
      </div>
    </section>
  );
}
