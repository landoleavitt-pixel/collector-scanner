'use client';

// Card checklist (DECISIONS.md "Card checklist view", mockups/card-checklist.html,
// approved 2026-11-01). Every card of one Pokémon, newest set first. Each row:
// seller's photo · name · have-it circle. Tap a row to pick which versions you
// have. One button turns on an alert.
//
// Data
//   Versions  /api/tcg-versions (TCGdex catalog, English Pokémon). A family
//             ("Charizard") is ?family=1: every catalog card named with that
//             word (Charizard, Charizard ex, Mega Charizard X ex…).
//   Listings  the card-family search (/api/tcg-family-search), which pins each
//             live listing to a version: a row's photo (seller photos only,
//             never catalog art; none → dashed card) and which versions are
//             for sale, for "Find it" (opens /fables/find for one version).
//   Owned     /api/owned (owned_cards). Private to the member; marking needs a
//             free account, viewing doesn't.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, Lock, Bell, Search } from 'lucide-react';
import { useUser } from '../../../lib/useUser';
import { SIDE } from '../data';

const GAME = 'pokemon';
const SETS_SHOWN = 4;
const FOIL = 'linear-gradient(135deg,#9fe3f5,#b6a8f0,#f0b3d0,#f3d9a0)';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Plain names for versions (Landon: no collector jargon).
function plainLabel(v) {
  const l = (v.label || '').toLowerCase();
  if (l.includes('reverse')) return 'Shiny frame';
  if (v.firstEdition || l.includes('1st edition')) return v.finish === 'holo' || l.includes('holo') ? 'First print, shiny' : 'First print';
  if (l.includes('holo')) return 'Shiny';
  if (l === 'normal') return 'Regular';
  return v.label || 'Regular';
}
function swatch(plain) {
  if (plain.startsWith('Shiny frame')) return 'linear-gradient(135deg,#3a4160 40%,#9fe3f5)';
  if (plain.includes('shiny') || plain === 'Shiny') return FOIL;
  if (plain.startsWith('First print')) return '#1d1d1d';
  return '#8a93a8';
}

export default function Checklist() {
  const router = useRouter();
  const sp = useSearchParams();
  const name = (sp.get('name') || '').trim().slice(0, 60);
  const { user } = useUser();
  const [rows, setRows] = useState(null); // [{ id, set, setName, released, total, number, cardKey, cardName, versions }]
  const [source, setSource] = useState('');
  const [photos, setPhotos] = useState({}); // row id → image url
  const [forSale, setForSale] = useState(null); // `${cardKey}|${versionKey}` → listings for sale now (null while checking)
  const [owned, setOwned] = useState(new Set()); // `${cardKey}|${versionKey}`
  const [ownedError, setOwnedError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [pick, setPick] = useState(null); // row id
  const [ask, setAsk] = useState(false);
  const [alertState, setAlertState] = useState(''); // '' | 'saving' | 'on' | message

  // Versions for every card in the family.
  useEffect(() => {
    if (!name) { setRows([]); return; }
    let alive = true;
    (async () => {
      try {
        // Every card named with those words (Charizard, Charizard ex, Mega Charizard X ex…).
        const found = await fetch(`/api/tcg-versions?game=${GAME}&q=${encodeURIComponent(name)}&family=1`).then((r) => r.json());
        const family = found.cards || [];
        const lists = await Promise.all(family.map((c) => fetch(`/api/tcg-versions?game=${GAME}&card=${encodeURIComponent(c.key)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
        const out = [];
        for (const body of lists) {
          if (!body?.sets) continue;
          if (body.source?.note) setSource(body.source.note);
          for (const s of body.sets) {
            for (const n of s.numbers) {
              out.push({
                id: `${body.card.key}|${s.set}|${n.number}`,
                set: s.set, setName: s.name, released: s.released || '', total: s.total,
                number: n.number, cardKey: body.card.key, cardName: body.card.name, versions: n.versions,
              });
            }
          }
        }
        // Newest set first; card order within a set.
        out.sort((a, b) => b.released.localeCompare(a.released) || a.set.localeCompare(b.set)
          || (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0) || String(a.number).localeCompare(String(b.number)));
        if (alive) setRows(out);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [name]);

  // Live listings: one card-family search for the whole family (cached 15
  // minutes on the server). Each listing is pinned to its catalog printing,
  // which gives each row's photo and which versions are for sale right now.
  useEffect(() => {
    if (!rows?.length) return;
    let alive = true;
    const cardOf = {};
    for (const r of rows) for (const v of r.versions) cardOf[v.key] = r.cardKey;
    const keys = [...new Set(rows.map((r) => r.cardKey))];
    fetch(`/api/tcg-family-search?game=${GAME}&cards=${encodeURIComponent(keys.join(','))}&lang=en&limit=1000`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((d) => {
        if (!alive) return;
        const pics = {};
        const counts = {};
        for (const [v, n] of Object.entries(d?.counts || {})) if (cardOf[v]) counts[`${cardOf[v]}|${v}`] = n;
        for (const it of d?.items || []) {
          const c = it.catalog;
          if (!c || !it.image) continue;
          const id = `${c.card}|${c.set}|${c.number}`;
          if (!pics[id]) pics[id] = it.image.replace(/\/s-l\d+\.(\w+)/, '/s-l300.$1');
        }
        setPhotos(pics);
        setForSale(counts);
      });
    return () => { alive = false; };
  }, [rows]);

  // The member's own marks.
  useEffect(() => {
    if (!user) { setOwned(new Set()); return; }
    fetch(`/api/owned?side=${SIDE}&game=${GAME}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setOwned(new Set((d.owned || []).map((o) => `${o.card_key}|${o.version_key}`))))
      .catch(() => setOwnedError('Your cards couldn’t be loaded right now.'));
  }, [user]);

  const sets = useMemo(() => {
    const groups = [];
    for (const r of rows || []) {
      const last = groups[groups.length - 1];
      if (last && last.set === r.set) last.rows.push(r);
      else groups.push({ set: r.set, name: r.setName, year: r.released.slice(0, 4), rows: [r] });
    }
    return groups;
  }, [rows]);
  const total = (rows || []).reduce((n, r) => n + r.versions.length, 0);
  const have = (rows || []).reduce((n, r) => n + r.versions.filter((v) => owned.has(`${r.cardKey}|${v.key}`)).length, 0);
  const needed = total - have;
  const shownSets = showAll ? sets : sets.slice(0, SETS_SHOWN);
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
    const r = await fetch('/api/saved-searches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${title} cards`, query: title, notify_enabled: true, side: SIDE,
        // A card-family search: every card in the list, one alert. needOnly skips
        // versions the member has once the alert checker supports it.
        filters: { game: GAME, cards: [...new Set((rows || []).map((r) => r.cardKey))], needOnly: true, lang: ['en'] },
      }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) setAlertState(d.watchLimited ? 'Saved, but your 5 alerts are in use. Pause one in Saved searches to turn this on.' : 'on');
    else setAlertState(d.error || 'That didn’t work. Try again.');
    setAsk(false);
  }

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
        <p className="text-[17px] leading-relaxed" style={{ color: 'var(--ink-200)' }}>
          We don’t have a card list for “{name}” yet. Lists cover English Pokémon cards for now.
        </p>
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

          {shownSets.map((g) => (
            <section key={g.set}>
              <h2 className="font-display italic text-[22px] mt-6 mb-2.5" style={{ color: 'var(--ink-200)' }}>{g.name}{g.year && !g.name.includes(g.year) ? ` · ${g.year}` : ''}</h2>
              {g.rows.map((r) => {
                const n = r.versions.length;
                const got = r.versions.filter((v) => owned.has(`${r.cardKey}|${v.key}`)).length;
                return (
                  <button key={r.id} type="button" onClick={() => setPick(r.id)}
                          className="w-full flex items-center gap-3.5 min-h-[72px] px-3.5 py-3 rounded-2xl mb-2.5 text-left"
                          style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
                    <Thumb src={photos[r.id]} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px] font-medium leading-snug" style={{ color: 'var(--ink-100)' }}>{r.cardName}</span>
                      <span className="text-[15px]" style={{ color: 'var(--ink-400)' }}>No. {r.number}{n > 1 ? ` · ${n} versions` : ''}</span>
                    </span>
                    <Ring got={got} n={n} />
                  </button>
                );
              })}
            </section>
          ))}
          {!showAll && sets.length > SETS_SHOWN && (
            <button type="button" onClick={() => setShowAll(true)} className="w-full min-h-[56px] rounded-2xl text-[16px] mt-2"
                    style={{ border: '1px dashed var(--line)', color: 'var(--ink-400)' }}>
              Show {sets.length - SETS_SHOWN} older sets
            </button>
          )}

          {alertState === 'on' ? (
            <p className="w-full min-h-[60px] rounded-2xl flex items-center justify-center gap-2.5 text-[18px] mt-7" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--gold-bright)' }}>
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Alerts are on
            </p>
          ) : (
            <button type="button" onClick={() => (user ? setAsk(true) : window.location.assign(`/signup?src=alert&next=${encodeURIComponent(here)}`))}
                    className="w-full min-h-[60px] rounded-2xl flex items-center justify-center gap-2.5 text-[18px] font-semibold mt-7"
                    style={{ background: 'linear-gradient(180deg,var(--gold-fill-top),var(--gold-fill-bottom))', color: 'var(--ink-on-gold)' }}>
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Alert me when a {title} card is for sale
            </button>
          )}
          {alertState && alertState !== 'on' && alertState !== 'saving' && <p className="text-[14px] mt-3" style={{ color: 'var(--ink-200)' }}>{alertState}</p>}
          {source && <p className="text-[12px] mt-8" style={{ color: 'var(--ink-600)' }}>{source} Photos are from sellers’ eBay listings.</p>}
        </>
      )}

      {picked && (
        <Sheet onClose={() => setPick(null)}>
          <h3 className="font-display italic text-[28px] leading-tight mb-1">{picked.cardName}</h3>
          <p className="text-[16px] mb-4" style={{ color: 'var(--ink-400)' }}>No. {picked.number} · {picked.setName}</p>
          <p className="text-[17px] mb-3" style={{ color: 'var(--ink-200)' }}>{user ? 'Which ones do you have?' : 'Versions'}</p>
          {picked.versions.map((v) => {
            const on = owned.has(`${picked.cardKey}|${v.key}`);
            const plain = plainLabel(v);
            const count = forSale ? forSale[`${picked.cardKey}|${v.key}`] || 0 : null;
            const head = (
              <>
                <span className="w-7 h-7 rounded-lg flex-none" style={{ background: swatch(plain), border: '1px solid rgba(255,255,255,.12)' }} aria-hidden="true" />
                <span className="flex-1">{plain}</span>
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
                      <a href={`/fables/find?${new URLSearchParams({ card: picked.cardKey, version: v.key, name: picked.cardName, no: picked.number, label: plain, back: here })}`}
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
          <h3 className="font-display italic text-[28px] leading-tight mb-1">Alert you when a {title} card is for sale?</h3>
          <p className="text-[16px] mb-5" style={{ color: 'var(--ink-400)' }}>We’ll email you.</p>
          <BigButton onClick={turnOnAlert} disabled={alertState === 'saving'}>{alertState === 'saving' ? 'Saving…' : 'Yes, alert me'}</BigButton>
          <button type="button" onClick={() => setAsk(false)} className="w-full min-h-[56px] text-[17px] mt-1.5" style={{ color: 'var(--ink-400)' }}>Not now</button>
        </Sheet>
      )}
    </main>
  );
}

function Thumb({ src }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Seller’s photo" onError={() => setBad(true)} className="w-12 h-[66px] rounded-md object-cover flex-none" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.4)' }} />;
  }
  return <span className="w-12 h-[66px] rounded-md flex-none" style={{ border: '1.5px dashed var(--line)' }} aria-label="None for sale right now" role="img" />;
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

function BigButton({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
            className="w-full min-h-[60px] rounded-2xl text-[18px] font-semibold mt-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(180deg,var(--gold-fill-top),var(--gold-fill-bottom))', color: 'var(--ink-on-gold)' }}>
      {children}
    </button>
  );
}

// Bottom sheet on phones, centred box on wider screens.
function Sheet({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
           className="w-full md:w-[440px] max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl px-[18px] pt-3.5 pb-7"
           style={{ background: 'var(--bg-elev)', borderTop: '1px solid var(--line)', paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
        <div className="w-10 h-[5px] rounded-full mx-auto mb-4 md:hidden" style={{ background: 'var(--line)' }} />
        {children}
      </div>
    </div>
  );
}
