'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// Print run tiers — grouped visually by rarity.
// Collectors mentally bucket these by tier, so we present them that way.
const PRINT_RUN_TIERS = [
  { label: 'The Grail', runs: ['/1', '/5', '/10', '/15', '/25'] },
  { label: 'Ultra Rare', runs: ['/49', '/50', '/75', '/99'] },
  { label: 'Rare',       runs: ['/149', '/150', '/199', '/249'] },
  { label: 'Scarce',     runs: ['/299', '/499', '/999'] },
];

const SUGGESTED_SEARCHES = [
  'Patrick Mahomes auto',
  'Luka Doncic prizm',
  '1986 Fleer Jordan',
  'Ja Morant /25',
  'Trout rookie psa',
  'Acuna refractor',
  'Caitlin Clark numbered',
  'Lebron rookie auto',
];

// Editorial taglines that rotate during loading
const SCANNING_PHRASES = [
  'Scanning the marketplace',
  'Sifting the rare',
  'Hunting print runs',
  'Surfacing finds',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [scanIdx, setScanIdx] = useState(0);

  const [filters, setFilters] = useState({
    autoCards: false,
    numberedCards: false,
    numberedLimit: '/50',
    rookieCards: false,
    listingType: 'any', // 'any' | 'buyItNow' | 'auction'
    priceMin: 0,
    priceMax: 1000,
    sortBy: 'price-low',
  });

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

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  async function handleSearch(overrideQuery) {
    const q = (overrideQuery ?? query).trim();
    if (!q) {
      setError('Enter a card name to begin.');
      return;
    }
    if (overrideQuery) setQuery(overrideQuery);
    setError(null);
    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: q,
          autoCards: filters.autoCards,
          numberedCards: filters.numberedCards,
          numberedLimit: filters.numberedLimit,
          rookieCards: filters.rookieCards,
          listingType: filters.listingType,
          priceMin: filters.priceMin,
          priceMax: filters.priceMax === 5000 ? null : filters.priceMax,
          sortBy: filters.sortBy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed.');
        setResults([]);
      } else {
        setResults(data.items || []);
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

  return (
    <main className="relative min-h-screen z-10">
      <Header />

      <Hero
        query={query}
        setQuery={setQuery}
        onSearch={() => handleSearch()}
        error={error}
        loading={loading}
        onSuggested={(s) => handleSearch(s)}
      />

      <section className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-x-16 gap-y-10">
          <Filters filters={filters} setFilter={setFilter} />
          <Results
            loading={loading}
            hasSearched={hasSearched}
            results={results}
            error={error}
            formatPrice={formatPrice}
            scanPhrase={SCANNING_PHRASES[scanIdx]}
            onSuggested={(s) => handleSearch(s)}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}

/* ─────────────────────────────────────────────
   Header — minimal, editorial wordmark
   ───────────────────────────────────────────── */
function Header() {
  return (
    <header className="relative z-20 border-b border-[var(--line-soft)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Seal />
          <span className="font-display text-xl tracking-tight leading-none">
            Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors{' '}
            <em className="text-[var(--gold)] not-italic">Collectors</em>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-[var(--ink-400)]">
          <span>Issue №&nbsp;001</span>
          <span className="text-[var(--ink-600)]">·</span>
          <span>Est. 2026</span>
        </div>
      </div>
    </header>
  );
}

/* Brand seal — F&F monogram inside concentric circles.
   Used in header + footer. */
function Seal({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-label="Fields & Floors Collectors"
    >
      <circle cx="11" cy="11" r="10" stroke="var(--gold)" strokeWidth="0.8" fill="none" />
      <circle cx="11" cy="11" r="7" stroke="var(--gold)" strokeWidth="0.5" fill="none" opacity="0.55" />
      <text
        x="11"
        y="14.2"
        textAnchor="middle"
        fill="var(--gold)"
        fontSize="7.5"
        fontFamily="Instrument Serif"
        fontStyle="italic"
        letterSpacing="-0.5"
      >
        F&amp;F
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Hero — featured find, oversized type, refined search
   ───────────────────────────────────────────── */
function Hero({ query, setQuery, onSearch, error, loading, onSuggested }) {
  return (
    <section className="relative border-b border-[var(--line-soft)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-20 pb-16 lg:pt-28 lg:pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 items-end">
          {/* Left: editorial copy + search */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mb-8 rise" style={{ animationDelay: '0ms' }}>
              <span className="inline-block w-6 h-px bg-[var(--gold)] align-middle mr-3 -translate-y-[2px]" />
              Collect the diamonds in the rough
            </p>
            <h1
              className="font-display text-[clamp(2.75rem,6.5vw,6rem)] leading-[0.95] tracking-[-0.02em] text-balance rise"
              style={{ animationDelay: '100ms' }}
            >
              Numbered.
              <br />
              Autographed.
              <br />
              <em className="text-[var(--gold)]">Parallels.</em>
            </h1>
            <p
              className="mt-8 text-[var(--ink-200)] leading-relaxed max-w-md text-pretty rise"
              style={{ animationDelay: '200ms' }}
            >
              A search instrument for serious collectors. Filter eBay by autograph,
              print run, and price simultaneously — the way the hobby actually thinks.
            </p>

            {/* Refined search bar — thin underline style */}
            <div className="mt-12 rise" style={{ animationDelay: '300ms' }}>
              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)]">
                  Search
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && onSearch()}
                  placeholder="Mahomes auto · 1986 Jordan · Caitlin Clark prizm"
                  disabled={loading}
                  className="w-full pl-20 pr-14 py-5 bg-transparent border-0 border-b border-[var(--line)] text-xl md:text-2xl font-display text-[var(--ink-100)] placeholder:text-[var(--ink-600)] placeholder:font-display placeholder:italic focus:outline-none focus:border-[var(--gold)] transition-colors"
                />
                <button
                  onClick={onSearch}
                  disabled={loading}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--ink-100)] hover:text-[var(--gold)] transition-colors disabled:opacity-30"
                  aria-label="Search"
                >
                  <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              {error && (
                <p className="mt-3 text-xs text-[var(--crit)]">{error}</p>
              )}
            </div>

            {/* Suggested searches */}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 rise" style={{ animationDelay: '400ms' }}>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)]">Try</span>
              {SUGGESTED_SEARCHES.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => onSuggested(s)}
                  className="text-sm text-[var(--ink-200)] hover:text-[var(--gold)] transition-colors border-b border-transparent hover:border-[var(--gold)] pb-0.5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Right: featured find mock */}
          <div className="hidden lg:block rise" style={{ animationDelay: '500ms' }}>
            <FeaturedFind />
          </div>
        </div>
      </div>
    </section>
  );
}

/* The featured-find card in the hero — gives visitors immediate visual proof */
function FeaturedFind() {
  return (
    <figure className="relative">
      {/* "On the block" caption */}
      <figcaption className="absolute -top-6 left-0 text-[10px] uppercase tracking-[0.3em] text-[var(--ink-400)] flex items-center gap-3">
        <span className="w-4 h-px bg-[var(--ink-400)]" />
        Featured find
      </figcaption>

      {/* Card frame */}
      <div className="border border-[var(--line)] bg-[var(--bg-elev)] p-5 relative">
        {/* Decorative corner marks */}
        <CornerMarks />

        {/* Image area */}
        <div className="aspect-[3/4] bg-gradient-to-br from-[var(--bg-elev-2)] via-[#1d180e] to-[#0e0b07] relative overflow-hidden flex items-center justify-center">
          {/* Stylized card silhouette */}
          <svg viewBox="0 0 200 280" className="w-3/4 h-3/4 opacity-90">
            <defs>
              <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c9954a" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#e6b96b" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#8f6a32" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="180" height="260" fill="url(#cardGrad)" stroke="var(--gold)" strokeWidth="0.5" />
            <rect x="22" y="22" width="156" height="180" fill="none" stroke="var(--gold-deep)" strokeWidth="0.4" />
            <text x="100" y="240" textAnchor="middle" fill="var(--gold)" fontSize="11" fontFamily="Instrument Serif" fontStyle="italic">refractor</text>
            <text x="100" y="256" textAnchor="middle" fill="var(--gold-deep)" fontSize="8" fontFamily="Geist Mono" letterSpacing="0.2em">/&#8202;25</text>
          </svg>
          {/* Auction tag */}
          <span className="absolute top-3 left-3 text-[9px] uppercase tracking-[0.2em] text-[var(--gold)] bg-[var(--bg-base)]/80 backdrop-blur-sm px-2 py-1 border border-[var(--gold-deep)]/40">
            Live · 4 bids
          </span>
        </div>

        {/* Metadata */}
        <div className="mt-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base leading-snug text-[var(--ink-100)]">
                2023 Prizm Patrick Mahomes Gold Refractor Auto
              </h3>
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--ink-400)] mt-1">PSA 10 · Numbered /25</p>
            </div>
          </div>
          <div className="flex items-end justify-between pt-2 border-t border-[var(--line-soft)]">
            <div className="flex gap-1.5">
              <Badge>AUTO</Badge>
              <Badge mono>/25</Badge>
              <Badge>PSA 10</Badge>
            </div>
            <span className="font-display text-2xl text-[var(--gold)] leading-none">$4,250</span>
          </div>
        </div>
      </div>
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
   Filter rail — elevated, instrument-like
   ───────────────────────────────────────────── */
function Filters({ filters, setFilter }) {
  return (
    <aside className="space-y-10">
      <FilterSectionHeader label="Filters" number="01" />

      {/* Card type */}
      <div>
        <FilterLabel>Type</FilterLabel>
        <div className="space-y-3">
          <ToggleRow
            label="Autographed"
            mark="AUTO"
            markWide
            checked={filters.autoCards}
            onChange={(v) => setFilter('autoCards', v)}
          />
          <ToggleRow
            label="Rookie card"
            mark="RC"
            checked={filters.rookieCards}
            onChange={(v) => setFilter('rookieCards', v)}
          />
          <ToggleRow
            label="Numbered"
            mark="№"
            checked={filters.numberedCards}
            onChange={(v) => setFilter('numberedCards', v)}
          />
        </div>

        {filters.numberedCards && (
          <div className="mt-5 pl-1 rise" style={{ animationDuration: '0.4s' }}>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)] mb-3">
              Print run ≤
            </p>

            {/* Tier-grouped print run buttons */}
            <div className="space-y-3">
              {PRINT_RUN_TIERS.map((tier) => (
                <div key={tier.label}>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-600)] mb-1.5">
                    {tier.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tier.runs.map((n) => {
                      const active = filters.numberedLimit === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setFilter('numberedLimit', n)}
                          className={`relative px-2.5 py-1.5 font-mono text-[11px] transition-all min-w-[44px] ${
                            active
                              ? 'text-[var(--gold)] bg-[var(--gold)]/[0.07]'
                              : 'text-[var(--ink-400)] hover:text-[var(--ink-100)]'
                          }`}
                        >
                          <span>{n}</span>
                          {active && (
                            <span className="absolute bottom-0 left-2 right-2 h-px bg-[var(--gold)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom print run input */}
            <div className="mt-5 pt-4 border-t border-[var(--line-soft)]">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-600)] mb-2">
                Custom ≤
              </p>
              <CustomPrintRunInput
                value={filters.numberedLimit}
                onApply={(val) => setFilter('numberedLimit', val)}
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
    </aside>
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

/* Custom print run input — for oddballs like /73, /88, /42 that aren't in the preset tiers.
   Validates a number, prefixes with "/" and applies as the active print run filter. */
function CustomPrintRunInput({ value, onApply }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  function handleApply() {
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
    onApply('/' + num);
  }

  // Show the current filter value in the input if it doesn't match any preset.
  const presetSet = new Set(PRINT_RUN_TIERS.flatMap((t) => t.runs));
  const isCustomActive = value && !presetSet.has(value);

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
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={isCustomActive ? value.replace('/', '') : 'e.g. 73'}
          className="flex-1 min-w-0 bg-transparent border-b border-[var(--line)] focus:border-[var(--gold)] outline-none font-mono text-[11px] py-1 text-[var(--ink-100)] placeholder:text-[var(--ink-600)] transition-colors"
        />
        <button
          onClick={handleApply}
          disabled={!val.trim()}
          className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)] disabled:text-[var(--ink-600)] disabled:cursor-not-allowed hover:text-[var(--gold-bright)] transition-colors"
        >
          Apply
        </button>
      </div>
      {isCustomActive && (
        <p className="text-[10px] text-[var(--gold)] mt-1.5 font-mono">
          Active: {value}
        </p>
      )}
      {err && <p className="text-[10px] text-[#d4684a] mt-1.5">{err}</p>}
    </div>
  );
}

function ToggleRow({ label, mark, markWide, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="group flex items-center justify-between w-full py-1 text-left"
    >
      <span className="flex items-center gap-5">
        <span
          className={`font-mono text-[10px] h-6 flex items-center justify-center border transition-all tracking-wider ${
            markWide ? 'w-12' : 'w-6'
          } ${
            checked
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/[0.06]'
              : 'border-[var(--line)] text-[var(--ink-600)] group-hover:border-[var(--ink-400)] group-hover:text-[var(--ink-400)]'
          }`}
        >
          {mark}
        </span>
        <span
          className={`text-sm transition-colors ${
            checked ? 'text-[var(--ink-100)]' : 'text-[var(--ink-200)] group-hover:text-[var(--ink-100)]'
          }`}
        >
          {label}
        </span>
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
function Results({ loading, hasSearched, results, error, formatPrice, scanPhrase, onSuggested }) {
  if (loading) return <LoadingState phrase={scanPhrase} />;
  if (!hasSearched) return <ResolveState onSuggested={onSuggested} />;
  if (!loading && hasSearched && results.length === 0 && !error)
    return <NoResultsState onSuggested={onSuggested} />;

  return (
    <div>
      <div className="flex items-baseline justify-between pb-4 mb-2 border-b border-[var(--line)]">
        <span className="font-display text-lg">Results</span>
        <span className="font-mono text-[10px] text-[var(--ink-600)] tracking-wider">
          {String(results.length).padStart(2, '0')}
        </span>
      </div>
      <div className="divide-y divide-[var(--line-soft)]">
        {results.map((item, i) => (
          <ResultCard key={item.id} item={item} formatPrice={formatPrice} index={i} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ item, formatPrice, index }) {
  // Heuristic badge detection from title
  const title = (item.title || '').toLowerCase();
  const hasAuto = /\bauto\b|autograph|signed/.test(title);
  const hasRookie = /\brookie/.test(title) || /\brc\b/.test(title) || /\b1st\s+bowman\b/.test(title);
  const numberMatch = title.match(/\b\/(\d{1,4})\b|\b#\d+\/(\d{1,4})\b/);
  const printRun = numberMatch ? numberMatch[1] || numberMatch[2] : null;
  const psaMatch = item.title?.match(/PSA\s*(\d{1,2})/i);
  const bgsMatch = item.title?.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block py-7 first:pt-0 rise"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="grid grid-cols-[120px_1fr_auto] md:grid-cols-[160px_1fr_auto] gap-6 md:gap-8 items-start">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[var(--bg-elev)] overflow-hidden">
          <CornerMarks />
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--ink-600)] font-display text-3xl italic">
              ◇
            </div>
          )}
          {item.isAuction && (
            <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.18em] text-[var(--gold)] bg-[var(--bg-base)]/85 backdrop-blur-sm px-1.5 py-0.5 border border-[var(--gold-deep)]/30">
              Live
            </span>
          )}
        </div>

        {/* Title + metadata */}
        <div className="min-w-0 pt-1">
          <h3 className="font-display text-xl md:text-2xl leading-[1.15] text-[var(--ink-100)] group-hover:text-[var(--gold-bright)] transition-colors line-clamp-2">
            {item.title}
          </h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {hasAuto && <Badge>AUTO</Badge>}
            {hasRookie && <Badge>RC</Badge>}
            {printRun && <Badge mono>/{printRun}</Badge>}
            {psaMatch && <Badge>PSA {psaMatch[1]}</Badge>}
            {bgsMatch && <Badge>BGS {bgsMatch[1]}</Badge>}
            {!hasAuto && !hasRookie && !printRun && !psaMatch && !bgsMatch && item.condition && (
              <Badge subtle>{item.condition}</Badge>
            )}
          </div>

          {/* Subline */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] uppercase tracking-[0.15em] text-[var(--ink-400)]">
            {item.isAuction && (
              <span>{item.bidCount != null ? `${item.bidCount} bids` : 'Auction'}</span>
            )}
            {item.isBuyItNow && !item.isAuction && <span>Buy now</span>}
            {item.seller && (
              <>
                <span className="text-[var(--ink-600)]">·</span>
                <span className="normal-case tracking-normal">{item.seller}</span>
              </>
            )}
            {item.sellerFeedback != null && (
              <>
                <span className="text-[var(--ink-600)]">·</span>
                <span>{Number(item.sellerFeedback).toFixed(1)}% feedback</span>
              </>
            )}
          </div>
        </div>

        {/* Price + CTA */}
        <div className="text-right pt-1 min-w-[100px]">
          <div className="font-display text-3xl md:text-4xl leading-none text-[var(--ink-100)] group-hover:text-[var(--gold-bright)] transition-colors">
            {formatPrice(item.price)}
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-400)] group-hover:text-[var(--gold)] transition-colors">
            View on eBay
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.6} />
          </div>
        </div>
      </div>
    </a>
  );
}

function Badge({ children, mono, subtle }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] tracking-[0.08em] border ${
        subtle
          ? 'border-[var(--line)] text-[var(--ink-400)]'
          : 'border-[var(--gold-deep)] text-[var(--gold-bright)] bg-[var(--gold)]/[0.04]'
      } ${mono ? 'font-mono uppercase' : 'uppercase'}`}
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

function NoResultsState({ onSuggested }) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pb-4 mb-8 border-b border-[var(--line)]">
        <span className="font-display text-lg">No matches</span>
        <span className="font-mono text-[10px] text-[var(--ink-600)] tracking-wider">00</span>
      </div>
      <p className="font-display italic text-2xl text-[var(--ink-200)] leading-snug text-balance max-w-md">
        Nothing surfaced. Loosen the filters, or try one of these:
      </p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 max-w-md">
        {SUGGESTED_SEARCHES.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => onSuggested(s)}
            className="text-sm text-[var(--ink-200)] hover:text-[var(--gold)] transition-colors border-b border-transparent hover:border-[var(--gold)] pb-0.5"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Footer — structured, editorial
   ───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Seal size={20} />
              <span className="font-display text-lg">
                Fields <em className="text-[var(--gold)] not-italic">&amp;</em> Floors Collectors
              </span>
            </div>
            <p className="text-sm text-[var(--ink-400)] max-w-xs leading-relaxed">
              A search instrument for serious collectors. Built for the hobby, not the algorithm.
            </p>
          </div>
          <div>
            <FilterLabel>Product</FilterLabel>
            <ul className="space-y-2 text-sm text-[var(--ink-200)]">
              <li><span className="hover:text-[var(--gold)] cursor-pointer transition-colors">How it works</span></li>
              <li><span className="hover:text-[var(--gold)] cursor-pointer transition-colors">Filters</span></li>
              <li><span className="hover:text-[var(--gold)] cursor-pointer transition-colors">Alerts <span className="text-[var(--ink-600)] text-[10px] uppercase tracking-wider ml-1">Soon</span></span></li>
            </ul>
          </div>
          <div>
            <FilterLabel>Hobby</FilterLabel>
            <ul className="space-y-2 text-sm text-[var(--ink-200)]">
              <li><span className="hover:text-[var(--gold)] cursor-pointer transition-colors">Reading list</span></li>
              <li><span className="hover:text-[var(--gold)] cursor-pointer transition-colors">Glossary</span></li>
              <li><span className="hover:text-[var(--gold)] cursor-pointer transition-colors">Contact</span></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-8 border-t border-[var(--line-soft)] text-[10px] uppercase tracking-[0.22em] text-[var(--ink-600)]">
          <div className="flex gap-6">
            <span>Est. 2026</span>
            <span>Issue №&nbsp;001</span>
          </div>
          <div className="flex gap-6">
            <span>Data via eBay</span>
            <span>Made for collectors</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
