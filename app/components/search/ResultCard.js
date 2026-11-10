'use client';

// Search result row and its badge, shared by Fields & Floors and Foils &
// Fables. Gold accents come from the side's tokens.

import { ImageOff } from 'lucide-react';
import { TimeLeft } from '../BidCountdown';
import { WatchStar } from './WatchStar';

/* Upscale eBay thumbnail URLs from the small default (~225px) to a sharper 640px
   version. eBay encodes the size as `s-l\d+` in the filename; we just swap it.
   Safe no-op for non-eBay URLs or missing/empty inputs. */
export function upscaleEbayImage(url) {
  if (!url) return url;
  return url.replace(/\/s-l\d+\.(\w+)/, '/s-l640.$1');
}

export function CornerMarks() {
  const stroke = 'var(--accent-deep)';
  return (
    <>
      <span className="absolute top-2 left-2 w-2 h-2 border-l border-t" style={{ borderColor: stroke }} />
      <span className="absolute top-2 right-2 w-2 h-2 border-r border-t" style={{ borderColor: stroke }} />
      <span className="absolute bottom-2 left-2 w-2 h-2 border-l border-b" style={{ borderColor: stroke }} />
      <span className="absolute bottom-2 right-2 w-2 h-2 border-r border-b" style={{ borderColor: stroke }} />
    </>
  );
}

/* Listing titles as sellers write them shout ("MIKE TROUT 🔥🔥 INVEST").
   Drop emoji and tone all-caps titles down to title case, keeping short
   codes (PSA, BGS, RC, NBA), print runs (/50, 1/5) and card numbers. */
const KEEP_CAPS = /^(?:[A-Z]{1,3}|PSA|BGS|SGC|CGC|BGS|RPA|SSP|NBA|NFL|MLB|NHL|WNBA|MVP|USA|UFC|WWE|PSA\d+|[A-Z]*\d[\w/#-]*)$/;
export function tidyTitle(title = '') {
  let t = String(title).replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();
  const letters = t.replace(/[^A-Za-z]/g, '');
  const upper = letters.replace(/[^A-Z]/g, '').length;
  if (letters.length > 8 && upper / letters.length > 0.7) {
    t = t.split(' ').map((w) => (KEEP_CAPS.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
  }
  return t;
}

/* Who's selling: a brand-new seller is called out instead of "0.0%". */
function SellerLine({ item, className = '' }) {
  if (!item.seller && item.sellerFeedback == null) return null;
  const isNew = item.sellerFeedback != null && Number(item.sellerFeedback) === 0;
  if (isNew) return <span className={className} style={{ color: '#d9907c' }}>New seller · no feedback yet</span>;
  return (
    <span className={className}>
      {item.seller}
      {item.sellerFeedback != null && <> · {Number(item.sellerFeedback).toFixed(1).replace(/\.0$/, '')}%</>}
    </span>
  );
}

/* Buy It Now, or an auction's time left (it sits beside the price, so it
   never gets cut off by a small photo). */
function ListingLine({ item, short = false }) {
  if (item.isAuction) {
    return (
      <span style={{ color: '#e6a86b' }}>
        {!short && 'Auction'}{!short && item.endTime ? ' · ' : ''}
        {item.endTime ? <TimeLeft endTime={item.endTime} /> : short ? 'Auction' : ''}
      </span>
    );
  }
  if (item.isBuyItNow) return <span>{short ? 'Buy now' : 'Buy It Now'}</span>;
  return null;
}

/* One search result (a compact list row, or a grid card), shared by Fields &
   Floors and Foils & Fables. Each side passes its own chips and watchlist
   payload. Tapping opens the card popup; with unapplied filter changes it
   asks to search again first.
   cardFrame (Foils & Fables): the photo takes a trading card's 63 × 88 shape
   and `noImage` stands in when there's no photo. */
export function ResultCard({ item, formatPrice, index, hasPendingFilters, onPendingClick, onCardClick, payload, badges = null, cardFrame = false, noImage = null, view = 'list' }) {
  const onClick = (e) => {
    // With unapplied filter changes, ask to search again first.
    if (hasPendingFilters && onPendingClick) {
      e.preventDefault();
      onPendingClick();
      return;
    }
    // Open the in-app card popup (it has its own "View on eBay"); keep
    // cmd/ctrl/middle-click as "open in a new tab".
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    if (onCardClick) {
      e.preventDefault();
      onCardClick(item);
    }
  };
  const title = tidyTitle(item.title);
  const photo = (big) => (
    <div
      data-listing-id={item.id}
      className={`ff-sheen-wrap relative w-full overflow-hidden rounded bg-[var(--bg-elev)] ${cardFrame ? 'aspect-[63/88]' : 'aspect-[3/4]'}`}
      onTouchStart={(e) => { e.currentTarget.classList.remove('ff-play'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('ff-play'); }}
    >
      {/* The save star, smaller on a row's small photo. */}
      <span className={big ? '' : '[&>button]:top-1 [&>button]:right-1 [&>button]:w-7 [&>button]:h-7'}>
        <WatchStar item={item} payload={payload} />
      </span>
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={big ? upscaleEbayImage(item.image) : item.image} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : noImage || (
        <div className="w-full h-full flex items-center justify-center text-[var(--ink-600)]"><ImageOff className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" /></div>
      )}
    </div>
  );

  if (view === 'grid') {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label={title}
         className="group block rise min-w-0" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
        {photo(true)}
        {badges && <div className="flex flex-wrap gap-1.5 mt-3">{badges}</div>}
        <h3 className="text-meta font-medium leading-[1.35] mt-2 line-clamp-2 text-[var(--ink-200)] group-hover:text-[var(--ink-100)]">{title}</h3>
        <div className="flex items-baseline justify-between gap-2 mt-2">
          <span className="font-display text-price leading-none text-[var(--ink-100)]">{formatPrice(item.price)}</span>
          <span className="text-fine whitespace-nowrap text-[var(--ink-400)]"><ListingLine item={item} short /></span>
        </div>
      </a>
    );
  }

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={onClick}
       className="group block rise" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
      <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] sm:grid-cols-[62px_minmax(0,1fr)_auto] gap-3 sm:gap-4 items-center px-1 sm:px-4 py-3 sm:py-3.5 rounded-lg transition-colors group-hover:bg-[var(--bg-elev)]">
        {photo(false)}
        <div className="min-w-0">
          <h3 className="text-body sm:text-body font-medium leading-[1.35] line-clamp-2 text-[var(--ink-100)]">{title}</h3>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-1.5 sm:mt-2 text-fine sm:text-meta text-[var(--ink-400)]">
            {badges}
            <SellerLine item={item} className="hidden sm:inline" />
            {Number(item.sellerFeedback) === 0 && item.sellerFeedback != null && <span className="sm:hidden" style={{ color: '#d9907c' }}>New seller</span>}
          </div>
        </div>
        <div className="text-right min-w-0 sm:min-w-[104px]">
          <div className="font-display text-h3 sm:text-price leading-none text-[var(--ink-100)] whitespace-nowrap">{formatPrice(item.price)}</div>
          <div className="mt-1.5 text-fine sm:text-meta whitespace-nowrap text-[var(--ink-400)]">
            <span className="sm:hidden"><ListingLine item={item} short /></span>
            <span className="hidden sm:inline"><ListingLine item={item} /></span>
          </div>
        </div>
      </div>
    </a>
  );
}

/* A chip on a result: the tier chips say their name and how many were made
   ("Grail · 5 made"); the rest (Autograph, Rookie, PSA 10) are outlined.
   Rounded 4, sentence case, 12px. */
export const TIER_CHIP = {
  grail: { borderColor: '#ffc14d', backgroundImage: 'linear-gradient(180deg, var(--accent-fill-top) 0%, var(--accent-fill-bottom) 100%)' },
  ultra: { borderColor: '#c8d4e0', backgroundImage: 'linear-gradient(180deg, #e0e8f0 0%, #98a5b3 100%)' },
  // Rare and Scarce: lighter than before so the dark label reads (Landon, 2026-11-09).
  rare: { borderColor: '#d6722d', backgroundImage: 'linear-gradient(180deg, #e09356 0%, #c47b40 100%)' },
  scarce: { borderColor: '#7d8997', backgroundImage: 'linear-gradient(180deg, #a4afbb 0%, #7d8997 100%)' },
};
export const TIER_NAMES = { grail: 'Grail', ultra: 'Ultra', rare: 'Rare', scarce: 'Scarce' };
/** "Grail · 5 made" (1 → "Grail · 1 of 1"). */
export function tierChipLabel(tier, run) {
  const n = Number(String(run).replace(/[^\d]/g, ''));
  const made = n === 1 ? '1 of 1' : `${n.toLocaleString('en-US')} made`;
  return TIER_NAMES[tier] ? `${TIER_NAMES[tier]} · ${made}` : made;
}

export function Badge({ children, subtle, auction, tier }) {
  let className;
  let inlineStyle;
  if (auction) {
    className = 'border-[#c97a3a] text-[#e6a86b] bg-[#c97a3a]/[0.10]';
  } else if (TIER_CHIP[tier]) {
    className = 'text-[var(--ink-on-accent)] font-semibold';
    inlineStyle = TIER_CHIP[tier];
  } else if (subtle) {
    className = 'border-[var(--line)] text-[var(--ink-400)]';
  } else {
    // Autograph, Rookie, PSA / BGS / SGC / CGC grades
    className = 'border-[var(--accent-deep)] text-[var(--accent-bright)] bg-[var(--accent)]/[0.06]';
  }
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded text-fine font-medium leading-none whitespace-nowrap border ${className}`} style={inlineStyle}>
      {children}
    </span>
  );
}
