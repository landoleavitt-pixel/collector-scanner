'use client';

// "Still need, for sale now" (mockups/fables-still-need-and-sets.html, approved
// 2026-11-14): every version the member is missing from the card lists they've
// started, with what's on eBay today. Data: GET /api/still-need (signed in;
// one family search per card, shared with the card list's cache).
// StillNeedCard is the small link on the signed-in home and the Lists page.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import CardFrame from '../CardFrame';
import { versionLabel, gameParams, gameQuery, sized, saveFamilyAlert } from '../versions';
import { usePushAsk } from '../../components/PushAsk';

const PAGE = 8;

async function loadStillNeed(offset = 0, limit = PAGE) {
  const r = await fetch(`/api/still-need?limit=${limit}&offset=${offset}`, { cache: 'no-store' }).catch(() => null);
  if (!r) return { error: 'Couldn’t load right now. Try again in a moment.' };
  if (r.status === 401) return { signedOut: true };
  const d = await r.json().catch(() => null);
  if (!r.ok || !d) return { error: d?.error || 'Couldn’t load right now. Try again in a moment.' };
  return d;
}

const plain = (game, row) => versionLabel(game, { label: row.label, key: row.version });
const checklistHref = (f) => `/fables/checklist?${gameQuery(f.game)}name=${encodeURIComponent(f.name)}`;
const findHref = (f, row, back) => `/fables/find?${new URLSearchParams({
  ...gameParams(f.game), card: row.card, version: row.version, name: row.cardName,
  no: f.game === 'yugioh' ? `${row.set}-${row.number}` : row.number, label: plain(f.game, row), back,
})}`;

function NeedRow({ family, row, back }) {
  const sale = row.forSale || 0;
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--line-soft)' }}>
      <CardFrame src={sale > 0 && row.photo ? sized(row.photo, 300) : null} game={family.game} className="!w-11" />
      <span className="flex-1 min-w-0">
        <span className="block text-body font-medium leading-snug" style={{ color: 'var(--ink-100)' }}>{row.groupedBySet ? `${row.cardName} · ${plain(family.game, row)}` : plain(family.game, row)}</span>
        <span className="block text-meta" style={{ color: 'var(--ink-400)' }}>{row.groupedBySet ? `No. ${row.number}` : `${row.setName} · No. ${row.number}`}</span>
        {sale > 0 && <span className="block text-meta mt-0.5" style={{ color: 'var(--accent-bright)' }}>{sale} for sale</span>}
      </span>
      {sale > 0 && (
        <Link href={findHref(family, row, back)} className="flex-none inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-body font-semibold"
              style={{ border: '1.5px solid var(--accent-bright)', color: 'var(--accent-bright)' }}>
          <Search className="w-4 h-4" strokeWidth={2} aria-hidden="true" />Find it
        </Link>
      )}
    </div>
  );
}

function FamilyBlock({ family, back }) {
  const [open, setOpen] = useState(false);
  const forSale = family.rows.filter((r) => r.forSale > 0);
  const rest = family.rows.filter((r) => !(r.forSale > 0));
  const SHOW_REST = 30;
  return (
    <section className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mt-6 mb-2.5">
        <Link href={checklistHref(family)} className="font-display text-h3 leading-tight" style={{ color: 'var(--ink-200)' }}>{family.name}</Link>
        <span className="text-meta flex-none" style={{ color: 'var(--ink-400)' }}>You have {family.owned} of {family.versions}</span>
      </div>
      <div className="rounded-xl px-3.5 pb-1" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        {family.searchFailed && <p className="text-meta py-3" style={{ color: 'var(--ink-400)' }}>eBay didn’t answer for this card. Try again soon.</p>}
        {forSale.map((row) => <NeedRow key={row.version} family={family} row={row} back={back} />)}
        {!family.searchFailed && forSale.length === 0 && (
          <p className="text-meta py-3" style={{ color: 'var(--ink-400)' }}>
            {family.capped ? 'Big list: we couldn’t check every version. ' : 'None of these are for sale right now. '}
            <Link href={checklistHref(family)} className="underline underline-offset-2" style={{ color: 'var(--accent-bright)' }}>Open the card list</Link>
          </p>
        )}
        {open && rest.slice(0, SHOW_REST).map((row) => <NeedRow key={row.version} family={family} row={row} back={back} />)}
        {rest.length > 0 && (open ? (
          rest.length > SHOW_REST && (
            <Link href={checklistHref(family)} className="flex items-center justify-between min-h-[44px] text-meta" style={{ color: 'var(--ink-400)' }}>
              See all {rest.length} on the card list<ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          )
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="w-full flex items-center justify-between min-h-[44px] text-meta text-left" style={{ color: 'var(--ink-400)' }}>
            {rest.length} more not for sale right now<ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

// Grouped by set: every family's for-sale rows under their set, newest set first.
function BySet({ families, back }) {
  const sets = useMemo(() => {
    const m = new Map();
    for (const f of families) {
      for (const row of f.rows) {
        const k = `${f.game}|${row.set}`;
        if (!m.has(k)) m.set(k, { key: k, name: row.setName, game: f.game, sale: [], rest: 0, order: m.size });
        const g = m.get(k);
        if (row.forSale > 0) g.sale.push({ family: f, row: { ...row, groupedBySet: true } });
        else g.rest += 1;
      }
    }
    return [...m.values()].filter((g) => g.sale.length).sort((a, b) => b.sale.length - a.sale.length || a.order - b.order);
  }, [families]);
  if (!sets.length) return <p className="text-body mt-6" style={{ color: 'var(--ink-400)' }}>None of the versions you still need are for sale right now.</p>;
  return sets.map((g) => (
    <section key={g.key} className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mt-6 mb-2.5">
        <h2 className="font-display text-h3 leading-tight m-0" style={{ color: 'var(--ink-200)' }}>{g.name}</h2>
        <span className="text-meta flex-none" style={{ color: 'var(--ink-400)' }}>{g.sale.length} for sale</span>
      </div>
      <div className="rounded-xl px-3.5 pb-1" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        {g.sale.map(({ family, row }) => <NeedRow key={`${family.name}|${row.version}`} family={family} row={row} back={back} />)}
        {g.rest > 0 && <p className="text-meta py-3 m-0" style={{ color: 'var(--ink-400)' }}>{g.rest} more from this set not for sale right now</p>}
      </div>
    </section>
  ));
}

export default function StillNeed() {
  const [data, setData] = useState(null); // { families, nextOffset, more } | { signedOut } | { error }
  const [loadingMore, setLoadingMore] = useState(false);
  const [bySet, setBySet] = useState(false);
  const [alertState, setAlertState] = useState('');
  const pushAsk = usePushAsk();
  const back = '/fables/still-need';

  useEffect(() => { loadStillNeed().then(setData); }, []);

  async function more() {
    if (data?.nextOffset == null) return;
    setLoadingMore(true);
    const d = await loadStillNeed(data.nextOffset);
    setLoadingMore(false);
    if (d.families) setData((cur) => ({ ...d, families: [...cur.families, ...d.families] }));
  }

  // One button: a need-only alert for each list shown (each card is its own
  // saved search; the 5-alert limit is reported honestly).
  async function alertAll() {
    setAlertState('saving');
    let on = 0;
    let note = '';
    for (const f of data.families) {
      const res = await saveFamilyAlert(f.game, f.name, f.rows.map((r) => ({ cardKey: r.card })));
      if (res === 'on') on += 1;
      else { note = res; break; }
    }
    setAlertState(on ? `Alerts are on for ${on} ${on === 1 ? 'list' : 'lists'}.${note ? ` ${note}` : ''}` : note || 'That didn’t work. Try again.');
    if (on) await pushAsk.ask();
  }

  const families = data?.families || [];
  const missing = families.reduce((n, f) => n + (f.missing || 0), 0);
  const forSale = families.reduce((n, f) => n + (f.missingForSale || 0), 0);

  return (
    <main className="max-w-[720px] mx-auto px-[18px] md:px-6 pt-4 md:pt-8 pb-28">
      <Link href="/fables/lists" className="inline-flex items-center gap-1.5 text-body min-h-[44px]" style={{ color: 'var(--ink-400)' }}>
        <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Card lists
      </Link>
      <h1 className="font-display italic text-h1 leading-none mt-1 mb-3">Still need</h1>

      {data === null && <p className="text-body" style={{ color: 'var(--ink-400)' }}>Checking eBay for the cards you still need…</p>}
      {data?.error && <p className="text-body" style={{ color: 'var(--crit)' }}>{data.error}</p>}
      {data?.signedOut && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <p className="text-lede m-0" style={{ color: 'var(--ink-100)' }}>Sign in to see the cards you still need, and which are for sale now.</p>
          <Link href="/signup?src=still-need&next=/fables/still-need" className="flex items-center justify-center min-h-[52px] rounded-xl text-lede font-semibold mt-4"
                style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>Make a free account</Link>
          <Link href="/login?next=/fables/still-need" className="flex items-center justify-center min-h-[48px] text-body mt-1" style={{ color: 'var(--ink-400)' }}>I have an account</Link>
        </div>
      )}
      {data?.families && families.length === 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <p className="text-lede m-0" style={{ color: 'var(--ink-100)' }}>Nothing here yet.</p>
          <p className="text-body mt-1.5 mb-4" style={{ color: 'var(--ink-400)' }}>Mark the cards you own on a card list. The versions you still need, and which are for sale, show up here.</p>
          <Link href="/fables/lists" className="inline-flex items-center gap-1.5 text-body font-semibold" style={{ color: 'var(--accent-bright)' }}>Browse card lists<ChevronRight className="w-4 h-4" aria-hidden="true" /></Link>
        </div>
      )}

      {families.length > 0 && (
        <>
          <p className="text-lede mb-4" style={{ color: 'var(--ink-200)' }}>
            You still need <b className="font-semibold" style={{ color: 'var(--ink-100)' }}>{missing.toLocaleString('en-US')} {missing === 1 ? 'version' : 'versions'}</b>.{' '}
            <b className="font-semibold" style={{ color: 'var(--ink-100)' }}>{forSale.toLocaleString('en-US')}</b> {forSale === 1 ? 'is' : 'are'} for sale now.
          </p>
          <div className="flex gap-1 p-1 rounded-xl" role="group" aria-label="Group by" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
            {[[false, 'By card'], [true, 'By set']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => setBySet(v)} aria-pressed={bySet === v}
                      className="flex-1 min-h-[40px] rounded-lg text-body"
                      style={bySet === v ? { background: 'var(--bg-elev-2)', color: 'var(--ink-100)', boxShadow: 'inset 0 0 0 1px var(--line)' } : { color: 'var(--ink-400)' }}>{l}</button>
            ))}
          </div>

          {bySet ? <BySet families={families} back={back} /> : families.map((f) => <FamilyBlock key={`${f.game}|${f.name}`} family={f} back={back} />)}

          {data.nextOffset != null && (
            <button type="button" onClick={more} disabled={loadingMore} className="w-full min-h-[52px] rounded-xl text-body mt-2"
                    style={{ border: '1px dashed var(--line)', color: 'var(--ink-400)' }}>
              {loadingMore ? 'Checking eBay…' : `Show ${data.more?.length || ''} more ${data.more?.length === 1 ? 'list' : 'lists'}`.replace('  ', ' ')}
            </button>
          )}

          {alertState && alertState !== 'saving' ? (
            <p className="text-body mt-6" style={{ color: 'var(--accent-bright)' }}>{alertState}</p>
          ) : (
            <button type="button" onClick={alertAll} disabled={alertState === 'saving'}
                    className="w-full min-h-[58px] rounded-xl flex items-center justify-center gap-2.5 text-lede font-semibold mt-6 disabled:opacity-60"
                    style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />{alertState === 'saving' ? 'Saving…' : 'Alert me when one is listed'}
            </button>
          )}
          <p className="text-meta text-center mt-3" style={{ color: 'var(--ink-600)' }}>Only you can see this. Photos are from sellers’ eBay listings.</p>
        </>
      )}
      {pushAsk.node}
    </main>
  );
}

/* The link to this page on the signed-in home and the Lists page: hidden
   until the member has started a list. */
export function StillNeedCard({ className = '' }) {
  const [d, setD] = useState(null);
  useEffect(() => { loadStillNeed(0, 4).then(setD); }, []);
  const families = d?.families || [];
  if (!families.length) return null;
  const missing = families.reduce((n, f) => n + (f.missing || 0), 0);
  const forSale = families.reduce((n, f) => n + (f.missingForSale || 0), 0);
  const photos = families.flatMap((f) => f.rows.filter((r) => r.forSale > 0 && r.photo).map((r) => ({ src: r.photo, game: f.game }))).slice(0, 3);
  return (
    <Link href="/fables/still-need" className={`flex items-center gap-4 rounded-xl p-4 ${className}`}
          style={{ background: 'linear-gradient(135deg, rgba(143,211,232,.10), rgba(143,211,232,.02))', border: '1px solid var(--accent-deep)' }}>
      {photos.length > 0 && (
        <span className="flex flex-none" aria-hidden="true">
          {photos.map((p, i) => <CardFrame key={p.src} src={sized(p.src, 200)} game={p.game} className={`!w-10 ${i ? '-ml-4' : ''}`} />)}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block font-display text-h3 leading-tight" style={{ color: 'var(--ink-100)' }}>Still need, for sale now</span>
        <span className="text-meta" style={{ color: 'var(--ink-400)' }}>
          {forSale > 0 ? `${forSale} of your ${missing}${d.more?.length ? '+' : ''} missing versions are on eBay` : `${missing}${d.more?.length ? '+' : ''} versions to find. None for sale right now.`}
        </span>
      </span>
      <ChevronRight className="w-5 h-5 flex-none" style={{ color: 'var(--ink-400)' }} aria-hidden="true" />
    </Link>
  );
}

