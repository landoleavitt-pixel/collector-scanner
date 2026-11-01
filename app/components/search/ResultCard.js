'use client';

// Search result row and its badge, shared by Fields & Floors and Foils &
// Fables. Gold accents come from the side's tokens.

import { ArrowUpRight, ImageOff } from 'lucide-react';
import BidCountdown from '../BidCountdown';
import { WatchStar } from './WatchStar';

/* Upscale eBay thumbnail URLs from the small default (~225px) to a sharper 640px
   version. eBay encodes the size as `s-l\d+` in the filename; we just swap it.
   Safe no-op for non-eBay URLs or missing/empty inputs. */
export function upscaleEbayImage(url) {
  if (!url) return url;
  return url.replace(/\/s-l\d+\.(\w+)/, '/s-l640.$1');
}

export function CornerMarks() {
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

/* One search result row (phone list row, desktop three columns). Each side
   passes its own badges, row tint and watchlist payload. Tapping opens the
   card popup; with unapplied filter changes it asks to search again first. */
export function ResultCard({ item, formatPrice, index, hasPendingFilters, onPendingClick, onCardClick, payload, rowStyle = null, badges = null, hasBadges = false }) {
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
      style={rowStyle ? {
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        ...rowStyle,
      } : { animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* MOBILE (<lg) — compact list row: thumbnail left, badges pinned at bottom. */}
      <div className="lg:hidden flex gap-4 py-5 pl-4 pr-3">
        <div
          data-listing-id={item.id}
          className="ff-sheen-wrap relative w-[92px] flex-none aspect-[3/4] bg-[var(--bg-elev)] overflow-hidden"
          onTouchStart={(e) => { e.currentTarget.classList.remove('ff-play'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('ff-play'); }}
        >
          <WatchStar item={item} payload={payload} />
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
            {badges}
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
            {badges}
            {!hasBadges && item.condition && (
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
            <WatchStar item={item} payload={payload} />
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

export function Badge({ children, mono, subtle, auction, tier }) {
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
