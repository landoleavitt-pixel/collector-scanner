'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../../lib/useUser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function WatchlistCardsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [tab, setTab] = useState('active'); // 'active' | 'sold'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  // Redirect logged-out users
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login?next=/watchlist-cards');
    }
  }, [user, userLoading, router]);

  // Load listings for the current tab
  async function load(currentTab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/watchlist?status=${currentTab}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  // On first load (and when user becomes available): re-check statuses against
  // eBay, then load. The status check only runs once per page open.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        await fetch('/api/watchlist/check', { method: 'POST' });
      } catch {
        // ignore — show snapshots regardless
      }
      if (cancelled) return;
      setChecking(false);
      load(tab);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reload when switching tabs (no re-check needed — already done on open)
  useEffect(() => {
    if (user) load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleRemove(listingId) {
    setListings((prev) => prev.filter((l) => l.listing_id !== listingId));
    try {
      await fetch(`/api/watchlist/${encodeURIComponent(listingId)}`, { method: 'DELETE' });
    } catch {
      // if it fails, a reload will restore it
    }
  }

  if (userLoading || !user) return null;

  return (
    <main className="min-h-[calc(100vh-200px)] py-12 md:py-16">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">

        {/* Page header */}
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: 'var(--ink-500)' }}>
            Your Watchlist
          </div>
          <h1 className="font-display italic text-[36px] md:text-[44px] leading-[1.05] mb-3" style={{ color: 'var(--ink-100)' }}>
            Cards worth keeping.
          </h1>
          <p className="text-sm max-w-md leading-relaxed" style={{ color: 'var(--ink-400)' }}>
            Individual listings you've starred. We check their status against eBay each time you open this page.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-7 border-b mb-8" style={{ borderColor: 'var(--line)' }}>
          {['active', 'sold'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pb-3 text-[11px] uppercase tracking-[0.14em] transition-colors relative"
              style={{ color: tab === t ? 'var(--ink-100)' : 'var(--ink-600)' }}
            >
              {t === 'active' ? 'Active' : 'Sold'}
              {tab === t && (
                <span className="absolute left-0 right-0 -bottom-px h-[1.5px]" style={{ background: 'var(--gold)' }} />
              )}
            </button>
          ))}
          {checking && (
            <span className="ml-auto pb-3 text-[10px] uppercase tracking-[0.14em] self-center" style={{ color: 'var(--ink-600)' }}>
              Checking eBay…
            </span>
          )}
        </div>

        {/* Grid / states */}
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-400)' }}>Loading…</p>
        ) : listings.length === 0 ? (
          <EmptyState tab={tab} onBrowse={() => router.push('/')} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {listings.map((l) => (
              <WatchlistTile key={l.id} listing={l} onRemove={() => handleRemove(l.listing_id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ tab, onBrowse }) {
  return (
    <div className="py-16 text-center">
      <p className="font-display italic text-2xl mb-3" style={{ color: 'var(--ink-200)' }}>
        {tab === 'active' ? 'No cards on your watchlist yet.' : 'Nothing sold yet.'}
      </p>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-400)' }}>
        {tab === 'active'
          ? 'Star a card from any search to keep an eye on it here.'
          : 'When a card you’re watching sells or ends, it moves here.'}
      </p>
      {tab === 'active' && (
        <button
          onClick={onBrowse}
          className="text-[11px] uppercase tracking-[0.2em] px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#1a1614' }}
        >
          Start searching
        </button>
      )}
    </div>
  );
}

function WatchlistTile({ listing, onRemove }) {
  const b = listing.badges || {};
  const isSold = listing.status === 'sold' || listing.status === 'ended';

  const price = listing.price != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(listing.price))
    : '—';

  // Upscale eBay thumbnail
  const img = listing.image_url
    ? listing.image_url.replace(/\/s-l\d+\.(\w+)/, '/s-l500.$1')
    : '';

  const TIER_CHIP = {
    grail:  { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#ffd97a,#d99c14)', border: '0.5px solid #ffc14d', fontWeight: 700 },
    ultra:  { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#e0e8f0,#98a5b3)', border: '0.5px solid #c8d4e0', fontWeight: 700 },
    rare:   { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#d6884a,#8e4f1f)', border: '0.5px solid #d6722d', fontWeight: 700 },
    scarce: { color: '#1a1612', backgroundImage: 'linear-gradient(180deg,#8a96a4,#4a5360)', border: '0.5px solid #5a6470', fontWeight: 600 },
  };
  const outChip = { color: 'var(--gold-bright)', background: 'rgba(201,149,74,0.06)', border: '0.5px solid var(--gold-deep)' };

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line)' }}>
      {/* Image */}
      <div className="relative" style={{ aspectRatio: '3 / 3.4' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={listing.title || ''}
            className="absolute inset-0 w-full h-full object-cover"
            style={isSold ? { filter: 'grayscale(0.7) brightness(0.6)' } : undefined}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--bg-elev-2)', color: 'var(--ink-600)' }}>◇</div>
        )}

        {isSold && (
          <span className="absolute top-2.5 left-2.5 text-[9px] uppercase tracking-[0.12em] px-2 py-1 rounded" style={{ background: 'rgba(180,60,40,0.9)', color: '#fff' }}>
            {listing.status === 'sold' ? 'Sold' : 'Ended'}
          </span>
        )}

        {/* Remove (filled star) */}
        <button
          onClick={onRemove}
          aria-label="Remove from watchlist"
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(10,9,7,0.55)', backdropFilter: 'blur(4px)', border: '0.5px solid var(--gold)', color: 'var(--gold-bright)' }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>★</span>
        </button>
      </div>

      {/* Info strip */}
      <div className="p-3.5" style={{ borderTop: '0.5px solid var(--line-soft)' }}>
        <div className="text-[13px] leading-snug mb-2" style={{ color: 'var(--ink-100)', minHeight: 34 }}>
          {listing.title}
        </div>
        <div className="flex flex-wrap gap-1 mb-2.5">
          {b.printRun && b.tier && (
            <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={TIER_CHIP[b.tier]}>/{b.printRun}</span>
          )}
          {b.auto && <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={outChip}>Auto</span>}
          {b.rookie && <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={outChip}>RC</span>}
          {b.psa && <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={outChip}>PSA {b.psa}</span>}
          {b.bgs && <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={outChip}>BGS {b.bgs}</span>}
          {b.isAuction && <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={{ color: '#e6a86b', background: 'rgba(201,122,58,0.10)', border: '0.5px solid #c97a3a' }}>Auction</span>}
          {!b.isAuction && b.isBuyItNow && <span className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded" style={outChip}>Buy It Now</span>}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-display italic text-[22px]" style={{ color: 'var(--gold)' }}>{price}</span>
          {listing.listing_url && (
            <a
              href={listing.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full transition-colors"
              style={{ border: '0.5px solid rgba(201,149,74,0.5)', color: 'var(--gold)' }}
            >
              View
            </a>
          )}
        </div>

        {/* Bid reminder — only for active auctions */}
        {listing.is_auction && !isSold && <BidReminderControl listing={listing} />}
      </div>
    </div>
  );
}

// Toggle + optional max-price for a "remind me before this auction ends" alert.
function BidReminderControl({ listing }) {
  const [on, setOn] = useState(!!listing.bid_reminder);
  const [maxPrice, setMaxPrice] = useState(
    listing.reminder_max_price != null ? String(listing.reminder_max_price) : ''
  );
  const [saving, setSaving] = useState(false);

  async function patch(next) {
    setSaving(true);
    try {
      await fetch(`/api/watchlist/${encodeURIComponent(listing.listing_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch {
      // ignore — UI stays optimistic
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    const next = !on;
    setOn(next);
    patch({ bid_reminder: next, reminder_max_price: maxPrice === '' ? null : Number(maxPrice) });
  }

  function commitMaxPrice() {
    if (on) patch({ reminder_max_price: maxPrice === '' ? null : Number(maxPrice) });
  }

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid var(--line-soft)' }}>
      <button
        onClick={toggle}
        disabled={saving}
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
        style={{ color: on ? 'var(--gold-bright)' : 'var(--ink-400)' }}
      >
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[10px]"
          style={{
            border: `1px solid ${on ? 'var(--gold)' : 'var(--ink-600)'}`,
            background: on ? 'var(--gold)' : 'transparent',
            color: '#1a1612',
          }}
        >
          {on ? '✓' : ''}
        </span>
        Remind me before it ends
      </button>

      {on && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--ink-600)' }}>
            Only if ≤
          </span>
          <div className="flex items-center" style={{ border: '0.5px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
            <span className="text-[12px] px-1.5" style={{ color: 'var(--ink-400)' }}>$</span>
            <input
              type="number"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={commitMaxPrice}
              placeholder="any"
              className="w-16 bg-transparent text-[12px] py-1 pr-2 outline-none"
              style={{ color: 'var(--ink-100)' }}
            />
          </div>
        </div>
      )}
      <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--ink-600)' }}>
        We'll email you in the auction's final hours{maxPrice && on ? `, only if the bid is at or below $${maxPrice}` : ''}.
      </p>
    </div>
  );
}
