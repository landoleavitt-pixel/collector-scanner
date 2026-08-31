'use client';

import { useState, useEffect } from 'react';

/* ImageBlockNotice — explains blank card images instead of leaving alt text.
 *
 * Firefox's Enhanced Tracking Protection has i.ebayimg.com on its blocklist,
 * so every listing photo fails with 0 bytes transferred and the card renders
 * as bare alt text. Nothing about that reads as "your browser did this" — it
 * reads as a broken site.
 *
 * Detection works by listening for image load errors at the document level in
 * the CAPTURE phase. Error events on <img> don't bubble, so a normal listener
 * never sees them; capture does. This means no changes to the img tags
 * themselves and it catches every image anywhere on the page, including ones
 * added later by a search.
 *
 * We require two failures before showing anything, because a single expired
 * listing can legitimately 404 and that isn't worth a banner. Two or more
 * failing from the same CDN is a pattern, not a coincidence.
 */

const DISMISS_KEY = 'ffImageNoticeDismissed';
const FAILURE_THRESHOLD = 2;

export default function ImageBlockNotice() {
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(true); // assume dismissed until read

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    let failures = 0;

    function onError(e) {
      const el = e.target;
      if (!el || el.tagName !== 'IMG') return;
      const src = el.currentSrc || el.src || '';
      if (!src.includes('ebayimg.com')) return;
      failures += 1;
      if (failures >= FAILURE_THRESHOLD) setBlocked(true);
    }

    // Capture phase — img error events do not bubble.
    document.addEventListener('error', onError, true);
    return () => document.removeEventListener('error', onError, true);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* non-fatal */
    }
  }

  if (!blocked || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-[380px] z-50 rounded-lg p-4"
      style={{
        background: 'var(--bg-elev-2)',
        border: '0.5px solid var(--gold-deep)',
        boxShadow: '0 12px 32px -12px rgba(0,0,0,0.7)',
      }}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="font-mono uppercase mb-1.5"
            style={{ fontSize: 9.5, letterSpacing: '0.2em', color: 'var(--gold)' }}
          >
            Card images blocked
          </div>
          <p className="text-[12.5px] leading-relaxed m-0" style={{ color: 'var(--ink-200)' }}>
            Your browser&rsquo;s tracking protection is blocking eBay&rsquo;s image server.
            Click the shield icon in the address bar and turn protection off for this
            site to see the photos.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-none leading-none"
          style={{ color: 'var(--ink-600)', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
