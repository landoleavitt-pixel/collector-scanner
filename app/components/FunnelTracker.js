'use client';

import { useEffect } from 'react';
import { trackOnce, visitSource, isInternal, markInternal } from '../../lib/track';
import { useUser } from '../../lib/useUser';

// Renders nothing. Records one "landed" event per browser tab session, except
// in the owner's and our own browsers (see lib/track.js isInternal).
export default function FunnelTracker() {
  const { user } = useUser();

  useEffect(() => {
    // fieldsandfloors.com/?internal=1 marks this browser as ours for good.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('internal') === '1') {
        markInternal();
        url.searchParams.delete('internal');
        window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
      }
    } catch {}
    trackOnce('landed', 'landed', undefined, visitSource());
  }, []);

  // An admin signing in marks this browser as ours too.
  useEffect(() => {
    if (!user || isInternal()) return;
    fetch('/api/admin/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.admin) markInternal();
    }).catch(() => {});
  }, [user]);

  return null;
}
