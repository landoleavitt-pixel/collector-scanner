'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function suggestName(query) {
  if (!query) return '';
  return query
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const TIER_STYLES = {
  grail: { bg: 'rgba(255,193,77,0.12)', color: '#ffc14d', border: 'rgba(255,193,77,0.35)' },
  ultra: { bg: 'rgba(200,212,224,0.1)', color: '#c8d4e0', border: 'rgba(200,212,224,0.3)' },
  rare: { bg: 'rgba(214,114,45,0.1)', color: '#d6722d', border: 'rgba(214,114,45,0.3)' },
  scarce: { bg: 'rgba(90,100,112,0.15)', color: '#9aa4b0', border: 'rgba(90,100,112,0.4)' },
  neutral: { bg: 'rgba(232,226,213,0.04)', color: '#a8a090', border: 'rgba(232,226,213,0.12)' },
};

export default function SaveSearchModal({ open, onClose, query, filters, chips = [], editingSearch = null }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // In edit mode: pre-fill the name from the existing search and respect its
  // current notify_enabled setting. In create mode: suggest a name from the
  // query and default notifications on.
  const isEditing = !!editingSearch;

  useEffect(() => {
    if (open) {
      if (isEditing) {
        setName(editingSearch.name || '');
        setNotifyEnabled(editingSearch.notify_enabled !== false);
      } else {
        setName(suggestName(query));
        setNotifyEnabled(true);
      }
      setError('');
    }
  }, [open, query, isEditing, editingSearch]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Give your search a name.');
      return;
    }
    setLoading(true);

    // Edit mode → PATCH the existing row (no duplicate created).
    // Create mode → POST a new saved search.
    const res = isEditing
      ? await fetch(`/api/saved-searches/${editingSearch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, query, filters, notify_enabled: notifyEnabled }),
        })
      : await fetch('/api/saved-searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, query, filters, notify_enabled: notifyEnabled }),
        });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setError(data.error || 'Something went wrong.');
      return;
    }

    onClose();
    // After an edit, send the user back to their saved-searches list so they
    // can see the updated row. After a create, refresh in place.
    if (isEditing) {
      router.push('/watchlist');
    } else {
      router.refresh();
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl p-8"
        style={{
          background: '#1a1614',
          border: '0.5px solid rgba(232,226,213,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          color: '#e8e2d5',
        }}
      >
        <h2 className="font-serif italic text-[22px] text-center mb-1">
          {isEditing ? 'Update search criteria.' : 'Save this search.'}
        </h2>
        <p className="text-[13px] text-center mb-5" style={{ color: '#8a8275' }}>
          {isEditing
            ? 'Overwrite your saved search with these new filters.'
            : "We'll notify you when new matches appear."}
        </p>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mb-5">
            {chips.map((chip, i) => {
              const style = TIER_STYLES[chip.tier] || TIER_STYLES.neutral;
              return (
                <span
                  key={i}
                  className="text-[9.5px] tracking-[0.18em] uppercase px-2.5 py-1 rounded"
                  style={{
                    background: style.bg,
                    color: style.color,
                    border: `0.5px solid ${style.border}`,
                  }}
                >
                  {chip.label}
                </span>
              );
            })}
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="search-name"
            className="block text-[11px] mb-1.5 tracking-wide"
            style={{ color: '#8a8275' }}
          >
            Name this search
          </label>
          <input
            id="search-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
            style={{
              background: '#221d1a',
              border: '0.5px solid rgba(232,226,213,0.15)',
              color: '#e8e2d5',
            }}
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between py-2 mb-4">
          <div>
            <div className="text-[13px]" style={{ color: '#e8e2d5' }}>
              Email me new matches
            </div>
            <div className="text-[11px]" style={{ color: '#8a8275' }}>
              Quiet mode pauses notifications
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotifyEnabled(!notifyEnabled)}
            aria-label="Toggle notifications"
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{ background: notifyEnabled ? '#d4af5c' : '#3a3530' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                background: '#1a1614',
                left: notifyEnabled ? 'calc(100% - 18px)' : '2px',
              }}
            />
          </button>
        </div>

        {error && (
          <p className="text-[12px] mb-3 text-center" style={{ color: '#d97757' }}>
            {error}
          </p>
        )}

        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="py-3 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(232,226,213,0.22)',
              color: '#8a8275',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#d4af5c', color: '#1a1614', border: 'none' }}
          >
            {loading ? (isEditing ? 'Updating…' : 'Saving…') : (isEditing ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
