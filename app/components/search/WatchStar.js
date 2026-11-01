'use client';

// The star on a result (save to watchlist), the sign-up ask when a
// signed-out visitor stars a card, and the "Get an email" alert band under
// results. Shared by Fields & Floors and Foils & Fables; each side passes
// its own watchlist payload and a link back to its search.

import { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Star, X, ArrowRight } from 'lucide-react';
import { useUser } from '../../../lib/useUser';
import { WatchlistContext } from '../../../lib/watchlistContext';
import { PAYMENTS_LIVE } from '../../../lib/payments';
import { isNativeApp } from '../../../lib/native';
import { track } from '../../../lib/track';

// Star toggle that saves/removes a listing from the user's watchlist.
// Lives inside the result card's <a>, so clicks must not trigger the link.
export function WatchStar({ item, payload }) {
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
        body: JSON.stringify(payload),
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
          body: JSON.stringify(payload),
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
      <KeepCardPrompt item={item} payload={payload} onClose={() => setPromptOpen(false)} onSaved={saveNow} />
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
// Set by AlertBand: a link that re-runs the current search on this side.
let lastReturnPath = null;

function resultsReturnPath(fallbackCardId) {
  if (lastReturnPath) return lastReturnPath;
  const home = typeof window !== 'undefined' && window.location.pathname.startsWith('/fables') ? '/fables' : '/';
  return fallbackCardId ? `${home}?card=${encodeURIComponent(fallbackCardId)}` : home;
}

const PENDING_STAR_KEY = 'ffPendingStar';
const PENDING_STAR_TTL = 60 * 60 * 1000; // an hour is plenty for a sign-up round trip

function stashPendingStar(payload) {
  try {
    localStorage.setItem(PENDING_STAR_KEY, JSON.stringify({ at: Date.now(), payload }));
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
export function usePendingStarSave() {
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
function KeepCardPrompt({ item, payload, onClose, onSaved }) {
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
      const { createClient } = await import('../../../lib/supabaseClient');
      const supabase = createClient();
      if (native && provider === 'apple') {
        const { signInWithAppleNative } = await import('../../../lib/native');
        await signInWithAppleNative(supabase);
        track('signed_up', undefined, 'star'); // server only counts brand-new accounts
        await onSaved();
        onClose();
        return;
      }
      stashPendingStar(payload);
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
            onClick={() => stashPendingStar(payload)}
            className={btn}
            style={{ background: 'transparent', color: 'var(--ink-200)', border: '0.5px solid var(--line)' }}
          >
            Use email instead
          </Link>
        </div>
        {error && <p className="mt-3 text-[13px] text-[var(--crit)]">{error}</p>}
        <p className="mt-4 text-[11px] text-center" style={{ color: 'var(--ink-600)' }}>
          Already have an account?{' '}
          <Link href="/login" onClick={() => stashPendingStar(payload)} className="underline underline-offset-2 hover:text-[var(--gold-bright)]">Sign in</Link>
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
export function AlertBand({ query, filters, onAlert, returnPath = null }) {
  const { user } = useUser();
  useEffect(() => {
    if (query) lastReturnPath = returnPath;
  }, [query, returnPath]);
  if (!query) return null;

  const next = returnPath || resultsReturnPath(null);
  const ctaClass = 'inline-flex items-center gap-2 h-11 px-5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90';
  const ctaStyle = { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' };
  return (
    <div
      className="mt-10 rounded-xl px-5 py-5 md:px-6 flex flex-wrap items-center justify-between gap-4"
      style={{ border: '0.5px solid var(--gold-deep)', background: 'var(--ff-band-bg, linear-gradient(90deg, rgba(201,149,74,0.09), transparent))' }}
    >
      <div className="min-w-0 max-w-[520px]">
        <p className="font-display text-[20px] md:text-[22px] leading-snug">
          Get an email when a new <em className="text-[var(--gold-bright)]">{query}</em> card lists.
        </p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-400)' }}>
          We check eBay every hour with these filters. {PAYMENTS_LIVE ? 'Your first alert is free.' : 'Alerts are free during early access.'}
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
