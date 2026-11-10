'use client';

// Card checklist (DECISIONS.md "Card checklist view", mockups/card-checklist.html,
// approved 2026-11-01). Every card of one name in a game with a catalog, newest set
// first or rarest first. Each row: seller's photo · name · rarity · have-it
// circle. Tap a row to pick which versions you have (with its photo, large,
// when one is for sale). One button turns on an alert.
//
//   /fables/checklist?name=Charizard            English Pokémon
//   /fables/checklist?game=mtg&name=The One Ring  Magic (also yugioh, lorcana)
//
// Data
//   Versions  /api/tcg-versions (each game's source is credited at the foot of
//             the list, from source.note). A family
//             ("Charizard") is ?family=1: every catalog card named with that
//             word (Charizard, Charizard ex, Mega Charizard X ex…). Each
//             version carries its rarityGroup (app/fables/rarity.js).
//   Listings  the card-family search (/api/tcg-family-search), which pins each
//             live listing to a version: a row's photo (seller photos only,
//             never catalog art; none → dashed card) and which versions are
//             for sale, for "Find it" (opens /fables/find for one version).
//   Owned     /api/owned (owned_cards). Private to the member; marking needs a
//             free account, viewing doesn't.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useNameSuggest } from '../../components/search/SuggestBox';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Lock, Bell, Search } from 'lucide-react';
import { useUser } from '../../../lib/useUser';
import { usePushAsk } from '../../components/PushAsk';
import { SIDE } from '../data';
import { GroupDot, groupRank } from '../rarity';
import { VERSION_GAMES, VERSION_GAMES_TEXT, GAME_NAMES, versionGame, versionLabel, cardNumber, gameParams, gameQuery, sized, loadFamily, loadFamilyListings, saveFamilyAlert } from '../versions';
import { Sheet, BigButton } from '../sheet';
import CardFrame from '../CardFrame';

const SETS_SHOWN = 4;
const RARE_ROWS_SHOWN = 30;
const FOIL = 'linear-gradient(135deg,#9fe3f5,#b6a8f0,#f0b3d0,#f3d9a0)';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function swatch(plain) {
  if (plain.startsWith('Shiny frame')) return 'linear-gradient(135deg,#3a4160 40%,#9fe3f5)';
  if (/shiny|secret|ultra|super|ghost|gold|starlight|ultimate|parallel|platinum|collector/i.test(plain)) return FOIL;
  if (plain.startsWith('First print')) return '#1d1d1d';
  return '#8a93a8';
}

export default function Checklist() {
  const router = useRouter();
  const sp = useSearchParams();
  const name = (sp.get('name') || '').trim().slice(0, 60);
  const GAME = versionGame(sp.get('game'));
  const label = (v) => versionLabel(GAME, v);
  const { user } = useUser();
  const [rows, setRows] = useState(null); // [{ id, set, setName, released, total, number, cardKey, cardName, versions }]
  const [source, setSource] = useState('');
  const [photos, setPhotos] = useState({}); // row id → image url
  const [forSale, setForSale] = useState(null); // `${cardKey}|${versionKey}` → listings for sale now (null while checking)
  const [printing, setPrinting] = useState({}); // 'set:number' → every listing at that number, named version or not
  const [bigList, setBigList] = useState(false); // eBay has more listings than we read (capped): zero here may not mean none
  const [owned, setOwned] = useState(new Set()); // `${cardKey}|${versionKey}`
  const [ownedError, setOwnedError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [rarestFirst, setRarestFirst] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false); // "Only show cards for sale"
  const [pick, setPick] = useState(null); // row id
  const [ask, setAsk] = useState(false);
  const [alertState, setAlertState] = useState(''); // '' | 'saving' | 'on' | message
  const pushAsk = usePushAsk();

  // Versions for every card in the family.
  useEffect(() => {
    if (!name) { setRows([]); return; }
    let alive = true;
    loadFamily(GAME, name)
      .then((f) => { if (alive) { setSource(f.source); setRows(f.rows); } })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [name, GAME]);

  // Live listings: each row's photo and which versions are for sale right now.
  useEffect(() => {
    if (!rows?.length) return;
    let alive = true;
    loadFamilyListings(GAME, name, rows).then((d) => {
      if (!alive) return;
      setPhotos(d?.photos || {});
      setForSale(d?.counts || {});
      setPrinting(d?.printing || {});
      setBigList(!!d?.capped);
    });
    return () => { alive = false; };
  }, [rows, GAME, name]);

  // The member's own marks.
  useEffect(() => {
    if (!user) { setOwned(new Set()); return; }
    fetch(`/api/owned?side=${SIDE}&game=${GAME}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setOwned(new Set((d.owned || []).map((o) => `${o.card_key}|${o.version_key}`))))
      .catch(() => setOwnedError('Your cards couldn’t be loaded right now.'));
  }, [user, GAME]);

  // Listings for sale now across a card's versions (same numbers as Find it).
  // named: listings that say exactly which version; all: every listing at
  // that set and number (some titles don't say regular or 1st edition, say).
  const saleOf = (r) => {
    if (!forSale) return { named: 0, all: 0 };
    const named = r.versions.reduce((n, v) => n + (forSale[`${r.cardKey}|${v.key}`] || 0), 0);
    const at = r.versions[0]?.key.split(':').slice(0, 2).join(':');
    return { named, all: Math.max(named, printing[at] || 0) };
  };
  // On a big list a row with no count may still have listings, so the switch
  // doesn't hide anything there; it explains instead.
  const filtering = saleOnly && forSale !== null && !bigList;
  const listRows = useMemo(
    () => (filtering ? (rows || []).filter((r) => saleOf(r).all > 0) : rows || []),
    [rows, forSale, printing, filtering], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Find it for one number: every version of it, with the ones that don't say
  // which version under their own heading.
  const numberHref = (r) => `/fables/find?${new URLSearchParams({ ...gameParams(GAME), card: r.cardKey, version: r.versions.map((v) => v.key).join(','), name: r.cardName, no: cardNumber(GAME, r), label: r.setName, back: here })}`;
  const saleLine = ({ named, all }) => {
    const unnamed = all - named;
    if (!named) return `${all} for sale on eBay · version not named`;
    return unnamed ? `${all} for sale on eBay · ${unnamed} ${unnamed === 1 ? 'doesn’t' : 'don’t'} say which version` : `${all} for sale on eBay`;
  };
  const sets = useMemo(() => {
    const groups = [];
    for (const r of listRows) {
      const last = groups[groups.length - 1];
      if (last && last.set === r.set) last.rows.push(r);
      else groups.push({ set: r.set, name: r.setName, year: r.released.slice(0, 4), rows: [r] });
    }
    return groups;
  }, [listRows]);
  const total = (rows || []).reduce((n, r) => n + r.versions.length, 0);
  const have = (rows || []).reduce((n, r) => n + r.versions.filter((v) => owned.has(`${r.cardKey}|${v.key}`)).length, 0);
  const needed = total - have;
  const shownSets = showAll ? sets : sets.slice(0, SETS_SHOWN);
  // A row's rarity is its rarest version's group.
  const rarestOf = (r) => r.versions.map((v) => v.rarityGroup).filter(Boolean).sort((a, b) => groupRank(a) - groupRank(b))[0] || null;
  const hasGroups = (rows || []).some(rarestOf);
  const byRarity = useMemo(() => {
    const rank = (r) => groupRank(r.versions.map((v) => v.rarityGroup).filter(Boolean).sort((a, b) => groupRank(a) - groupRank(b))[0]);
    return [...listRows].sort((a, b) => rank(a) - rank(b) || b.released.localeCompare(a.released));
  }, [listRows]);
  const here = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/fables';

  async function toggle(row, v) {
    const key = `${row.cardKey}|${v.key}`;
    const had = owned.has(key);
    const next = new Set(owned);
    if (had) next.delete(key); else next.add(key);
    setOwned(next);
    setOwnedError('');
    const r = await fetch('/api/owned', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side: SIDE, game: GAME, card: row.cardKey, version: v.key, qty: had ? 0 : 1 }),
    }).catch(() => null);
    if (!r || !r.ok) {
      setOwned((cur) => { const back = new Set(cur); if (had) back.add(key); else back.delete(key); return back; });
      setOwnedError('That didn’t save. Try again.');
    }
  }

  async function turnOnAlert() {
    setAlertState('saving');
    const result = await saveFamilyAlert(GAME, title, rows);
    setAlertState(result);
    setAsk(false);
    // In the iPhone app, the first alert is when we ask about notifications.
    if (result === 'on') await pushAsk.ask();
  }

  const cardRow = (r) => {
    const n = r.versions.length;
    const got = r.versions.filter((v) => owned.has(`${r.cardKey}|${v.key}`)).length;
    const rarest = rarestOf(r);
    const sale = saleOf(r);
    return (
      <div key={r.id} className="rounded-2xl mb-2.5 overflow-hidden" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <button type="button" onClick={() => setPick(r.id)}
              className="w-full flex items-center gap-3.5 min-h-[72px] px-3.5 py-3 text-left">
        {/* A seller's photo only on a row that says what's for sale. */}
        <CardFrame src={sale.all > 0 ? sized(photos[r.id], 300) : null} game={GAME} className="!w-12" />
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-medium leading-snug" style={{ color: 'var(--ink-100)' }}>{r.cardName}</span>
          <span className="block text-[15px]" style={{ color: 'var(--ink-400)' }}>No. {cardNumber(GAME, r)}{n > 1 ? ` · ${n} versions` : ''}</span>
          {rarest && <span className="block mt-1"><GroupDot group={rarest} /></span>}
        </span>
        <Ring got={got} n={n} />
      </button>
      {sale.all === 0 && bigList && (
        <a href={numberHref(r)} className="flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 text-[15px]"
           style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--ink-400)' }}>
          <span>Check eBay</span>
          <ChevronRight className="w-[18px] h-[18px] flex-none" strokeWidth={2} aria-hidden="true" />
        </a>
      )}
      {sale.all > 0 && (
        <a href={numberHref(r)} className="flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 text-[15px]"
           style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--gold-bright)' }}>
          <span>{saleLine(sale)}</span>
          <ChevronRight className="w-[18px] h-[18px] flex-none" strokeWidth={2} aria-hidden="true" />
        </a>
      )}
      </div>
    );
  };

  const title = rows?.[0] ? (rows.find((r) => norm(r.cardName) === norm(name))?.cardName || name.replace(/\b\w/g, (c) => c.toUpperCase())) : name;
  const picked = pick ? rows?.find((r) => r.id === pick) : null;

  return (
    <main className="max-w-[640px] mx-auto px-[18px] md:px-6 pt-4 md:pt-8 pb-16">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push('/fables'))}
              className="inline-flex items-center gap-1.5 text-[16px] min-h-[44px]" style={{ color: 'var(--ink-400)' }}>
        <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Back
      </button>
      <h1 className="font-display italic text-[40px] leading-none mt-1.5 mb-4">{title || 'Checklist'}</h1>

      {rows === null && <Skeleton />}
      {rows && rows.length === 0 && (
        <NotFound name={name} game={GAME} />
      )}

      {rows && rows.length > 0 && (
        <>
          <p className="text-[18px] mb-2.5" style={{ color: 'var(--ink-200)' }}>
            {user ? <>You have <b className="font-semibold" style={{ color: 'var(--ink-100)' }}>{have} of {total}</b> versions</> : <>{total} versions to collect</>}
          </p>
          <div className="h-2.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--bg-elev-2)' }}>
            <i className="block h-full rounded-full" style={{ width: `${total ? (have / total) * 100 : 0}%`, background: FOIL }} />
          </div>
          <p className="flex items-center gap-1.5 text-[13px] mt-2.5 mb-5" style={{ color: 'var(--ink-600)' }}>
            <Lock className="w-[15px] h-[15px]" strokeWidth={2} aria-hidden="true" />Only you can see this
          </p>
          {ownedError && <p className="text-[14px] mb-3" style={{ color: 'var(--crit)' }}>{ownedError}</p>}

          <button type="button" role="switch" aria-checked={saleOnly} onClick={() => { setSaleOnly(!saleOnly); setShowAll(false); }}
                  className="w-full flex items-center justify-between gap-3 min-h-[56px] px-3.5 rounded-xl mb-2.5 text-[16px] text-left"
                  style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink-100)' }}>
            Only show cards for sale
            <span className="relative w-[46px] h-[28px] rounded-full flex-none transition-colors" aria-hidden="true"
                  style={{ background: saleOnly ? 'var(--gold-bright)' : 'var(--bg-elev-2)', border: saleOnly ? 'none' : '1px solid var(--line)' }}>
              <span className="absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all"
                    style={{ left: saleOnly ? 21 : 3, background: saleOnly ? 'var(--ink-on-gold)' : 'var(--ink-400)' }} />
            </span>
          </button>
          {saleOnly && bigList && forSale !== null && (
            <p className="text-[15px] mb-2.5" style={{ color: 'var(--ink-400)' }}>Big list: we checked the newest 1,000 listings. Tap a card to check eBay for it.</p>
          )}
          {saleOnly && forSale === null && <p className="text-[15px] mb-2.5" style={{ color: 'var(--ink-400)' }}>Checking eBay…</p>}
          {filtering && listRows.length === 0 && (
            <p className="text-[16px] my-4" style={{ color: 'var(--ink-200)' }}>None of these cards are for sale right now. Turn on an alert below and we’ll tell you when one is listed.</p>
          )}

          {hasGroups && (
            <div className="flex gap-1.5 p-1 rounded-xl mt-1 mb-1.5" role="group" aria-label="Order" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
              {[[false, 'Newest sets'], [true, 'Rarest first']].map(([v, l]) => (
                <button key={l} type="button" onClick={() => { setRarestFirst(v); setShowAll(false); }} aria-pressed={rarestFirst === v}
                        className="flex-1 min-h-[40px] rounded-[9px] text-[15px] text-center"
                        style={rarestFirst === v ? { background: 'var(--bg-elev-2)', color: 'var(--ink-100)', boxShadow: 'inset 0 0 0 1px var(--line)' } : { color: 'var(--ink-400)' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {rarestFirst ? (
            <div className="mt-4">
              {(showAll ? byRarity : byRarity.slice(0, RARE_ROWS_SHOWN)).map(cardRow)}
              {!showAll && byRarity.length > RARE_ROWS_SHOWN && (
                <button type="button" onClick={() => setShowAll(true)} className="w-full min-h-[56px] rounded-2xl text-[16px] mt-2"
                        style={{ border: '1px dashed var(--line)', color: 'var(--ink-400)' }}>
                  Show {byRarity.length - RARE_ROWS_SHOWN} more cards
                </button>
              )}
            </div>
          ) : (
            <>
              {shownSets.map((g) => (
                <section key={g.set}>
                  <h2 className="font-display italic text-[22px] mt-6 mb-2.5" style={{ color: 'var(--ink-200)' }}>{g.name}{g.year && !g.name.includes(g.year) ? ` · ${g.year}` : ''}</h2>
                  {g.rows.map(cardRow)}
                </section>
              ))}
              {!showAll && sets.length > SETS_SHOWN && (
                <button type="button" onClick={() => setShowAll(true)} className="w-full min-h-[56px] rounded-2xl text-[16px] mt-2"
                        style={{ border: '1px dashed var(--line)', color: 'var(--ink-400)' }}>
                  Show {sets.length - SETS_SHOWN} older sets
                </button>
              )}
            </>
          )}

          {alertState === 'on' ? (
            <p className="w-full min-h-[60px] rounded-2xl flex items-center justify-center gap-2.5 text-[18px] mt-7" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--gold-bright)' }}>
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Alerts are on
            </p>
          ) : (
            <button type="button" onClick={() => (user ? setAsk(true) : window.location.assign(`/signup?src=alert&next=${encodeURIComponent(here)}`))}
                    className="w-full min-h-[60px] rounded-2xl flex items-center justify-center gap-2.5 text-[18px] font-semibold mt-7"
                    style={{ background: 'linear-gradient(180deg,var(--gold-fill-top),var(--gold-fill-bottom))', color: 'var(--ink-on-gold)' }}>
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Alert me when one I need is listed
            </button>
          )}
          {alertState && alertState !== 'on' && alertState !== 'saving' && <p className="text-[14px] mt-3" style={{ color: 'var(--ink-200)' }}>{alertState}</p>}
          {source && <p className="text-[12px] mt-8" style={{ color: 'var(--ink-600)' }}>{source} Photos are from sellers’ eBay listings.</p>}
        </>
      )}

      {picked && (
        <Sheet onClose={() => setPick(null)}>
          {photos[picked.id] && saleOf(picked).all > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sized(photos[picked.id], 640)} alt="Seller’s photo" className="block mx-auto mb-4 rounded-lg object-contain" style={{ maxHeight: '38vh', maxWidth: '100%', boxShadow: '0 8px 24px rgba(0,0,0,.45)' }} />
          )}
          <h3 className="font-display italic text-[28px] leading-tight mb-1">{picked.cardName}</h3>
          <p className="text-[16px] mb-4" style={{ color: 'var(--ink-400)' }}>No. {cardNumber(GAME, picked)} · {picked.setName}</p>
          <p className="text-[17px] mb-3" style={{ color: 'var(--ink-200)' }}>{user ? 'Which ones do you have?' : 'Versions'}</p>
          {picked.versions.map((v) => {
            const on = owned.has(`${picked.cardKey}|${v.key}`);
            const plain = label(v);
            const count = forSale ? forSale[`${picked.cardKey}|${v.key}`] || 0 : null;
            const head = (
              <>
                <span className="w-7 h-7 rounded-lg flex-none" style={{ background: swatch(plain), border: '1px solid rgba(255,255,255,.12)' }} aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  {plain}
                  {count > 0 && <span className="text-[15px] ml-2 whitespace-nowrap" style={{ color: 'var(--gold-bright)' }}>{count} for sale</span>}
                  {v.rarityGroup && <span className="block mt-0.5"><GroupDot group={v.rarityGroup} /></span>}
                </span>
                {user && (
                  <span className="w-[30px] h-[30px] rounded-full grid place-items-center flex-none"
                        style={on ? { background: FOIL, color: 'var(--ink-on-gold)' } : { border: '2.5px solid var(--ink-600)' }}>
                    {on && <Check className="w-[17px] h-[17px]" strokeWidth={3} aria-hidden="true" />}
                  </span>
                )}
              </>
            );
            return (
              <div key={v.key} className="rounded-[14px] mb-2.5 overflow-hidden"
                   style={{ background: on ? 'var(--bg-elev-2)' : 'var(--bg-base)', border: `1.5px solid ${on ? 'var(--gold-bright)' : 'var(--line)'}` }}>
                {user ? (
                  <button type="button" onClick={() => toggle(picked, v)} aria-pressed={on}
                          className="w-full flex items-center gap-3.5 min-h-[64px] px-3.5 py-2.5 text-[18px] text-left">{head}</button>
                ) : (
                  <div className="flex items-center gap-3.5 min-h-[64px] px-3.5 py-2.5 text-[18px]">{head}</div>
                )}
                {!on && (
                  <div className="px-3.5 pb-3">
                    {count === null ? (
                      <p className="text-[15px] py-2" style={{ color: 'var(--ink-400)' }}>Checking eBay…</p>
                    ) : count > 0 ? (
                      <a href={`/fables/find?${new URLSearchParams({ ...gameParams(GAME), card: picked.cardKey, version: v.key, name: picked.cardName, no: cardNumber(GAME, picked), label: plain, back: here })}`}
                         className="w-full min-h-[52px] rounded-xl flex items-center justify-center gap-2 text-[17px] font-semibold"
                         style={{ border: '1.5px solid var(--gold-bright)', color: 'var(--gold-bright)' }}>
                        <Search className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Find it
                      </a>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[15px]" style={{ color: 'var(--ink-400)' }}>None for sale right now</span>
                        {alertState === 'on' ? (
                          <span className="text-[15px]" style={{ color: 'var(--gold-bright)' }}>Alerts are on</span>
                        ) : (
                          <button type="button"
                                  onClick={() => { setPick(null); if (user) setAsk(true); else window.location.assign(`/signup?src=alert&next=${encodeURIComponent(here)}`); }}
                                  className="min-h-[48px] px-4 rounded-xl inline-flex items-center gap-2 text-[16px] font-semibold flex-none"
                                  style={{ border: '1.5px solid var(--line)', color: 'var(--ink-100)' }}>
                            <Bell className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />Alert me
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {(() => {
            const sale = saleOf(picked);
            const unnamed = sale.all - sale.named;
            if (unnamed <= 0) return null;
            return (
              <a href={numberHref(picked)} className="flex items-center justify-between gap-2 min-h-[52px] px-3.5 py-2.5 rounded-[14px] mb-2.5 text-[16px]"
                 style={{ border: '1.5px dashed var(--line)', color: 'var(--ink-200)' }}>
                <span>{unnamed} more for sale {unnamed === 1 ? 'doesn’t' : 'don’t'} say which version</span>
                <span className="inline-flex items-center gap-1 flex-none font-semibold" style={{ color: 'var(--gold-bright)' }}>See {unnamed === 1 ? 'it' : 'them'}<ChevronRight className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" /></span>
              </a>
            );
          })()}
          {user ? (
            <BigButton onClick={() => setPick(null)}>Done</BigButton>
          ) : (
            <>
              <p className="text-[16px] mt-4 mb-2" style={{ color: 'var(--ink-200)' }}>Make a free account to mark the cards you have.</p>
              <BigButton onClick={() => window.location.assign(`/signup?src=checklist&next=${encodeURIComponent(here)}`)}>Make a free account</BigButton>
              <button type="button" onClick={() => window.location.assign(`/login?next=${encodeURIComponent(here)}`)}
                      className="w-full min-h-[56px] text-[17px] mt-1.5" style={{ color: 'var(--ink-400)' }}>
                I have an account
              </button>
            </>
          )}
        </Sheet>
      )}

      {ask && (
        <Sheet onClose={() => setAsk(false)}>
          <h3 className="font-display italic text-[28px] leading-tight mb-1">Alert you when one you need is listed?</h3>
          <p className="text-[16px] mb-5" style={{ color: 'var(--ink-400)' }}>We skip the ones you’ve marked as yours. We’ll email you.</p>
          <BigButton onClick={turnOnAlert} disabled={alertState === 'saving'}>{alertState === 'saving' ? 'Saving…' : 'Yes, alert me'}</BigButton>
          <button type="button" onClick={() => setAsk(false)} className="w-full min-h-[56px] text-[17px] mt-1.5" style={{ color: 'var(--ink-400)' }}>Not now</button>
        </Sheet>
      )}
      {pushAsk.node}
    </main>
  );
}

// No list under this name: the spelling help ("Charzard" → Charizard), the same
// name in another game, or a plain search. Never a dead end.
function NotFound({ name, game }) {
  const names = useNameSuggest('fables');
  const [other, setOther] = useState(null);
  useEffect(() => {
    if (!name) return undefined;
    let alive = true;
    const others = VERSION_GAMES.filter((g) => g !== game);
    Promise.all(others.map((g) => fetch(`/api/tcg-versions?game=${g}&q=${encodeURIComponent(name)}&family=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((all) => { if (alive) setOther(others.find((_, i) => all[i]?.cards?.length) || null); });
    return () => { alive = false; };
  }, [name, game]);
  const fix = name && names ? names.didYouMean(name) : null;
  const fixGame = fix ? VERSION_GAMES.find((g) => GAME_NAMES[g] === fix.sport) || null : null;
  const searchFor = fix?.query || name;
  const big = 'w-full min-h-[60px] rounded-2xl flex items-center justify-center text-center px-4 text-[18px] font-semibold';
  const gold = { background: 'linear-gradient(180deg,var(--gold-fill-top),var(--gold-fill-bottom))', color: 'var(--ink-on-gold)' };
  const list = (g, n) => `/fables/checklist?${gameQuery(g)}name=${encodeURIComponent(n)}`;
  return (
    <div>
      {fix ? (
        <p className="text-[20px] mb-4" style={{ color: 'var(--ink-100)' }}>Did you mean <b className="font-semibold">{fix.query}</b>?</p>
      ) : (
        <p className="text-[18px] leading-relaxed mb-4" style={{ color: 'var(--ink-200)' }}>{name ? `We don’t have a card list for “${name}”.` : 'Which card?'}</p>
      )}
      {fixGame && <Link href={list(fixGame, fix.query)} className={big} style={gold}>See every {fix.query} card</Link>}
      {!fix && other && <Link href={list(other, name)} className={big} style={gold}>See every {name} card</Link>}
      <Link href={searchFor ? `/fables?q=${encodeURIComponent(searchFor)}` : '/fables'} className={`${big} mt-2.5`}
            style={fixGame || (!fix && other) ? { border: '1.5px solid var(--line)', color: 'var(--ink-100)' } : gold}>
        {searchFor ? `Search for ${searchFor}` : 'Search for a card'}
      </Link>
      <p className="text-[14px] mt-4" style={{ color: 'var(--ink-400)' }}>Lists cover {VERSION_GAMES_TEXT}. Search covers every game.</p>
    </div>
  );
}


function Ring({ got, n }) {
  if (got > 0 && got === n) {
    return <span className="w-[34px] h-[34px] rounded-full grid place-items-center flex-none" style={{ background: FOIL, color: 'var(--ink-on-gold)' }} aria-label="You have every version"><Check className="w-[18px] h-[18px]" strokeWidth={3} aria-hidden="true" /></span>;
  }
  if (got > 0) {
    return <span className="w-[34px] h-[34px] rounded-full flex-none" style={{ border: '2.5px solid var(--gold-bright)', background: 'conic-gradient(var(--gold-bright) 0 50%, transparent 50% 100%)' }} aria-label="You have some versions" role="img" />;
  }
  return <span className="w-[34px] h-[34px] rounded-full flex-none" style={{ border: '2.5px solid var(--ink-600)' }} aria-hidden="true" />;
}

function Skeleton() {
  return (
    <div aria-label="Loading" role="status">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[72px] rounded-2xl mb-2.5 shimmer" style={{ background: 'var(--bg-elev)' }} />
      ))}
    </div>
  );
}
