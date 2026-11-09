'use client';

// Card list tiles (mockups/fables-card-lists.html, approved 2026-11-07): a
// card's photo, name, "124 versions" and game; each opens that card's list
// (the checklist). Data: /api/tcg-lists (popular families, no eBay calls).
// The photo is a seller's photo from a live listing when the API gives one
// (`image`), otherwise a plain card shape. Never catalog art.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VERSION_GAMES, GAME_NAMES, gameQuery, sized } from './versions';

export const listHref = (game, name) => `/fables/checklist?${gameQuery(game)}name=${encodeURIComponent(name)}`;

/** Popular lists for one game, or mixed across games (one of each in turn).
 *  → { cards, source } where source says where a game's list comes from. */
export function usePopularLists(game = null) {
  const [cards, setCards] = useState(null);
  const [source, setSource] = useState('');
  useEffect(() => {
    let alive = true;
    const games = game ? [game] : VERSION_GAMES;
    const load = (photos) => Promise.all(games.map((g) => fetch(`/api/tcg-lists?game=${g}&popular=1${photos ? '&photos=1' : ''}`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    const mix = (all) => {
      const per = all.map((d, i) => (d?.cards || []).map((c) => ({ ...c, game: games[i] })));
      const mixed = [];
      for (let i = 0; per.some((p) => p[i]); i++) per.forEach((p) => p[i] && mixed.push(p[i]));
      return mixed;
    };
    // Tiles first (instant, no eBay), then the live seller photos (one eBay
    // call per list, cached an hour on the server).
    load(false).then((all) => {
      if (!alive) return;
      setCards(mix(all));
      setSource(all.find((d) => d?.popularSource)?.popularSource || '');
      load(true).then((withPhotos) => {
        if (!alive) return;
        const images = {};
        for (const c of mix(withPhotos)) if (c.image) images[`${c.game}|${c.key}`] = c.image;
        setCards((cur) => (cur || []).map((c) => ({ ...c, image: images[`${c.game}|${c.key}`] || c.image || null })));
      });
    });
    return () => { alive = false; };
  }, [game]);
  return { cards, source };
}

export function CardListTile({ card, wide = false }) {
  return (
    <Link href={listHref(card.game, card.name)} className={`block min-w-0 ${wide ? '' : 'flex-none w-[132px] snap-start'}`}>
      {card.image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={sized(card.image, 400)} alt="" loading="lazy" className="block w-full aspect-[3/4] rounded-[10px] object-cover mb-2" />
        : <span className="block w-full aspect-[3/4] rounded-[10px] mb-2" style={{ background: 'var(--bg-elev)', border: '1.5px dashed var(--line)' }} aria-hidden="true" />}
      <span className="block text-[16px] font-medium leading-tight" style={{ color: 'var(--ink-100)' }}>{card.name}</span>
      <span className="block text-[14px]" style={{ color: 'var(--ink-400)' }}>{card.versions.toLocaleString('en-US')} versions</span>
      <span className="block text-[12px]" style={{ color: 'var(--ink-600)' }}>{GAME_NAMES[card.game]}</span>
    </Link>
  );
}

/** The home's "Popular card lists" row, sideways on phones. */
export function PopularListsRow({ count = 12 }) {
  const { cards } = usePopularLists();
  if (cards && !cards.length) return null;
  const shown = (cards || Array.from({ length: 4 }, () => null)).slice(0, count);
  return (
    <section aria-labelledby="popular-lists">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="popular-lists" className="font-display font-normal text-[22px]">Popular card lists</h2>
        <Link href="/fables/lists" className="text-[15px] min-h-[44px] inline-flex items-center" style={{ color: 'var(--gold-bright)' }}>See all</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-5 px-5 scroll-px-5 md:mx-0 md:px-0 pb-1.5 snap-x md:grid md:grid-cols-6 md:overflow-visible">
        {shown.map((c, i) => (c
          ? <CardListTile key={`${c.game}|${c.key}`} card={c} />
          : <span key={i} className="flex-none w-[132px] aspect-[3/4] rounded-[10px] shimmer" style={{ background: 'var(--bg-elev)' }} />))}
      </div>
    </section>
  );
}
