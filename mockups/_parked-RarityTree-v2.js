'use client';

// app/components/RarityTree.js
//
// The rarity tree inside CardModal. Always visible: a hero line saying where
// this card sits, plus a colour strip with one segment per print-run rung.
// "Full rainbow" opens the ladder: rungs grouped under the tier chips,
// folded to two rungs either side of this card, a Hobby/Retail filter, and
// the unnumbered parallels as a chip cloud with pack odds.
//
// Design: mockups/rarity-tree.html (approved 2026-10-19).
//
// Props:
//   setData     - set object from lib/parallelData.js, or null if unknown
//   parallelKey - matched parallel key, or null
//   printRun    - serial print run from the title (detection.run or the
//                 search result's run). Used to light a rung when the title
//                 names no parallel, and for the hobby-wide ladder when the
//                 set is unknown.

import { useState } from 'react';
import { getRungs, getParallel } from '../../lib/parallelData';
import { gradientCss, tierChipStyle, universalTierForRun } from './rarityUtils';

const TIERS = [
  { key: '1of1',   label: '1 of 1', range: '1',       lo: 1,   hi: 1 },
  { key: 'grail',  label: 'Grail',  range: '2–25',    lo: 2,   hi: 25 },
  { key: 'ultra',  label: 'Ultra',  range: '26–99',   lo: 26,  hi: 99 },
  { key: 'rare',   label: 'Rare',   range: '100–249', lo: 100, hi: 249 },
  { key: 'scarce', label: 'Scarce', range: '250+',    lo: 250, hi: Infinity },
];
const tierOf = (run) => TIERS.find((t) => run >= t.lo && run <= t.hi);
const chipStyle = (tierKey) => tierChipStyle(tierKey === '1of1' ? 'grail' : tierKey);

const BOXES = {
  hobby: ['Hobby', 'Jumbo', 'Breaker'],
  retail: ['Blaster', 'Monster', 'Mega', 'Fanatics Mega'],
};
const RETAIL_EXCLUSIVE = /retail|blaster|mega|monster/i;
function inBox(p, box) {
  if (box === 'all') return true;
  if (p.odds) return BOXES[box].some((b) => p.odds[b]);
  // No odds published (Prizm, Young Guns): fall back to the exclusive tag.
  if (!p.exclusive) return true;
  return box === 'retail' ? RETAIL_EXCLUSIVE.test(p.exclusive) : !RETAIL_EXCLUSIVE.test(p.exclusive);
}

// "Orange Wave Refractor" → "Orange Wave". The plain "Refractor" stays.
const shortName = (n) => (n === 'Refractor' ? n : n.replace(/ Refractor$/, ''));

const ODDS_ORDER = ['Hobby', 'Blaster', 'Monster', 'Mega', 'Jumbo', 'Breaker'];
function oddsText(p) {
  const k = ODDS_ORDER.find((b) => p.odds?.[b]);
  if (k) return `${p.odds[k]} ${k.toLowerCase()}`;
  return p.exclusive || p.note || '';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function RarityTree({ setData, parallelKey, printRun }) {
  if (!setData) return <UnknownSet printRun={printRun} />;
  return <KnownSet setData={setData} parallelKey={parallelKey} printRun={printRun} />;
}

// ──────────────────────────────────────────────────────────────────────
// Known set
// ──────────────────────────────────────────────────────────────────────

function KnownSet({ setData, parallelKey, printRun }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState('all');
  const [showRarer, setShowRarer] = useState(false);
  const [showCommoner, setShowCommoner] = useState(false);

  const rungs = getRungs(setData);
  const unnumbered = setData.parallels.unnumbered || [];
  const numberedCount = rungs.reduce((n, r) => n + r.parallels.length, 0);

  const matched = parallelKey ? setData.parallels && findParallel(setData, parallelKey) : null;
  const activeRun = matched ? matched.run : (printRun && rungs.some((r) => r.run === Number(printRun)) ? Number(printRun) : null);
  const mi = activeRun ? rungs.findIndex((r) => r.run === activeRun) : -1;
  const rung = mi >= 0 ? rungs[mi] : null;

  // Hero copy for the four cases: numbered match, serial only, unnumbered
  // match, and a base card with nothing to place.
  let big, sub;
  if (matched && rung) {
    const odds = oddsText(matched);
    big = <><b>{shortName(matched.name)}</b> /{rung.run}</>;
    sub = [
      odds && odds[0].toUpperCase() + odds.slice(1),
      `${plural(rung.parallels.length, 'parallel')} at /${rung.run}`,
      `${plural(mi, 'rarer rung')} above`,
    ].filter(Boolean).join(' · ');
  } else if (rung) {
    big = <><b>/{rung.run}</b> · {shortName(rung.parallels[0].name)} rung</>;
    sub = `This card is /${rung.run}. The title doesn't name the parallel, so we're showing its rung.`;
  } else if (matched) {
    const odds = oddsText(matched);
    big = <b>{shortName(matched.name)}</b>;
    sub = `Unnumbered${odds ? ` · ${odds}` : ''}. Rarity comes from pack odds, not a serial number.`;
  } else {
    big = <span className="rt-muted">Base card</span>;
    sub = `Not a parallel. The ${setData.label} rainbow has ${numberedCount} numbered and ${unnumbered.length} unnumbered parallels.`;
  }

  // Ladder window: two rungs either side of this card, or the rarest five.
  const anchor = mi >= 0 ? mi : 2;
  const lo = showRarer ? 0 : Math.max(0, anchor - 2);
  const hi = showCommoner ? rungs.length - 1 : Math.min(rungs.length - 1, anchor + 2);

  return (
    <div className="rt" data-no-tilt>
      <div className="rt-hero">
        <div className="rt-label">Rarity · {setData.label}</div>
        <div className="rt-big">{big}</div>
        <div className="rt-sub">{sub}</div>
        {mi >= 0 && (
          <div className="rt-rank">
            <div className="rt-rank-n">#{mi + 1}</div>
            <div className="rt-rank-of">of {rungs.length} rungs</div>
          </div>
        )}
      </div>

      <div className="rt-strip" aria-hidden="true">
        <div className="rt-strip-bar">
          {[...rungs].reverse().map((r) => (
            <i key={r.run} className={r.run === activeRun ? 'on' : ''}
               style={{ background: gradientCss(r.parallels[0].gradient) }} />
          ))}
        </div>
        <div className="rt-strip-ends">
          <span>/{rungs[rungs.length - 1]?.run} · most copies</span>
          <span>rarest · /{rungs[0]?.run}</span>
        </div>
      </div>

      <div className="rt-toolbar">
        {open ? (
          <div className="rt-seg" role="group" aria-label="Filter by box type">
            {['all', 'hobby', 'retail'].map((b) => (
              <button key={b} type="button" className={box === b ? 'on' : ''} onClick={() => setBox(b)}>
                {b[0].toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
        ) : (
          <span className="rt-count">{numberedCount} numbered · {unnumbered.length} unnumbered</span>
        )}
        <button type="button" className="rt-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide ▴' : 'Full rainbow ▾'}
        </button>
      </div>

      {open && (
        <div className="rt-ladder ff-tree-reveal">
          {lo > 0 && (
            <Fold rungs={rungs.slice(0, lo)} label="rarer" onOpen={() => setShowRarer(true)} />
          )}
          {rungs.slice(lo, hi + 1).map((r, i, arr) => {
            const t = tierOf(r.run);
            const prev = i > 0 ? tierOf(arr[i - 1].run) : null;
            const on = r.run === activeRun;
            return (
              <div key={r.run}>
                {t !== prev && (
                  <div className="rt-tier">
                    <span className="rt-chip" style={chipStyle(t.key)}>{t.label}</span>
                    <span>{t.range}</span>
                  </div>
                )}
                <div className={`rt-rung${on ? ' on' : ''}`}>
                  <div className="rt-run">/{r.run}</div>
                  <div className="rt-chips">
                    {r.parallels.map((p) => (
                      <ParallelChip key={p.key} p={p} me={on && p.key === parallelKey} dim={!inBox(p, box)} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {hi < rungs.length - 1 && (
            <Fold rungs={rungs.slice(hi + 1)} label="more common" onOpen={() => setShowCommoner(true)} />
          )}

          {unnumbered.length > 0 && (
            <div className="rt-unnum">
              <div className="rt-h">Unnumbered · by pack odds</div>
              <div className="rt-chips">
                {unnumbered.map((p) => (
                  <ParallelChip key={p.key} p={p} me={p.key === parallelKey} dim={!inBox(p, box)} odds={oddsText(p)} />
                ))}
              </div>
            </div>
          )}

          <div className="rt-source">
            {setData.note && <>{setData.note} </>}
            Base parallels only. Source:{' '}
            {setData.source?.url
              ? <a href={setData.source.url} target="_blank" rel="noopener noreferrer">{setData.source.name}</a>
              : setData.source?.name}
          </div>
        </div>
      )}
      <TreeStyles />
    </div>
  );
}

function findParallel(setData, key) {
  return [...setData.parallels.numbered, ...setData.parallels.unnumbered].find((p) => p.key === key) || null;
}

function ParallelChip({ p, me, dim, odds }) {
  return (
    <span className={`rt-p${me ? ' me' : ''}${dim ? ' dim' : ''}`} title={oddsText(p) || undefined}>
      <span className="rt-sw" style={{ background: gradientCss(p.gradient) }} />
      {shortName(p.name)}
      {odds && <small>{odds}</small>}
      {me && <span className="rt-here">This card</span>}
    </span>
  );
}

function Fold({ rungs, label, onOpen }) {
  const n = rungs.length;
  const range = n > 1 ? `/${rungs[0].run}–/${rungs[n - 1].run}` : `/${rungs[0].run}`;
  return (
    <button type="button" className="rt-fold" onClick={onOpen}>
      <span className="rt-mini">
        {rungs.map((r) => <i key={r.run} style={{ background: gradientCss(r.parallels[0].gradient) }} />)}
      </span>
      {plural(n, `${label} rung`).replace(`${label} rungs`, `${label} rungs`)} · {range}
      <b>Show ▾</b>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Unknown set: hobby-wide ladder by print run
// ──────────────────────────────────────────────────────────────────────

function UnknownSet({ printRun }) {
  const run = Number(printRun) || null;
  const active = run ? universalTierForRun(run) : null;
  const activeTier = TIERS.find((t) => t.key === active);

  if (!run) {
    return (
      <div className="rt" data-no-tilt>
        <div className="rt-hero">
          <div className="rt-label">Rarity</div>
          <div className="rt-big rt-muted rt-big-sm">No print run listed</div>
          <div className="rt-sub rt-muted">The seller didn&apos;t include a serial number, so we can&apos;t place this card yet.</div>
        </div>
        <Notice>If it&apos;s an unnumbered parallel, its pack odds appear here once we&apos;ve mapped this card&apos;s rainbow.</Notice>
        <TreeStyles />
      </div>
    );
  }

  return (
    <div className="rt" data-no-tilt>
      <div className="rt-hero">
        <div className="rt-label">Rarity · by print run</div>
        <div className="rt-big"><b>/{run}</b> · {activeTier.label === '1 of 1' ? 'One of one' : activeTier.label}</div>
        <div className="rt-sub">Where /{run} sits on the hobby-wide rarity ladder.</div>
      </div>
      <Notice>
        We haven&apos;t mapped this card&apos;s rainbow yet (autos and inserts have their own), so this uses hobby-wide tiers.
      </Notice>
      <div className="rt-ladder rt-ladder-flat">
        {TIERS.map((t) => {
          const on = t.key === active;
          const width = Math.max(4, (Math.log(Math.min(t.hi, 499) + 1) / Math.log(500)) * 100);
          return (
            <div key={t.key} className={`rt-urow${on ? ' on' : ''}`}>
              <div className="rt-urow-name">
                <span className="rt-chip" style={chipStyle(t.key)}>{t.label}</span>
                {on && <span className="rt-here">This card</span>}
              </div>
              <div className="rt-bar" style={{ width: `${width}%` }} />
              <div className="rt-urow-range">{t.range}</div>
            </div>
          );
        })}
      </div>
      <TreeStyles />
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="rt-notice">
      {children}{' '}
      <a href="mailto:contribute@fieldsandfloors.com">Know it? Send us the list →</a>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Styles. Tokens only; parallel colours come from the data.
// ──────────────────────────────────────────────────────────────────────

const gold = (pct) => `color-mix(in srgb, var(--gold) ${pct}%, transparent)`;
const goldBright = (pct) => `color-mix(in srgb, var(--gold-bright) ${pct}%, transparent)`;
const ink = (pct) => `color-mix(in srgb, var(--ink-200) ${pct}%, transparent)`;

function TreeStyles() {
  return (
    <style jsx global>{`
      .rt { border: 1px solid var(--line); border-radius: 12px; background: var(--bg-base); overflow: hidden; text-align: left; }
      .rt-muted { color: var(--ink-400); }

      .rt-hero { padding: 16px 18px 12px; display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; align-items: end; }
      .rt-label { grid-column: 1 / -1; font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--ink-400); }
      .rt-big { font: italic 400 30px/1.05 'Instrument Serif', serif; color: var(--ink-100); }
      .rt-big b { font-weight: 400; color: var(--gold-bright); }
      .rt-big-sm { font-size: 22px; color: var(--ink-200); }
      .rt-sub { grid-column: 1; font-size: 13px; line-height: 1.45; color: var(--ink-200); }
      .rt-rank { grid-row: 2 / 4; grid-column: 2; text-align: right; }
      .rt-rank-n { font: 400 40px/1 'Instrument Serif', serif; color: var(--gold-bright); }
      .rt-rank-of { font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-400); }

      .rt-strip { padding: 2px 18px 16px; }
      .rt-strip-bar { display: flex; gap: 2px; height: 14px; }
      .rt-strip-bar i { flex: 1; border-radius: 2px; opacity: .5; box-shadow: inset 0 0 0 .5px ${ink(18)}; }
      .rt-strip-bar i.on { flex: 1.6; opacity: 1; outline: 2px solid var(--gold-bright); outline-offset: 2px; }
      .rt-strip-ends { display: flex; justify-content: space-between; margin-top: 8px; font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-600); }

      .rt-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 18px; border-top: 1px solid var(--line); background: var(--bg-elev-2); }
      .rt-count { font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-600); }
      .rt-seg { display: inline-flex; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
      .rt-seg button { border: 0; background: transparent; color: var(--ink-400); font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .08em; padding: 6px 10px; cursor: pointer; }
      .rt-seg button.on { background: ${gold(14)}; color: var(--gold-bright); }
      .rt-toggle { border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--gold-bright); font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; padding: 6px 10px; cursor: pointer; white-space: nowrap; }

      .rt-ladder { padding: 6px 12px 14px; border-top: 1px solid var(--line); }
      .rt-ladder-flat { border-top: 0; padding-top: 0; }
      .rt-tier { display: flex; align-items: center; gap: 8px; margin: 12px 6px 4px; font: 500 11px 'Geist Mono', ui-monospace, monospace; color: var(--ink-600); }
      .rt-tier::after { content: ''; flex: 1; height: 1px; background: var(--line-soft); }
      .rt-chip { display: inline-block; font: 700 10px 'Geist Mono', ui-monospace, monospace; letter-spacing: .04em; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }

      .rt-rung { display: grid; grid-template-columns: 52px 1fr; gap: 10px; align-items: start; padding: 7px 6px; border-radius: 8px; }
      .rt-rung.on { background: ${gold(9)}; box-shadow: inset 0 0 0 1px ${goldBright(40)}; }
      .rt-run { font: 500 13px/22px 'Geist Mono', ui-monospace, monospace; text-align: right; color: var(--ink-400); }
      .rt-rung.on .rt-run { color: var(--gold-bright); }
      .rt-chips { display: flex; flex-wrap: wrap; gap: 5px; }
      .rt-p { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; color: var(--ink-200); padding: 1px 8px 1px 3px; border-radius: 5px; background: var(--bg-elev); border: 1px solid var(--line-soft); white-space: nowrap; transition: opacity .15s; }
      .rt-p small { font: 500 10px 'Geist Mono', ui-monospace, monospace; letter-spacing: .04em; color: var(--ink-600); }
      .rt-p.dim { opacity: .28; }
      .rt-p.me { background: ${gold(16)}; border-color: var(--gold-bright); color: var(--ink-100); font-weight: 500; }
      .rt-sw { width: 14px; height: 14px; border-radius: 3px; flex: none; box-shadow: inset 0 0 0 .5px ${ink(25)}; }
      .rt-here { font: 600 10px 'Geist Mono', ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--bg-base); background: var(--gold-bright); padding: 1px 5px; border-radius: 3px; margin-left: 2px; }

      .rt-fold { display: flex; align-items: center; gap: 10px; width: calc(100% - 12px); margin: 4px 6px; padding: 8px 10px; border: 1px dashed var(--line); border-radius: 8px; background: transparent; color: var(--ink-400); font: 500 12px 'Geist', system-ui, sans-serif; text-align: left; cursor: pointer; }
      .rt-fold b { margin-left: auto; font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; color: var(--gold-bright); }
      .rt-mini { display: flex; gap: 2px; flex: none; }
      .rt-mini i { width: 8px; height: 10px; border-radius: 2px; opacity: .7; }

      .rt-unnum { margin: 10px 6px 0; padding-top: 12px; border-top: 1px solid var(--line); }
      .rt-h { margin-bottom: 8px; font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--ink-400); }
      .rt-source { margin: 12px 6px 0; font-size: 12px; line-height: 1.5; color: var(--ink-600); }
      .rt-source a, .rt-notice a { color: var(--gold-bright); text-decoration: none; border-bottom: 1px solid var(--gold-deep); }

      .rt-notice { margin: 0 18px 14px; padding: 12px 14px; border-radius: 8px; border: 1px dashed ${gold(35)}; font-size: 13px; line-height: 1.55; color: var(--ink-200); }
      .rt-urow { display: grid; grid-template-columns: 1fr 64px; gap: 4px 10px; align-items: center; padding: 6px 8px; border-radius: 8px; }
      .rt-urow.on { background: ${gold(9)}; box-shadow: inset 0 0 0 1px ${goldBright(40)}; }
      .rt-urow-name { display: flex; gap: 8px; align-items: center; }
      .rt-bar { height: 6px; border-radius: 3px; background: linear-gradient(90deg, var(--gold-deep), var(--gold)); }
      .rt-urow-range { grid-row: 1 / 3; grid-column: 2; text-align: right; font: 500 13px 'Geist Mono', ui-monospace, monospace; color: var(--ink-400); }
      .rt-urow.on .rt-urow-range { color: var(--gold-bright); }

      @media (max-width: 480px) {
        .rt-hero { padding: 14px 14px 10px; }
        .rt-big { font-size: 26px; }
        .rt-strip, .rt-toolbar { padding-left: 14px; padding-right: 14px; }
        .rt-ladder { padding: 4px 6px 12px; }
        .rt-rung { grid-template-columns: 44px 1fr; gap: 8px; }
        .rt-notice { margin-left: 14px; margin-right: 14px; }
      }
    `}</style>
  );
}
