'use client';

import { useState } from 'react';
import { buildShareUrl } from '../../lib/shareLink';

/**
 * ShareSearchButton — copies (or natively shares) a link that reproduces
 * the current search criteria for whoever receives it.
 *
 * Uses the Web Share API when available (native sheet on iOS/Android, so
 * the user can pick Messages, WhatsApp, etc.) and falls back to clipboard
 * copy on desktop. Both paths end with visible confirmation, because a
 * share button that appears to do nothing is worse than no button.
 */
export default function ShareSearchButton({ query, filters, allPresetRuns = [], className = '' }) {
  const [status, setStatus] = useState('idle'); // idle | copied | shared | error

  async function handleShare() {
    const url = buildShareUrl(query, filters, allPresetRuns);
    const title = query ? `${query} on Fields & Floors` : 'Fields & Floors Collectors';
    const text = query
      ? `Check out this ${query} search on Fields & Floors`
      : 'Check out this search on Fields & Floors';

    // Native share sheet — mobile primarily.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setStatus('shared');
        setTimeout(() => setStatus('idle'), 2000);
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet; not a failure worth showing.
        if (err?.name === 'AbortError') return;
        // Anything else falls through to the clipboard path below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  }

  const label =
    status === 'copied' ? 'Link copied'
    : status === 'shared' ? 'Shared'
    : status === 'error' ? 'Copy failed'
    : 'Share';

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] transition-colors ${className}`}
      style={{
        border: '0.5px solid var(--line)',
        color: status === 'idle' ? 'var(--ink-300)' : 'var(--gold-bright)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-deep)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      aria-label="Share this search"
    >
      <span aria-hidden="true">{status === 'idle' ? '↗' : '✓'}</span>
      {label}
    </button>
  );
}
