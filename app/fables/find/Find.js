'use client';

// "Find it" from the card checklist: live eBay listings for one version of
// one card (/api/tcg-family-search?versions=<key>), as normal Foils & Fables
// result rows: star, card popup with "View on eBay". With unsure=1, the family's
// listings we couldn't pin to one version (from the versions-first search).
//
//   /fables/find?[game=mtg&]cards=<keys>&q=<family name>&unsure=1&name=&label=&back=
//   /fables/find?[game=mtg&]card=<card key>&version=<version key>&name=&no=&label=&back=

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import CardModal from '../../components/CardModal';
import SignupPromptCard from '../../components/SignupPromptCard';
import { ResultCard } from '../../components/search/ResultCard';
import { LoadingState, BackToTop } from '../../components/search/SearchUI';
import { SIDE, withListingFlags } from '../data';
import { fablesPayload, CardBadges, hasCardBadges, rowStyleFor } from '../FablesHome';

const money = (v) => (v == null ? '' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
// Only paths on this site.
const safeBack = (b) => (b && b.startsWith('/') && !b.startsWith('//') ? b : '/fables');

export default function Find() {
  const sp = useSearchParams();
  const game = sp.get('game') === 'mtg' ? 'mtg' : 'pokemon';
  const card = sp.get('card') || '';
  const version = sp.get('version') || '';
  const name = sp.get('name') || 'Card';
  const no = sp.get('no');
  const label = sp.get('label');
  const back = safeBack(sp.get('back'));
  const unsure = sp.get('unsure') === '1';
  const cards = sp.get('cards') || '';
  const q = sp.get('q') || '';
  const [res, setRes] = useState(null); // { items, total, nextOffset }
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState(null);

  const url = (offset = 0) => `/api/tcg-family-search?${new URLSearchParams({ game, card, versions: version, lang: 'en', limit: '48', ...(offset ? { offset: String(offset) } : {}) })}`;

  useEffect(() => {
    if (unsure) {
      let alive = true;
      fetch(`/api/tcg-family-search?${new URLSearchParams({ game, cards, q, lang: 'en', limit: '1000', unsure: 'show' })}`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
          if (!alive) return;
          const items = (d?.items || []).filter((it) => !(it.match?.kind === 'exact' && it.match.versions?.length === 1)).map(withListingFlags);
          setRes(d ? { items, total: items.length, nextOffset: null } : { items: [], total: 0, nextOffset: null, error: true });
        });
      return () => { alive = false; };
    }
    if (!card || !version) { setRes({ items: [], total: 0, nextOffset: null }); return; }
    let alive = true;
    fetch(url()).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      if (alive) setRes(d ? { items: (d.items || []).map(withListingFlags), total: d.total || 0, nextOffset: d.nextOffset ?? null } : { items: [], total: 0, nextOffset: null, error: true });
    });
    return () => { alive = false; };
  }, [card, version, unsure, cards, q, game]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    if (res?.nextOffset == null || more) return;
    setMore(true);
    const d = await fetch(url(res.nextOffset)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d) setRes((p) => ({ ...p, items: [...p.items, ...(d.items || []).map(withListingFlags)], nextOffset: d.nextOffset ?? null }));
    setMore(false);
  }

  return (
    <main className="max-w-[1000px] mx-auto px-5 md:px-6 lg:px-10 pt-4 md:pt-8 pb-16">
      <a href={back} className="inline-flex items-center gap-1.5 text-[16px] min-h-[44px]" style={{ color: 'var(--ink-400)' }}>
        <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Back to the list
      </a>
      <h1 className="font-display italic text-[34px] md:text-[44px] leading-tight mt-1">{name}</h1>
      <p className="text-[17px] mt-1 mb-6" style={{ color: 'var(--ink-200)' }}>{[no && `No. ${no}`, label].filter(Boolean).join(' · ')}</p>

      {res === null && <LoadingState phrase="Searching eBay" />}
      {res && res.items.length === 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <p className="text-[18px]" style={{ color: 'var(--ink-100)' }}>{res.error ? 'eBay didn’t answer. Try again in a minute.' : 'None for sale right now'}</p>
          <a href={back} className="inline-flex items-center justify-center min-h-[52px] px-5 rounded-xl text-[16px] font-semibold mt-4"
             style={{ border: '1.5px solid var(--gold-bright)', color: 'var(--gold-bright)' }}>Back to the list</a>
        </div>
      )}
      {res && res.items.length > 0 && (
        <>
          <p className="text-[13px] mb-2" style={{ color: 'var(--ink-400)' }}>
            <span style={{ color: 'var(--gold)' }}>{res.total}</span> for sale on eBay now
          </p>
          <div className="divide-y divide-[var(--line-soft)]">
            {res.items.flatMap((item, i) => {
              const row = (
                <ResultCard
                  key={item.id} item={item} formatPrice={money} index={i}
                  onCardClick={setSelected}
                  payload={fablesPayload(item)} rowStyle={rowStyleFor(item)}
                  badges={<CardBadges item={item} />} hasBadges={hasCardBadges(item)}
                />
              );
              return i === 3 ? [row, <SignupPromptCard key="signup-prompt" />] : [row];
            })}
          </div>
          {res.nextOffset != null && (
            <div className="pt-8 flex justify-center">
              <button onClick={loadMore} disabled={more}
                      className="text-[11px] uppercase tracking-[0.2em] px-6 py-3 rounded-full disabled:opacity-60"
                      style={{ border: '0.5px solid var(--gold-deep)', color: 'var(--gold)' }}>
                {more ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <CardModal item={selected} printRun={null} onClose={() => setSelected(null)} side={SIDE}
                   chips={<CardBadges item={selected} meaning />} watchPayload={fablesPayload(selected)} />
      )}
      <BackToTop />
    </main>
  );
}
