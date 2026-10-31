'use client';

// Foils & Fables: home (signed out / signed in) and results with filters.
// Same skeleton as Fields & Floors (search first, rarest first, rows with
// tier chips, star to watch, save a search for alerts); Night foil look comes
// from the [data-side="fables"] tokens in globals.css.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, Star, Bell, ListFilter, SlidersHorizontal, X, ImageOff, Clock, Crosshair, Bookmark } from 'lucide-react';
import { useUser } from '../../lib/useUser';
import { PAYMENTS_LIVE } from '../../lib/payments';
import SignupPromptCard from '../components/SignupPromptCard';
import { SIDE, fetchMeta, searchCards, toParams, fromParams, LANG_LABEL, serialOf, gradeText } from './data';

const DEFAULT_FILTERS = { game: '', rarity: [], lang: [], graded: 'any', grader: '', grade: '', firstEd: false, serialOnly: false, priceMin: 0, priceMax: 100000, sort: 'rarest' };
const RECENTS_KEY = 'ffFablesRecents';
const HUNTS = [
  ['Special Illustration Rares', { game: 'pokemon', rarity: ['sir'] }],
  ['1st Edition, graded', { firstEd: true, graded: 'graded' }],
  ['Serialized Magic', { game: 'mtg', serialOnly: true }],
  ['Enchanted Lorcana', { game: 'lorcana', rarity: ['enchanted'] }],
  ['PSA 10s', { graded: 'graded', grader: 'PSA', grade: '10' }],
];

// Tier chip colours for this side. Names on chips are the card's own printed
// rarity, so no tier names are shown (those are still placeholders).
const TIER_STYLE = {
  grail: { background: 'var(--foil)', color: '#0b0f1a' },
  ultra: { background: 'linear-gradient(180deg,#c9d3f5,#8b97c7)', color: '#0b0f1a' },
  rare: { background: 'linear-gradient(180deg,#9fe3f5,#4b98ad)', color: '#071018' },
  scarce: { background: 'linear-gradient(180deg,#7a8199,#4a5068)', color: '#eef0f7' },
};

function getRecents() { try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; } }
function addRecent(q) {
  if (!q) return;
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify([q, ...getRecents().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6))); } catch {}
}
const money = (v, c = 'USD') => (v == null ? '' : `${c === 'USD' ? '$' : ''}${Number(v).toLocaleString('en-US', { maximumFractionDigits: v < 100 ? 2 : 0 })}${c !== 'USD' ? ` ${c}` : ''}`);
function timeLeft(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now(); if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3600e3), d = Math.floor(h / 24);
  return d >= 1 ? `${d}d ${h % 24}h` : `${h}h ${Math.floor((ms % 3600e3) / 60000)}m`;
}

export default function FablesHome() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const [meta, setMeta] = useState(null);
  const initial = useMemo(() => fromParams(sp), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [query, setQuery] = useState(initial.q);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initial.filters });
  const [stage, setStage] = useState([...sp.keys()].some((k) => k !== 'card') ? 'results' : 'idle');
  const cardId = sp.get('card');
  const [res, setRes] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchMeta().then(setMeta); }, []);

  const run = useCallback(async (q, f) => {
    setLoading(true); setStage('results');
    addRecent(q);
    router.replace(`/fables?${toParams(q, f)}`, { scroll: false });
    const r = await searchCards(q, f);
    setRes(r); setLoading(false);
    window.scrollTo({ top: 0 });
  }, [router]);

  const more = useCallback(async () => {
    if (res.nextOffset == null) return;
    const r = await searchCards(query, filters, res.nextOffset);
    setRes((prev) => ({ ...r, items: [...prev.items, ...r.items], total: r.total ?? prev.total }));
  }, [res.nextOffset, query, filters]);

  // Deep link (?q=… or ?game=…) runs on arrival.
  useEffect(() => { if (stage === 'results') run(query, filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (q = query, f = filters) => {
    if (!q.trim() && JSON.stringify(f) === JSON.stringify(DEFAULT_FILTERS)) return;
    setQuery(q); setFilters(f); run(q.trim(), f);
  };
  const newSearch = () => { setStage('idle'); setQuery(''); setFilters(DEFAULT_FILTERS); setRes({ items: [], total: 0 }); router.replace('/fables', { scroll: false }); };

  if (stage === 'results') {
    return (
      <Results
        meta={meta} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters}
        res={res} loading={loading} onSearch={submit} onNewSearch={newSearch} user={user} onMore={more}
      />
    );
  }
  return (
    <main>
      {cardId && <AlertCard id={cardId} />}
      {!userLoading && user
        ? <SignedIn query={query} setQuery={setQuery} onSearch={submit} />
        : <SignedOut query={query} setQuery={setQuery} onSearch={submit} />}
    </main>
  );
}

/* ── shared bits ─────────────────────────────────────────────────────── */

function SearchBar({ query, setQuery, onSubmit, big = false }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex items-center gap-2.5 rounded-xl pl-4 pr-1.5 py-1.5 ff-foil-edge">
      <Search className="w-[18px] h-[18px] flex-none" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />
      <input
        value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a card, character or set" aria-label="Search a card, character or set"
        className={`flex-1 min-w-0 bg-transparent outline-none ${big ? 'text-[17px] py-3' : 'text-[16px] py-2.5'}`} style={{ color: 'var(--ink-100)' }}
      />
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-3.5 h-11 text-[13px] font-semibold flex-none" style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
        Show cards <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </form>
  );
}

export function TcgChip({ item }) {
  const of = serialOf(item);
  if (of) return <span className="font-mono text-[11px] font-bold px-1.5 py-[2px] rounded" style={TIER_STYLE.grail}>/{of}</span>;
  if (!item.rarity) return null;
  return (
    <span className="inline-block max-w-full truncate align-middle text-[11px] font-semibold px-1.5 py-[2px] rounded whitespace-nowrap" style={TIER_STYLE[item.tier] || { color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
      {item.rarity}
    </span>
  );
}

function Tag({ children }) {
  return <span className="text-[11px] px-1.5 py-[2px] rounded whitespace-nowrap" style={{ color: 'var(--gold-bright)', border: '0.5px solid var(--gold-deep)' }}>{children}</span>;
}

function CardImage({ src, alt, className = '' }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={`block aspect-[3/4] rounded overflow-hidden ${className}`} style={{ background: 'var(--bg-elev-2)' }}>
      {src && !bad
        ? <img src={src.replace(/\/s-l\d+\.(\w+)/, '/s-l500.$1')} alt={alt} className="w-full h-full object-cover" loading="lazy" onError={() => setBad(true)} />
        : <span className="w-full h-full grid place-items-center" style={{ color: 'var(--ink-600)' }}><ImageOff className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" /></span>}
    </span>
  );
}

function useStar(item) {
  const { user } = useUser();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = async (e) => {
    e?.preventDefault(); e?.stopPropagation();
    if (!user) { window.location.assign('/signup?src=star&next=/fables'); return; }
    if (saved || busy) return;
    setBusy(true);
    const r = await fetch('/api/watchlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: item.id, title: item.title, price: item.price, currency: item.currency,
        image_url: item.image, listing_url: item.url, is_auction: (item.buyingOptions || []).includes('AUCTION'),
        end_time: item.endTime, bid_count: item.bidCount,
        badges: { game: item.game, rarity: item.rarity, tier: item.tier, serial: serialOf(item), grade: gradeText(item), language: LANG_LABEL[item.language] || item.language || null, firstEdition: item.firstEdition },
        side: SIDE,
      }),
    }).catch(() => null);
    setBusy(false);
    if (r && r.ok) setSaved(true);
  };
  return { saved, busy, toggle };
}

/* ── signed-out home ─────────────────────────────────────────────────── */

function SignedOut({ query, setQuery, onSearch }) {
  return (
    <>
      <section className="max-w-[1100px] mx-auto px-6 lg:px-10 pt-10 md:pt-16 pb-8 grid md:grid-cols-[1.1fr_.9fr] gap-8 md:gap-10 items-center">
        <div className="min-w-0">
          <h1 className="font-display text-[44px] md:text-[64px] leading-[0.98] tracking-[-0.01em] mb-2">
            Chase the <em className="ff-foil-text not-italic md:italic">shine</em>.
          </h1>
          <p className="font-display italic text-[18px] mb-4" style={{ color: 'var(--gold)' }}>Just try it.</p>
          <SearchBar query={query} setQuery={setQuery} onSubmit={() => onSearch()} big />
          <div className="flex flex-wrap gap-2 mt-3">
            {HUNTS.map(([label, f]) => (
              <button key={label} type="button" onClick={() => onSearch('', { ...DEFAULT_FILTERS, ...f })}
                      className="text-[13px] rounded-full px-3 py-1.5" style={{ color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-[12px] mt-3" style={{ color: 'var(--ink-600)' }}>Ranked by the rarity printed on the card. Not affiliated with eBay or any game publisher.</p>
        </div>
        <div className="min-w-0"><RarestStrip compact /></div>
      </section>
      <section className="max-w-[1100px] mx-auto px-6 lg:px-10 pt-6 pb-4">
        <h2 className="sr-only">How it works</h2>
        <ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-3 border-y" style={{ borderColor: 'var(--line)' }}>
          {[[ListFilter, 'Pick a game and rarity'], [Star, 'Star cards'], [Bell, 'Get alerted']].map(([Icon, label], i) => (
            <li key={label} className={`flex items-center gap-3 py-4 md:py-5 md:px-5 text-[16px] font-medium ${i ? 'border-t md:border-t-0 md:border-l' : ''}`} style={{ borderColor: 'var(--line-soft)' }}>
              <Icon className="w-[22px] h-[22px] flex-none" strokeWidth={1.75} style={{ color: 'var(--gold-bright)' }} aria-hidden="true" />{label}
            </li>
          ))}
        </ul>
        {!PAYMENTS_LIVE && <p className="text-center text-[15px] mt-8" style={{ color: 'var(--ink-200)' }}>Free during early access. Alerts on up to 5 saved searches.</p>}
      </section>
    </>
  );
}

/* ── signed-in home ──────────────────────────────────────────────────── */

function SignedIn({ query, setQuery, onSearch }) {
  const [saved, setSaved] = useState([]);
  const [recents, setRecents] = useState([]);
  useEffect(() => {
    setRecents(getRecents());
    fetch('/api/saved-searches').then((r) => (r.ok ? r.json() : null)).then((d) => {
      setSaved((d?.searches || []).filter((s) => s.side === SIDE).slice(0, 4));
    }).catch(() => {});
  }, []);
  return (
    <section className="max-w-[1040px] mx-auto px-5 md:px-6 lg:px-10 pt-8 md:pt-12 pb-16">
      <SearchBar query={query} setQuery={setQuery} onSubmit={() => onSearch()} />
      {(saved.length > 0 || recents.length > 0) && (
        <div className="flex gap-2 mt-3 overflow-x-auto md:flex-wrap pb-1">
          {saved.map((s) => (
            <button key={s.id} type="button" onClick={() => onSearch(s.query || '', { ...DEFAULT_FILTERS, ...(s.filters || {}) })}
                    className="flex-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap" style={{ color: 'var(--ink-200)', border: '1px solid var(--gold-deep)' }}>
              <Crosshair className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: 'var(--gold)' }} aria-hidden="true" />{s.name}
            </button>
          ))}
          {recents.map((r) => (
            <button key={r} type="button" onClick={() => onSearch(r, DEFAULT_FILTERS)}
                    className="flex-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap" style={{ color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
              <Clock className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />{r}
            </button>
          ))}
        </div>
      )}
      <div className="mt-9"><RarestStrip /></div>
    </section>
  );
}

/* ── rarest right now ────────────────────────────────────────────────── */

function RarestStrip({ compact = false }) {
  const [items, setItems] = useState(null);
  // A $100 floor keeps the showcase to real chase cards, not $1 prize-card listings.
  useEffect(() => { searchCards('', { ...DEFAULT_FILTERS, priceMin: 100 }).then((r) => setItems(r.items.slice(0, compact ? 4 : 5))); }, [compact]);
  if (items && !items.length) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display italic text-[22px]">{compact ? <>Rarest <span className="ff-foil-text">right now</span></> : 'Rarest right now'}</h2>
        <span className="text-[13px]" style={{ color: 'var(--ink-400)' }}>Live on eBay</span>
      </div>
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-5'}`}>
        {(items || Array.from({ length: compact ? 4 : 5 }, () => null)).map((it, i) => (
          <a key={it?.id || i} href={it?.url || undefined} target="_blank" rel="noopener noreferrer" className="block min-w-0 rounded-lg p-2" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line-soft)' }}>
            <CardImage src={it?.image} alt={it?.title || ''} className="mb-2" />
            <span className="block text-[12px] leading-snug h-[32px] overflow-hidden" style={{ color: 'var(--ink-200)' }}>{it?.title}</span>
            <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-1.5 min-w-0">
              {it ? <TcgChip item={it} /> : <span />}
              <span className="text-[14px] font-medium">{it ? money(it.price, it.currency) : ''}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── results ─────────────────────────────────────────────────────────── */

function Results({ meta, query, setQuery, filters, setFilters, res, loading, onSearch, onNewSearch, user, onMore }) {
  const [drawer, setDrawer] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, ...(k === 'game' ? { rarity: [] } : {}) }));
  const apply = (f = filters) => { setDrawer(false); onSearch(query, f); };
  const gameLabel = meta?.games?.find((g) => g.key === filters.game)?.label;

  async function saveSearch() {
    if (!user) { window.location.assign('/signup?src=alert&next=/fables'); return; }
    const name = [query, gameLabel].filter(Boolean).join(' · ') || 'Saved search';
    const r = await fetch('/api/saved-searches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, query: query || gameLabel || '', filters, notify_enabled: true, side: SIDE }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setSaveMsg(r && r.ok ? (d.watchLimited ? 'Saved. Alerts are full; pause one to watch this.' : 'Saved. We’ll email you new matches.') : (d.error || 'Couldn’t save. Try again.'));
  }

  return (
    <main className="max-w-[1200px] mx-auto px-5 md:px-6 lg:px-10 pt-6 md:pt-10 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 mb-6 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] mb-2" style={{ color: 'var(--ink-400)' }}>Searching for</p>
          <h1 className="font-display italic text-[30px] md:text-[40px] leading-tight truncate">{query || gameLabel || 'All games'}</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--ink-400)' }}>
            {loading ? 'Searching eBay…' : `${res.total} listings, ranked by the rarity printed on the card`}{res.stub ? ' (sample data)' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" onClick={saveSearch} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.16em]" style={{ border: '0.5px solid var(--gold)', color: 'var(--gold)' }}>
            <Bookmark className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />Save this search
          </button>
          <button type="button" onClick={onNewSearch} className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink-400)' }}>New search</button>
        </div>
        {saveMsg && <p className="w-full text-[13px]" style={{ color: 'var(--gold-bright)' }}>{saveMsg}</p>}
      </div>

      <div className="lg:hidden mb-4">
        <button type="button" onClick={() => setDrawer((v) => !v)} className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3 text-[12px] uppercase tracking-[0.14em]" style={{ border: '1px solid var(--line)', color: 'var(--ink-200)' }}>
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />{drawer ? 'Hide filters' : 'Filters'}
        </button>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className={`${drawer ? 'block' : 'hidden'} lg:block`}>
          <FilterPanel meta={meta} filters={filters} set={set} onApply={() => apply()} />
        </aside>
        <section>
          <div className="flex justify-end mb-2">
            <select value={filters.sort} onChange={(e) => { const f = { ...filters, sort: e.target.value }; setFilters(f); apply(f); }}
                    aria-label="Sort" className="bg-transparent text-[13px] rounded-lg px-3 py-2" style={{ border: '1px solid var(--line)', color: 'var(--ink-200)' }}>
              <option value="rarest">Rarest first</option><option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option><option value="ending">Ending soonest</option><option value="newest">Newly listed</option>
            </select>
          </div>
          {res.error && <p className="text-[14px] py-6" style={{ color: 'var(--crit)' }}>{res.error}</p>}
          {loading && <div className="py-16 text-center font-display italic text-[24px]" style={{ color: 'var(--ink-200)' }}>Searching eBay…</div>}
          {!loading && !res.error && res.items.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-display italic text-[24px]">No matches</p>
              <p className="text-[14px] mt-2" style={{ color: 'var(--ink-400)' }}>Try fewer filters or another spelling.</p>
            </div>
          )}
          {!loading && (
            <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
              {res.items.flatMap((it, i) => {
                const row = <ResultRow key={it.id} item={it} />;
                return i === 3 ? [row, <SignupPromptCard key="signup-prompt" />] : [row];
              })}
            </div>
          )}
          {!loading && res.nextOffset != null && (
            <div className="pt-8 flex flex-col items-center gap-3">
              <span className="text-[12px]" style={{ color: 'var(--ink-600)' }}>Showing {res.items.length} of {res.total}</span>
              <button type="button" onClick={onMore} className="rounded-full px-5 py-2.5 text-[12px] uppercase tracking-[0.14em]" style={{ border: '1px solid var(--line)', color: 'var(--ink-200)' }}>Show more</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ResultRow({ item }) {
  const { saved, busy, toggle } = useStar(item);
  const auction = (item.buyingOptions || []).includes('AUCTION');
  const left = auction ? timeLeft(item.endTime) : null;
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
       className="grid grid-cols-[76px_1fr_auto] md:grid-cols-[96px_1fr_auto] gap-4 items-center py-4 pl-3 relative"
       style={item.tier === 'grail' ? { borderLeft: '2px solid transparent', borderImage: 'var(--foil) 1' } : { borderLeft: '2px solid transparent' }}>
      <span className="relative">
        <CardImage src={item.image} alt={item.title} />
        <button type="button" onClick={toggle} disabled={busy} aria-label={saved ? 'Starred' : 'Star this card'}
                className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full grid place-items-center" style={{ background: 'rgba(8,10,18,0.7)', color: saved ? 'var(--gold-bright)' : 'var(--ink-100)' }}>
          <Star className="w-4 h-4" strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </span>
      <span className="min-w-0">
        <span className="block font-display italic text-[17px] md:text-[19px] leading-snug line-clamp-2">{item.title}</span>
        <span className="flex flex-wrap gap-1.5 mt-2">
          <TcgChip item={item} />
          {item.firstEdition && <Tag>1st Edition</Tag>}
          {item.language && item.language !== 'en' && item.language !== 'English' && <Tag>{LANG_LABEL[item.language] || item.language}</Tag>}
          {item.shadowless && <Tag>Shadowless</Tag>}
          {gradeText(item) && <Tag>{gradeText(item)}</Tag>}
        </span>
        <span className="block text-[12px] mt-1.5" style={{ color: 'var(--ink-400)' }}>
          {auction ? `Auction${item.bidCount != null ? ` · ${item.bidCount} ${item.bidCount === 1 ? 'bid' : 'bids'}` : ''}${left ? ` · ${left}` : ''}` : 'Buy it now'}
        </span>
      </span>
      <span className="text-[18px] md:text-[22px] font-medium text-right pr-1">{money(item.price, item.currency)}</span>
    </a>
  );
}

/* ── filter panel ────────────────────────────────────────────────────── */

function Pill({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
            className="text-[13px] rounded-full px-3 py-1.5 whitespace-nowrap"
            style={on ? { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', border: '1px solid var(--gold-bright)' } : { color: 'var(--ink-200)', border: '1px solid var(--line)' }}>
      {children}
    </button>
  );
}
function Group({ label, children }) {
  return (
    <div className="mb-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--ink-400)' }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterPanel({ meta, filters, set, onApply }) {
  if (!meta) return <div className="h-40 rounded-xl shimmer" style={{ background: 'var(--bg-elev)' }} />;
  const ladder = filters.game ? (meta.ladders?.[filters.game] || []) : [];
  const toggleIn = (k, v) => set(k, filters[k].includes(v) ? filters[k].filter((x) => x !== v) : [...filters[k], v]);
  return (
    <div className="rounded-xl p-4 lg:p-0 lg:rounded-none" style={{ background: 'var(--bg-elev)' }}>
      <div className="lg:bg-transparent">
        <Group label="Game">
          <Pill on={!filters.game} onClick={() => set('game', '')}>Any</Pill>
          {meta.games.map((g) => <Pill key={g.key} on={filters.game === g.key} onClick={() => set('game', g.key)}>{g.label}</Pill>)}
        </Group>
        <Group label="Rarity">
          {ladder.length
            ? ladder.map((r) => <Pill key={r.key} on={filters.rarity.includes(r.key)} onClick={() => toggleIn('rarity', r.key)}>{r.label}</Pill>)
            : <span className="text-[13px]" style={{ color: 'var(--ink-600)' }}>Pick a game to filter by its rarities.</span>}
        </Group>
        <Group label="Language">
          <Pill on={!filters.lang.length} onClick={() => set('lang', [])}>All</Pill>
          {(meta.languages || []).map((l) => <Pill key={l.key} on={filters.lang.includes(l.key)} onClick={() => toggleIn('lang', l.key)}>{l.label}</Pill>)}
        </Group>
        <Group label="Condition">
          {[['any', 'Any'], ['graded', 'Graded'], ['raw', 'Raw']].map(([k, l]) => <Pill key={k} on={filters.graded === k} onClick={() => set('graded', k)}>{l}</Pill>)}
        </Group>
        {filters.graded === 'graded' && (
          <>
            <Group label="Grader">
              <Pill on={!filters.grader} onClick={() => set('grader', '')}>Any</Pill>
              {(meta.graders || []).map((g) => <Pill key={g} on={filters.grader === g} onClick={() => set('grader', g)}>{g}</Pill>)}
            </Group>
            <Group label="Grade">
              {[['', 'Any'], ['10', '10'], ['9.5', '9.5+'], ['9', '9+']].map(([k, l]) => <Pill key={l} on={filters.grade === k} onClick={() => set('grade', k)}>{l}</Pill>)}
            </Group>
          </>
        )}
        <Group label="Only">
          <Pill on={filters.firstEd} onClick={() => set('firstEd', !filters.firstEd)}>1st Edition</Pill>
          <Pill on={filters.serialOnly} onClick={() => set('serialOnly', !filters.serialOnly)}>Serial-numbered</Pill>
        </Group>
        <Group label="Price">
          <div className="flex items-center gap-2 w-full">
            {['priceMin', 'priceMax'].map((k) => (
              <input key={k} inputMode="numeric" aria-label={k === 'priceMin' ? 'Minimum price' : 'Maximum price'}
                     placeholder={k === 'priceMin' ? 'Min $' : 'Max $'}
                     value={k === 'priceMax' && filters.priceMax >= 100000 ? '' : (filters[k] || '')}
                     onChange={(e) => set(k, Number(e.target.value.replace(/\D/g, '')) || (k === 'priceMax' ? 100000 : 0))}
                     className="w-full min-w-0 rounded-lg px-3 py-2 text-[14px] bg-transparent outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink-100)' }} />
            ))}
          </div>
        </Group>
        <p className="text-[12px] mb-4" style={{ color: 'var(--ink-600)' }}>Sealed product, lots and proxies are hidden.</p>
        <button type="button" onClick={onApply} className="w-full rounded-lg py-3 text-[12px] uppercase tracking-[0.14em] font-semibold" style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>
          Show cards
        </button>
      </div>
    </div>
  );
}

/* ── alert deep link: /fables?card=<id> ──────────────────────────────── */

function AlertCard({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    fetch(`/api/listing/${encodeURIComponent(id)}`).then((r) => r.json()).then(setD).catch(() => setD({ ok: false }));
  }, [id]);
  if (!d) return <div className="max-w-[1040px] mx-auto px-5 md:px-6 lg:px-10 pt-6"><div className="h-[120px] rounded-xl shimmer" style={{ background: 'var(--bg-elev)' }} /></div>;
  return (
    <section className="max-w-[1040px] mx-auto px-5 md:px-6 lg:px-10 pt-6">
      <div className="rounded-xl p-4 grid grid-cols-[80px_1fr] gap-4 items-center ff-foil-edge">
        <CardImage src={d.images?.[0]} alt={d.title || ''} />
        <div className="min-w-0">
          <p className="text-[12px] mb-1" style={{ color: 'var(--gold)' }}>{d.ok === false ? 'From your alert' : (d.isAuction ? 'From your alert · Auction' : 'From your alert')}</p>
          {d.ok === false || d.expired
            ? <p className="text-[15px]" style={{ color: 'var(--ink-200)' }}>This listing has ended or was removed on eBay.</p>
            : <>
                <p className="font-display italic text-[19px] leading-snug line-clamp-2">{d.title}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[20px] font-medium">{money(d.price, d.currency)}</span>
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] uppercase tracking-[0.12em] font-semibold" style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}>View on eBay <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" /></a>}
                </div>
              </>}
        </div>
      </div>
    </section>
  );
}
