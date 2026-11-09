'use client';

// Renders nothing. Starts PostHog product analytics when NEXT_PUBLIC_POSTHOG_KEY
// is set and the visitor allows it; otherwise does nothing at all (no script,
// no network). See lib/posthog.js for exactly what is and isn't sent.
//   - follows the Usage stats switch, our own-browser flag and Do Not Track
//     (lib/track.js), live: switching off stops it, switching on resumes it
//   - sports vs Foils & Fables pages carry a `side` property
//   - signed-in members are identified by account ID only; sign-out resets

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '../../lib/useUser';
import { STATS_CHANGED_EVENT } from '../../lib/track';
import { posthogConfigured, syncPostHog, capturePageview } from '../../lib/posthog';

export default function PostHogAnalytics() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const side = pathname?.startsWith('/fables') ? 'fables' : 'sports';
  const [rulesChanged, setRulesChanged] = useState(0);
  const lastPath = useRef(null);

  useEffect(() => {
    if (!posthogConfigured()) return undefined;
    const bump = () => setRulesChanged((n) => n + 1);
    window.addEventListener(STATS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(STATS_CHANGED_EVENT, bump);
  }, []);

  useEffect(() => {
    if (!posthogConfigured() || loading) return;
    let live = true;
    syncPostHog({ userId: user?.id || null, side }).then(() => {
      if (!live || lastPath.current === pathname) return;
      lastPath.current = pathname;
      capturePageview(side);
    });
    return () => { live = false; };
  }, [user?.id, loading, side, pathname, rulesChanged]);

  return null;
}
