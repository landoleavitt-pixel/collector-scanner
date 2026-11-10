'use client';

// Versions-first search (mockups/fables-home-story.html, approved 2026-11-06):
// for the games with a card catalog, a search that names a card opens on every version for
// sale, set by set, and each promise shows on screen: how many listings we hid,
// and how many we couldn't pin to a version. Other games, and searches that
// don't name a family, keep the normal results list (onUnavailable).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, ShieldCheck } from 'lucide-react';
import { useUser } from '../../lib/useUser';
import { usePushAsk } from '../components/PushAsk';
import { EditableSearchHeading } from '../components/search/SuggestBox';
import { LoadingState } from '../components/search/SearchUI';
import { GroupDot } from './rarity';
import { Sheet, BigButton } from './sheet';
import CardFrame from './CardFrame';
import { FAMILY_MAX, versionLabel, cardNumber, gameParams, gameQuery, sized, familyKeys, loadFamily, loadFamilyListings, saveFamilyAlert } from './versions';

const SETS_SHOWN = 4;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const plural = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export default function VersionsView({ query, game, onUnavailable, onNewSearch, onSearch, onShowAll }) {
  const { user } = useUser();
  const [data, setData] = useState(null); // { rows, listings }
  const [showAll, setShowAll] = useState(false);
  const [ask, setAsk] = useState(false);
  const [alertState, setAlertState] = useState('');
  const pushAsk = usePushAsk();

  useEffect(() => {
    let alive = true;
    setData(null);
    setShowAll(false);
    setAlertState('');
    (async () => {
      const f = await loadFamily(game, query).catch(() => null);
      if (!alive) return;
      if (!f?.rows.length || f.familySize > FAMILY_MAX) { onUnavailable(); return; }
      const listings = await loadFamilyListings(game, query, f.rows);
      if (!alive) return;
      // Nothing pinned to a version: the versions view has nothing to show.
      if (!listings || !listings.pinned) { onUnavailable(); return; }
      setData({ rows: f.rows, source: f.source, listings });
    })();
    return () => { alive = false; };
  }, [query, game]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="max-w-[720px] mx-auto px-5 md:px-6 pt-8 pb-16"><LoadingState phrase="Searching eBay" /></div>;

  const { rows, listings } = data;
  const title = rows.find((r) => norm(r.cardName) === norm(query))?.cardName || query.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  const versionCount = rows.reduce((n, r) => n + r.versions.length, 0);
  const unsure = Math.max(0, listings.total - listings.pinned);
  const here = `/fables?q=${encodeURIComponent(query)}`;
  const sets = [];
  for (const r of rows) {
    const onSale = r.versions.filter((v) => listings.counts[`${r.cardKey}|${v.key}`] > 0);
    if (!onSale.length) continue;
    let g = sets[sets.length - 1];
    if (!g || g.set !== r.set) { g = { set: r.set, name: r.setName, year: r.released.slice(0, 4), rows: [] }; sets.push(g); }
    for (const v of onSale) g.rows.push({ r, v, n: listings.counts[`${r.cardKey}|${v.key}`] });
  }
  const shown = showAll ? sets : sets.slice(0, SETS_SHOWN);
  const findHref = (r, v, label) => `/fables/find?${new URLSearchParams({ ...gameParams(game), card: r.cardKey, version: v.key, name: r.cardName, no: cardNumber(game, r), label, back: here })}`;
  const unsureHref = `/fables/find?${new URLSearchParams({ ...gameParams(game), cards: familyKeys(rows).join(','), q: query, unsure: '1', name: title, label: 'Seller didn’t say which version', back: here })}`;
  const checklistHref = `/fables/checklist?${gameQuery(game)}name=${encodeURIComponent(title)}`;

  async function turnOnAlert() {
    setAlertState('saving');
    const result = await saveFamilyAlert(game, title, rows);
    setAlertState(result);
    setAsk(false);
    // In the iPhone app, the first alert is when we ask about notifications.
    if (result === 'on') await pushAsk.ask();
  }

  return (
    <section className="max-w-[720px] mx-auto px-5 md:px-6 pt-4 md:pt-8 pb-16 stage-in">
      <button type="button" onClick={onNewSearch} className="inline-flex items-center gap-1 text-body min-h-[40px]" style={{ color: 'var(--ink-400)' }}>
        <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />New search
      </button>
      <h1 className="sr-only">Every version of {title}</h1>
      <div className="mt-1 mb-2.5">
        <EditableSearchHeading side="fables" value={title} onSubmit={(next) => { const t = (next || '').trim(); if (t && norm(t) !== norm(title)) onSearch(t); }} />
      </div>
      <p className="text-lede" style={{ color: 'var(--ink-200)' }}>
        <b className="font-semibold" style={{ color: 'var(--ink-100)' }}>{plural(versionCount, 'version', 'versions')}</b> · {listings.total.toLocaleString('en-US')}{listings.capped ? '+' : ''} {listings.total === 1 ? 'listing' : 'listings'} for sale now
      </p>
      {listings.hidden > 0 && (
        <p className="flex items-center gap-2 text-body mt-2.5" style={{ color: 'var(--ink-400)' }}>
          <ShieldCheck className="w-[17px] h-[17px] flex-none" strokeWidth={2} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          We hid {plural(listings.hidden, 'listing that isn’t', 'listings that aren’t')} this card.
        </p>
      )}

      {shown.map((g) => (
        <div key={g.set}>
          <h2 className="font-display italic text-h3 mt-6 mb-2.5" style={{ color: 'var(--ink-200)' }}>{g.name}{g.year && !g.name.includes(g.year) ? ` · ${g.year}` : ''}</h2>
          {g.rows.map(({ r, v, n }) => {
            const label = versionLabel(game, v);
            const photo = listings.photos[r.id];
            return (
              <Link key={v.key} href={findHref(r, v, label)} className="flex items-center gap-3.5 min-h-[84px] px-3 py-2.5 rounded-xl mb-2.5"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
                <CardFrame src={photo ? sized(photo, 300) : null} game={game} className="!w-[50px]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-lede font-medium leading-tight" style={{ color: 'var(--ink-100)' }}>{r.cardName}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-body mt-0.5" style={{ color: 'var(--ink-400)' }}>
                    <span>No. {cardNumber(game, r)} · {label}</span>
                    {v.rarityGroup && <GroupDot group={v.rarityGroup} small />}
                  </span>
                  {/* No count here: the row's number came from one sample of
                      listings and didn't match what "Find it" shows (QA 2026-11-07 #4). */}
                  <span className="block text-body font-medium mt-0.5" style={{ color: 'var(--accent-bright)' }}>For sale now</span>
                </span>
              </Link>
            );
          })}
        </div>
      ))}
      {!showAll && sets.length > SETS_SHOWN && (
        <button type="button" onClick={() => setShowAll(true)} className="w-full min-h-[56px] rounded-xl text-lede mt-2"
                style={{ border: '1px dashed var(--line)', color: 'var(--ink-400)' }}>
          Show {sets.length - SETS_SHOWN} older sets
        </button>
      )}

      {unsure > 0 && (
        <Link href={unsureHref} className="block rounded-xl p-3.5 mt-3.5 text-body" style={{ border: '1px dashed var(--line)', color: 'var(--ink-200)' }}>
          {plural(unsure, 'more is', 'more are')} {title}, but the seller didn’t say which version.
          <span className="block text-meta mt-0.5" style={{ color: 'var(--ink-400)' }}>Listed separately, so you can check them yourself.</span>
        </Link>
      )}

      {alertState === 'on' ? (
        <p className="w-full min-h-[60px] rounded-xl flex items-center justify-center gap-2.5 text-lede mt-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--accent-bright)' }}>
          <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Alerts are on
        </p>
      ) : (
        <button type="button" onClick={() => (user ? setAsk(true) : window.location.assign(`/signup?src=alert&next=${encodeURIComponent(here)}`))}
                className="w-full min-h-[60px] rounded-xl flex items-center justify-center gap-2.5 text-lede font-semibold mt-5"
                style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>
          <Bell className="w-5 h-5 flex-none" strokeWidth={2} aria-hidden="true" />Alert me when one I need is listed
        </button>
      )}
      {alertState && alertState !== 'on' && alertState !== 'saving' && <p className="text-body mt-3" style={{ color: 'var(--ink-200)' }}>{alertState}</p>}

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-body" style={{ color: 'var(--ink-400)' }}>
        <button type="button" onClick={onShowAll} className="min-h-[40px] underline underline-offset-[3px]">See all listings</button>
        <Link href={checklistHref} className="inline-flex items-center min-h-[40px] underline underline-offset-[3px]">Mark the ones you have</Link>
      </div>
      {data.source && <p className="text-fine mt-6 text-center" style={{ color: 'var(--ink-600)' }}>{data.source} Photos are from sellers’ eBay listings.</p>}

      {ask && (
        <Sheet onClose={() => setAsk(false)}>
          <h3 className="font-display italic text-price leading-tight mb-1">Alert you when one you need is listed?</h3>
          <p className="text-lede mb-5" style={{ color: 'var(--ink-400)' }}>We skip the ones you’ve marked as yours. We’ll email you.</p>
          <BigButton onClick={turnOnAlert} disabled={alertState === 'saving'}>{alertState === 'saving' ? 'Saving…' : 'Yes, alert me'}</BigButton>
          <button type="button" onClick={() => setAsk(false)} className="w-full min-h-[56px] text-lede mt-1.5" style={{ color: 'var(--ink-400)' }}>Not now</button>
        </Sheet>
      )}
      {pushAsk.node}
    </section>
  );
}
