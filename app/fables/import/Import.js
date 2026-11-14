'use client';

// "Import a CSV file" (DECISIONS 2026-11-14, item 5): mark the cards you own
// from a collection export, in two steps: a preview (nothing saved), then
// "Add N to my lists". Data: POST /api/owned/import (signed in). The file is
// read in the browser and sent as text; the server matches it in memory and
// keeps nothing but the matched marks. No apps are named (Landon reads their
// terms first).

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, FileUp, Check } from 'lucide-react';
import { VERSION_GAMES, GAME_NAMES, versionLabel } from '../versions';

const MAX_BYTES = 5 * 1024 * 1024;
// The engine's reasons, in plainer words.
const REASON = {
  'game not given, and more than one game has that card': 'More than one game has this card. Pick the game above and check again.',
  'no card with that set and number in any game': 'We couldn’t find this set and number.',
  'marked as a proxy': 'Marked as a proxy, so it’s left out.',
  'not an English card (our card lists are English)': 'Not an English card. Our card lists are English only.',
  'set not recognised': 'We don’t know this set.',
  'card number missing': 'There’s no card number.',
  'no card with that number in that set': 'No card with that number in this set.',
  'the name in the file is a different card': 'The name doesn’t match the card at that number.',
  'more than one card fits; add the set code': 'More than one card fits. Adding the set code helps.',
  'finish or rarity not given, and the card comes in several': 'It doesn’t say which finish, and this card comes in more than one.',
  'that finish isn’t one of this card’s versions': 'That finish isn’t one this card comes in.',
  "that finish isn't one of this card's versions": 'That finish isn’t one this card comes in.',
};
const plainReason = (r) => REASON[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Didn’t match.');

export default function Import() {
  const [file, setFile] = useState(null); // { name, text }
  const [game, setGame] = useState('');
  const [state, setState] = useState(''); // '' | 'checking' | 'saving' | 'saved' | 'signin' | error text
  const [preview, setPreview] = useState(null);
  const [showAll, setShowAll] = useState(false);

  function pick(e) {
    const f = e.target.files?.[0];
    setPreview(null); setState('');
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) { setFile(null); setState('That file is larger than 5 MB. Try a smaller export.'); return; }
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, text: String(reader.result || '') });
    reader.onerror = () => setState('That file couldn’t be read. Try again.');
    reader.readAsText(f);
  }

  async function send(save) {
    if (!file) return;
    setState(save ? 'saving' : 'checking');
    const r = await fetch('/api/owned/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: file.text, ...(game ? { game } : {}), save }),
    }).catch(() => null);
    if (r?.status === 401) { setState('signin'); return; }
    const d = r ? await r.json().catch(() => null) : null;
    if (!r?.ok || !d) { setState(d?.error || 'That didn’t work. Try again.'); return; }
    setPreview(d);
    setState(save ? 'saved' : '');
  }

  const matched = preview?.matched || [];
  const unmatched = preview?.unmatched || [];
  const total = preview?.total ?? (matched.length + unmatched.length);

  return (
    <main className="max-w-[640px] mx-auto px-[18px] md:px-6 pt-4 md:pt-8 pb-28">
      <Link href="/fables/lists" className="inline-flex items-center gap-1.5 text-body min-h-[44px]" style={{ color: 'var(--ink-400)' }}>
        <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />Card lists
      </Link>
      <h1 className="font-display italic text-h1 leading-none mt-1 mb-3">Import a CSV file</h1>
      <p className="text-lede mb-5" style={{ color: 'var(--ink-200)' }}>Mark the cards you own in one go, from a CSV file exported from another collection app.</p>

      {state === 'signin' ? (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <p className="text-lede m-0" style={{ color: 'var(--ink-100)' }}>Sign in to add cards to your lists.</p>
          <Link href="/signup?src=import&next=/fables/import" className="flex items-center justify-center min-h-[52px] rounded-xl text-lede font-semibold mt-4"
                style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>Make a free account</Link>
          <Link href="/login?next=/fables/import" className="flex items-center justify-center min-h-[48px] text-body mt-1" style={{ color: 'var(--ink-400)' }}>I have an account</Link>
        </div>
      ) : state === 'saved' ? (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--accent-deep)' }}>
          <p className="text-lede m-0 flex items-center gap-2" style={{ color: 'var(--ink-100)' }}>
            <Check className="w-5 h-5" strokeWidth={2.5} style={{ color: 'var(--accent-bright)' }} aria-hidden="true" />
            Added {(preview?.saved ?? matched.length).toLocaleString('en-US')} cards to your lists.
          </p>
          <Link href="/fables/still-need" className="flex items-center justify-center min-h-[52px] rounded-xl text-lede font-semibold mt-4"
                style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>See what you still need</Link>
        </div>
      ) : (
        <>
          {/* 1. The file */}
          <label className="flex items-center gap-3 min-h-[64px] px-4 rounded-xl cursor-pointer" style={{ background: 'var(--bg-elev)', border: '1.5px dashed var(--line)' }}>
            <FileUp className="w-6 h-6 flex-none" strokeWidth={1.75} style={{ color: 'var(--accent-bright)' }} aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-lede truncate" style={{ color: 'var(--ink-100)' }}>{file ? file.name : 'Choose a CSV file'}</span>
              <span className="text-meta" style={{ color: 'var(--ink-400)' }}>Up to 5 MB and 1,000 rows</span>
            </span>
            <input type="file" accept=".csv,text/csv" onChange={pick} className="sr-only" />
          </label>

          {/* 2. The game, if the file doesn't say */}
          <p className="text-body mt-5 mb-2" style={{ color: 'var(--ink-200)' }}>Which game? <span style={{ color: 'var(--ink-400)' }}>(Only if your file doesn’t say)</span></p>
          <div className="flex flex-wrap gap-2">
            {[['', 'Any'], ...VERSION_GAMES.map((g) => [g, GAME_NAMES[g]])].map(([g, l]) => (
              <button key={l} type="button" aria-pressed={game === g} onClick={() => { setGame(g); setPreview(null); }}
                      className="ff-pill inline-flex items-center rounded-full text-body whitespace-nowrap"
                      style={{ minHeight: 40, padding: '0 14px', ...(game === g
                        ? { background: 'var(--accent-bright)', color: 'var(--ink-on-accent)', border: '1px solid var(--accent-bright)', fontWeight: 600 }
                        : { border: '1px solid var(--line)', background: 'var(--bg-elev-2)', color: 'var(--ink-200)' }) }}>{l}</button>
            ))}
          </div>

          {!preview && (
            <button type="button" onClick={() => send(false)} disabled={!file || state === 'checking'}
                    className="w-full min-h-[58px] rounded-xl text-lede font-semibold mt-6 disabled:opacity-50"
                    style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>
              {state === 'checking' ? 'Checking your file…' : 'Check my file'}
            </button>
          )}
          {state && !['checking', 'saving'].includes(state) && <p className="text-body mt-3" style={{ color: 'var(--crit)' }}>{state}</p>}

          {/* 3. The preview: nothing is saved yet */}
          {preview && (
            <section className="mt-7">
              <p className="text-lede m-0" style={{ color: 'var(--ink-100)' }}>
                We matched <b className="font-semibold">{matched.length.toLocaleString('en-US')} of {total.toLocaleString('en-US')}</b> rows.
                {unmatched.length > 0 && <> {unmatched.length.toLocaleString('en-US')} didn’t match.</>}
              </p>
              {preview.cut && <p className="text-meta mt-1" style={{ color: 'var(--ink-400)' }}>Your file had more than 1,000 rows. We checked the first 1,000.</p>}

              {matched.length > 0 && (
                <div className="rounded-xl px-3.5 mt-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
                  {(showAll ? matched : matched.slice(0, 8)).map((m, i) => (
                    <div key={`${m.card}|${m.version}|${i}`} className="flex items-center justify-between gap-3 min-h-[52px] py-2" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <span className="min-w-0">
                        <span className="block text-body" style={{ color: 'var(--ink-100)' }}>{m.cardName}</span>
                        <span className="text-meta" style={{ color: 'var(--ink-400)' }}>{GAME_NAMES[m.game]} · {versionLabel(m.game, { label: m.label, key: m.version })}</span>
                      </span>
                      {m.qty > 1 && <span className="text-meta flex-none" style={{ color: 'var(--ink-400)' }}>×{m.qty}</span>}
                    </div>
                  ))}
                  {matched.length > 8 && !showAll && (
                    <button type="button" onClick={() => setShowAll(true)} className="w-full min-h-[44px] text-meta text-left" style={{ color: 'var(--ink-400)' }}>Show all {matched.length}</button>
                  )}
                </div>
              )}

              {unmatched.length > 0 && (
                <>
                  <h2 className="font-display text-h3 mt-6 mb-2" style={{ color: 'var(--ink-200)' }}>Didn’t match</h2>
                  <div className="rounded-xl px-3.5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
                    {unmatched.slice(0, 50).map((u) => (
                      <div key={u.line} className="py-2.5" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <span className="block text-body" style={{ color: 'var(--ink-100)' }}>{[u.name, u.set, u.number && `No. ${u.number}`].filter(Boolean).join(' · ') || `Row ${u.line}`}</span>
                        <span className="text-meta" style={{ color: 'var(--ink-400)' }}>Row {u.line}: {plainReason(u.reason)}</span>
                      </div>
                    ))}
                    {unmatched.length > 50 && <p className="text-meta py-2.5 m-0" style={{ color: 'var(--ink-400)' }}>And {unmatched.length - 50} more.</p>}
                  </div>
                </>
              )}

              {matched.length > 0 ? (
                <button type="button" onClick={() => send(true)} disabled={state === 'saving'}
                        className="w-full min-h-[58px] rounded-xl text-lede font-semibold mt-6 disabled:opacity-60"
                        style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>
                  {state === 'saving' ? 'Adding…' : `Add ${matched.length.toLocaleString('en-US')} to my lists`}
                </button>
              ) : (
                <p className="text-body mt-5" style={{ color: 'var(--ink-400)' }}>Nothing matched, so nothing will be added.</p>
              )}
              <button type="button" onClick={() => { setPreview(null); setShowAll(false); }} className="w-full min-h-[48px] text-body mt-1" style={{ color: 'var(--ink-400)' }}>Start again</button>
            </section>
          )}
        </>
      )}
      <p className="text-meta text-center mt-8" style={{ color: 'var(--ink-600)' }}>Your file is read once and not kept. Your cards stay private.</p>
    </main>
  );
}
