// lib/watchlistContext.js
//
// React Context for the user's watchlist state. Provides:
//   isSaved(id)    → boolean, whether the listing id is in the watchlist
//   markSaved(id)  → optimistic local add (parent commits via API)
//   markUnsaved(id) → optimistic local remove
//
// Provider wraps any page that needs to read/mutate watchlist state
// (Home page, watchlist-cards page). Consumers (WatchStar inside result
// cards, CardModal's Watch button) read via useContext. We extract the
// context AND the provider here so multiple pages can mount it without
// duplication.

'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './useUser';

export const WatchlistContext = createContext(null);

/**
 * Convenience hook. Returns null if the consumer is rendered outside
 * the WatchlistProvider — callers should handle that gracefully (e.g.
 * by not showing the watch button) rather than crashing.
 */
export function useWatchlist() {
  return useContext(WatchlistContext);
}

/**
 * Provider that owns the set of saved listing ids for the current user.
 * Fetches once on mount (and again when the user identity changes).
 * Exposes optimistic local add/remove so UI feels instant; pages that
 * call the API should call markSaved/markUnsaved alongside the fetch
 * and revert on failure.
 */
export function WatchlistProvider({ children }) {
  const { user } = useUser();
  const [savedIds, setSavedIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    fetch('/api/watchlist?status=all')
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((d) => {
        if (cancelled) return;
        setSavedIds(new Set((d.listings || []).map((l) => String(l.listing_id))));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const isSaved = (id) => savedIds.has(String(id));

  const markSaved = (id) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });

  const markUnsaved = (id) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });

  return (
    <WatchlistContext.Provider value={{ isSaved, markSaved, markUnsaved }}>
      {children}
    </WatchlistContext.Provider>
  );
}
