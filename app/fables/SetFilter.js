'use client';

// The Set filter behind "More filters" (research/fables-filters-2.md, rank 5):
// type a set's name or code, pick one. Only for the games with a card catalog;
// the set list comes from /api/tcg-versions?sets=1.

import { useEffect, useMemo, useState } from 'react';
import { SectionLabel } from '../components/search/SearchUI';

const CATALOG_GAMES = ['mtg', 'pokemon', 'yugioh', 'lorcana'];
const SHOWN = 40;

export default function SetFilter({ game, value, onChange }) {
  const [loaded, setLoaded] = useState({ game: null, sets: [] });
  const [typed, setTyped] = useState('');
  const sets = loaded.game === game ? loaded.sets : [];
  const hasCatalog = CATALOG_GAMES.includes(game);

  useEffect(() => {
    if (!hasCatalog) return undefined;
    let live = true;
    fetch(`/api/tcg-versions?game=${encodeURIComponent(game)}&sets=1`)
      .then((r) => (r.ok ? r.json() : { sets: [] }))
      .then((d) => { if (live) setLoaded({ game, sets: d.sets || [] }); })
      .catch(() => {});
    return () => { live = false; };
  }, [game, hasCatalog]);

  // A set left over from another game means nothing here.
  useEffect(() => {
    if (value && loaded.game === game && !sets.some((s) => s.code === value)) onChange('');
  }, [value, loaded.game, game, sets, onChange]);

  const matches = useMemo(() => {
    const t = typed.trim().toLowerCase();
    return (t ? sets.filter((s) => s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)) : sets).slice(0, SHOWN);
  }, [sets, typed]);

  if (!hasCatalog) return null;
  const picked = sets.find((s) => s.code === value);

  return (
    <div>
      <SectionLabel>Set</SectionLabel>
      {value ? (
        <button
          type="button"
          onClick={() => { onChange(''); setTyped(''); }}
          aria-label={`Remove set ${picked?.name || value}`}
          className="text-meta inline-flex items-center rounded-full"
          style={{ minHeight: 36, padding: '0 14px', background: 'var(--accent-bright)', color: 'var(--ink-on-accent)', fontWeight: 600 }}
        >
          {picked?.name || value} ×
        </button>
      ) : (
        <>
          <input
            type="search"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type a set name or code"
            aria-label="Find a set"
            className="w-full text-lede sm:text-body px-3 py-2 rounded-lg"
            style={{ border: '1px solid var(--line)', background: 'var(--bg-elev-2)', color: 'var(--ink-100)' }}
          />
          {typed.trim() && (
            <ul className="mt-2 max-h-56 overflow-y-auto" style={{ border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-elev-2)' }}>
              {matches.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => { onChange(s.code); setTyped(''); }}
                    className="w-full text-left text-meta px-3 py-2"
                    style={{ color: 'var(--ink-100)' }}
                  >
                    {s.name} <span style={{ color: 'var(--ink-400)' }}>{s.code}{s.released ? ` · ${s.released.slice(0, 4)}` : ''}</span>
                  </button>
                </li>
              ))}
              {!matches.length && <li className="text-meta px-3 py-2" style={{ color: 'var(--ink-400)' }}>No set by that name</li>}
            </ul>
          )}
        </>
      )}
      <p className="text-fine mt-2" style={{ color: 'var(--ink-600)' }}>Shows listings we can match to this set, or whose title names it.</p>
    </div>
  );
}
