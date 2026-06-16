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
  const [toast, setToast] = useState(null); // string | null

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
              <WatchlistTile key={l.id} listing={l} onRemove={() => handleRemove(l.listing_id)} onToast={setToast} />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}

// Dismissible confirmation toast — stays until the user closes it.
function Toast({ message, onClose }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[440px] w-[calc(100%-32px)] rounded-xl px-4 py-3.5 flex items-start gap-3"
      style={{
        background: 'var(--bg-elev)',
        border: '0.5px solid var(--gold-deep)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <span className="mt-0.5 text-[13px]" style={{ color: 'var(--gold-bright)' }}>✓</span>
      <p className="flex-1 text-[13px] leading-relaxed" style={{ color: 'var(--ink-200)' }}>{message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="text-[16px] leading-none mt-0.5 transition-colors"
        style={{ color: 'var(--ink-600)' }}
      >
        ×
      </button>
    </div>
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

function WatchlistTile({ listing, onRemove, onToast }) {
  const b = listing.badges || {};
  const isSold = listing.status === 'sold' || listing.status === 'ended';

  const price = listing.price != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(listing.price))
    : '—';

  // Upscale eBay thumbnail
  const img = listing.image_url
    ? listing.image_url.replace(/\/s-l\d+\.(\w+)/, '/s-l640.$1')
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
        {listing.is_auction && !isSold && <BidReminderControl listing={listing} onToast={onToast} />}
      </div>
    </div>
  );
}

// "Set a reminder" button that opens a modal. Once set, the button shows the
// armed state ("Reminder set · $X") and reopens the modal to edit or remove.
function BidReminderControl({ listing, onToast }) {
  const [on, setOn] = useState(!!listing.bid_reminder);
  const [maxPrice, setMaxPrice] = useState(
    listing.reminder_max_price != null ? Number(listing.reminder_max_price) : null
  );
  const [modalOpen, setModalOpen] = useState(false);

  async function patch(next) {
    try {
      await fetch(`/api/watchlist/${encodeURIComponent(listing.listing_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch {
      // optimistic — ignore failures
    }
  }

  function handleSubmit(priceValue) {
    const price = priceValue === '' || priceValue == null ? null : Number(priceValue);
    setOn(true);
    setMaxPrice(price);
    setModalOpen(false);
    patch({ bid_reminder: true, reminder_max_price: price });
    onToast?.(
      price != null
        ? `Reminder set — we'll only email you about this card if the bid is under $${price}.`
        : `Reminder set — we'll email you in this auction's final hours.`
    );
  }

  function handleRemove() {
    setOn(false);
    setMaxPrice(null);
    setModalOpen(false);
    patch({ bid_reminder: false, reminder_max_price: null });
    onToast?.('Reminder removed.');
  }

  const buttonLabel = on
    ? `Reminder set${maxPrice != null ? ` · $${maxPrice}` : ''}`
    : 'Set a reminder';

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid var(--line-soft)' }}>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] transition-colors"
        style={{ color: on ? 'var(--gold-bright)' : 'var(--ink-400)' }}
      >
        <span style={{ fontSize: '12px' }}>{on ? '🔔' : '+'}</span>
        {buttonLabel}
      </button>

      {modalOpen && (
        <BidReminderModal
          listing={listing}
          initialPrice={maxPrice}
          isSet={on}
          onSubmit={handleSubmit}
          onRemove={handleRemove}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// Modal: pick an optional max price, submit to arm the reminder.
function BidReminderModal({ listing, initialPrice, isSet, onSubmit, onRemove, onClose }) {
  const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : '');

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,4,3,0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elev)', border: '0.5px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5">
          <div className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: 'var(--gold)' }}>
            Bid reminder
          </div>
          <h3 className="font-display italic text-[24px] leading-[1.15] mb-2" style={{ color: 'var(--ink-100)' }}>
            What's the most you'd pay?
          </h3>
          <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--ink-400)' }}>
            We'll email you in this auction's final hours — and if you set a price,
            only when the current bid is at or below it. Leave it blank to be
            reminded regardless of price.
          </p>

          <div className="text-[10px] line-clamp-2 mb-4 italic" style={{ color: 'var(--ink-600)' }}>
            {listing.title}
          </div>

          <label className="block text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--ink-400)' }}>
            Notify me only if the bid is at or below
          </label>
          <div className="flex items-center mb-2" style={{ border: '0.5px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <span className="text-[16px] px-3" style={{ color: 'var(--ink-400)' }}>$</span>
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Any amount"
              className="flex-1 bg-transparent text-[16px] py-3 pr-3 outline-none"
              style={{ color: 'var(--ink-100)' }}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(price); }}
            />
          </div>
        </div>

        <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: '0.5px solid var(--line-soft)' }}>
          <button
            onClick={() => onSubmit(price)}
            className="flex-1 text-[11px] uppercase tracking-[0.18em] py-3 rounded-full transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#1a1612' }}
          >
            {isSet ? 'Update reminder' : 'Set reminder'}
          </button>
          {isSet ? (
            <button
              onClick={onRemove}
              className="text-[11px] uppercase tracking-[0.14em] px-4 py-3 transition-colors"
              style={{ color: 'var(--ink-500)' }}
            >
              Remove
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.14em] px-4 py-3 transition-colors"
              style={{ color: 'var(--ink-500)' }}
            >
              Cancel
            </button>
          )}
        </div>

        <p className="px-6 pb-5 text-[10px] leading-relaxed" style={{ color: 'var(--ink-600)' }}>
          This doesn't buy or bid on the card — Fields &amp; Floors only emails you so
          you can decide and bid yourself on eBay. Prices and availability can change.
        </p>
      </div>
    </div>
  );
}
