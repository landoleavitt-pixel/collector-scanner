'use client';

// /fables/lists (mockups/fables-card-lists.html, approved 2026-11-07): every
// card list by game. Find a name, tap a popular one, or go A–Z one letter at a
// time. Each row opens the card's list (the checklist). Data: /api/tcg-lists.
//
//   /fables/lists?game=mtg&letter=S

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';
import { VERSION_GAMES, GAME_NAMES, versionGame } from '../versions';
import { usePopularLists, CardListTile, listHref } from '../CardListTiles';

const PAGE = 200;

export default function Lists() {
  const router = useRouter();
  const sp = useSearchParams();
  const game = versionGame(sp.get('game'));
  const letter = (sp.get('letter') || 'A').slice(0, 1).toUpperCase();
  const { cards: popular, source: popularSource } = usePopularLists(game);
  const [letters, setLetters] = useState([]);
  const [rows, setRows] = useState(null); // { cards, nextOffset, total }
  const [source, setSource] = useState('');
  const [typed, setTyped] = useState('');
  const [found, setFound] = useState(null);

  const go = (params) => router.replace(`/fables/lists?${new URLSearchParams({ ...(game !== 'pokemon' ? { game } : {}), ...params })}`, { scroll: false });

  useEffect(() => {
    let alive = true;
    setRows(null);
    fetch(`/api/tcg-lists?game=${game}&letter=${encodeURIComponent(letter)}&limit=${PAGE}`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      if (!alive) return;
      setLetters(d?.letters || []);
      setSource(d?.source?.note || '');
      setRows({ cards: d?.cards || [], nextOffset: d?.nextOffset ?? null, total: d?.total || 0 });
    });
    return () => { alive = false; };
  }, [game, letter]);

  // Name search, a moment after typing stops.
  useEffect(() => {
    const q = typed.trim();
    if (q.length < 2) { setFound(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      fetch(`/api/tcg-lists?game=${game}&q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        .then((d) => { if (alive) setFound(d?.cards || []); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [typed, game]);

  async function more() {
    if (rows?.nextOffset == null) return;
    const d = await fetch(`/api/tcg-lists?game=${game}&letter=${encodeURIComponent(letter)}&limit=${PAGE}&offset=${rows.nextOffset}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d) setRows((p) => ({ ...p, cards: [...p.cards, ...(d.cards || [])], nextOffset: d.nextOffset ?? null }));
  }

  const row = (c) => (
    <Link key={c.key} href={listHref(game, c.name)} className="flex items-center justify-between gap-3 min-h-[56px] px-1 text-lede"
          style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--ink-100)' }}>
      <span className="min-w-0">{c.name}</span>
      <span className="flex items-center gap-1 text-body flex-none" style={{ color: 'var(--ink-400)' }}>
        {c.versions.toLocaleString('en-US')} versions<ChevronRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );

  return (
    <main className="max-w-[880px] mx-auto px-5 md:px-6 pt-5 md:pt-10 pb-16">
      <h1 className="font-display italic text-h1 md:text-h1 leading-none">Card lists</h1>
      <p className="text-lede mt-2 mb-4" style={{ color: 'var(--ink-400)' }}>Every card, every version. Tick the ones you have.</p>
      <label className="flex items-center gap-2.5 min-h-[54px] px-4 rounded-[14px]" style={{ border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
        <Search className="w-5 h-5 flex-none" strokeWidth={2} style={{ color: 'var(--ink-400)' }} aria-hidden="true" />
        <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Find a card list" aria-label="Find a card list"
               className="flex-1 min-w-0 bg-transparent outline-none text-lede" style={{ color: 'var(--ink-100)' }} />
      </label>

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pt-4 pb-1" role="tablist" aria-label="Game">
        {VERSION_GAMES.map((g) => (
          <button key={g} type="button" role="tab" aria-selected={g === game} onClick={() => { setTyped(''); router.replace(`/fables/lists${g === 'pokemon' ? '' : `?game=${g}`}`, { scroll: false }); }}
                  className="flex-none min-h-[44px] px-4 rounded-full text-body"
                  style={g === game ? { background: 'var(--ink-100)', color: 'var(--bg-base)', fontWeight: 600 } : { border: '1px solid var(--line)', background: 'var(--bg-elev)', color: 'var(--ink-200)' }}>
            {GAME_NAMES[g]}
          </button>
        ))}
      </div>

      {found ? (
        <section className="mt-6">
          <h2 className="font-display font-normal text-h3 mb-2">{found.length ? `Cards named “${typed.trim()}”` : `No ${GAME_NAMES[game]} card named “${typed.trim()}”`}</h2>
          {found.map(row)}
          {!found.length && (
            <Link href={`/fables?q=${encodeURIComponent(typed.trim())}`} className="inline-flex items-center min-h-[48px] mt-2 text-lede underline underline-offset-[3px]" style={{ color: 'var(--gold-bright)' }}>
              Search every game for “{typed.trim()}”
            </Link>
          )}
        </section>
      ) : (
        <>
          <h2 className="font-display font-normal text-h3 mt-7 mb-1">Popular</h2>
          <p className="text-meta mb-3" style={{ color: 'var(--ink-600)' }}>{popularSource || '\u00a0'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {(popular || Array.from({ length: 4 }, () => null)).map((c, i) => (c
              ? <CardListTile key={c.key} card={c} wide />
              : <span key={i} className="block aspect-[63/88] rounded-[9px] shimmer" style={{ background: 'var(--bg-elev)' }} />))}
          </div>

          <h2 className="font-display font-normal text-h3 mt-9 mb-3">All {GAME_NAMES[game]}, A–Z</h2>
          <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="First letter">
            {letters.filter((l) => l.cards > 0).map((l) => (
              <button key={l.letter} type="button" role="tab" aria-selected={l.letter === letter} onClick={() => go({ letter: l.letter })}
                      className="min-w-[44px] min-h-[44px] rounded-xl text-lede"
                      style={l.letter === letter ? { background: 'var(--gold-bright)', color: 'var(--ink-on-gold)', fontWeight: 600 } : { border: '1px solid var(--line)', color: 'var(--ink-200)' }}>
                {l.letter}
              </button>
            ))}
          </div>
          <h3 className="font-display italic text-price mt-4 mb-1" style={{ color: 'var(--ink-200)' }}>{letter}</h3>
          {rows === null
            ? <div className="h-[56px] rounded-xl shimmer" style={{ background: 'var(--bg-elev)' }} />
            : rows.cards.map(row)}
          {rows?.nextOffset != null && (
            <button type="button" onClick={more} className="w-full min-h-[56px] rounded-2xl text-lede mt-4" style={{ border: '1px dashed var(--line)', color: 'var(--ink-400)' }}>
              Show more {letter} cards
            </button>
          )}
        </>
      )}
      {source && <p className="text-fine mt-8" style={{ color: 'var(--ink-600)' }}>{source}</p>}
    </main>
  );
}
