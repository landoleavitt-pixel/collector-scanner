'use client';

// app/components/RarityTree.js
//
// The rarity ladder inside CardModal. One row ("rung") per print run,
// rarest at the top, with this card's photo on its own row. Written to be
// read in five seconds: plain words ("Only 25 made", "About 1 in 733 hobby
// packs"), one name on screen (this card's), and other colours only as dots
// until a row is tapped.
//
// Layout: the rungs from mockups/rarity-tree.html (v2), with the clarity
// rules from mockups/rarity-tree-v3.html. Chosen by Landon 2026-10-19.
//
// Autograph lists (setData.kind === 'auto') use the same ladder; only the
// words change ("Base autograph", "signed versions").
//
// Props:
//   setData     - set object from lib/parallelData.js, or null if unknown
//   parallelKey - matched parallel key, or null
//   printRun    - serial print run from the title. Lights a row when the
//                 title names no colour, and drives the hobby-wide ladder
//                 when the set is unknown.
//   imageUrl    - listing photo, shown on this card's row

import { useState } from 'react';
import { getRungs } from '../../lib/parallelData';
import { gradientCss, universalTierForRun } from './rarityUtils';
import { ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';

const TIERS = [
  { key: '1of1',   label: '1 of 1', lo: 1,   hi: 1,        made: '1 made' },
  { key: 'grail',  label: 'Grail',  lo: 2,   hi: 25,       made: '2 to 25 made' },
  { key: 'ultra',  label: 'Ultra',  lo: 26,  hi: 99,       made: '26 to 99 made' },
  { key: 'rare',   label: 'Rare',   lo: 100, hi: 249,      made: '100 to 249 made' },
  { key: 'scarce', label: 'Scarce', lo: 250, hi: Infinity, made: '250 or more made' },
];
const tierOf = (run) => TIERS.find((t) => run >= t.lo && run <= t.hi);

// "Orange Wave Refractor" → "Orange Wave", "Silver Prizm" → "Silver".
const shortName = (n) => {
  if (n === 'Refractor') return n;
  return n.replace(/ (Refractor|Prizm)$/, '');
};

const BOX_WORDS = {
  Hobby: 'hobby packs', Jumbo: 'jumbo packs', Breaker: "Breaker's Delight packs",
  Blaster: 'blaster packs', Monster: 'monster box packs', Mega: 'mega box packs',
  'Fanatics Mega': 'Fanatics mega box packs', 'Value Blaster': 'value blaster packs',
  Hanger: 'hanger packs', FDI: 'First Day Issue packs', Fanatics: 'Fanatics box packs',
  Packs: 'packs', Bulk: 'bulk box packs',
};
const ODDS_ORDER = ['Hobby', 'Packs', 'Blaster', 'Value Blaster', 'Mega', 'Monster', 'Jumbo', 'Hanger', 'FDI', 'Breaker'];
const EXCLUSIVE_WORDS = { FDI: 'First Day Issue', Breaker: "Breaker's Delight", Super: 'Super Box' };

/** "About 1 in 733 hobby packs", or the box it's exclusive to, or null. */
function oddsLine(p) {
  const k = ODDS_ORDER.find((b) => p.odds?.[b]);
  if (k) {
    const n = p.odds[k].replace(/^1:/, '');
    const line = Number(n.replace(/,/g, '')) < 1
      ? `Several in every ${BOX_WORDS[k].replace(/s$/, '')}`
      : `About 1 in ${n} ${BOX_WORDS[k]}`;
    // The plain autograph's odds are for the whole set, any colour.
    return p.oddsAnyColour ? `Any colour: ${line.charAt(0).toLowerCase()}${line.slice(1)}` : line;
  }
  if (p.exclusive) {
    const ex = EXCLUSIVE_WORDS[p.exclusive] || p.exclusive;
    return /pack$/i.test(ex) ? `Only in ${ex}s` : `Only in ${ex} boxes`;
  }
  return null;
}

const made = (run) => (run === 1 ? 'One of one' : `${run.toLocaleString('en-US')} made`);
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function RarityTree({ setData, parallelKey, printRun, imageUrl }) {
  if (!setData) return <UnknownSet printRun={printRun} />;
  return <KnownSet setData={setData} parallelKey={parallelKey} printRun={printRun} imageUrl={imageUrl} />;
}

// ──────────────────────────────────────────────────────────────────────
// Known set
// ──────────────────────────────────────────────────────────────────────

function KnownSet({ setData, parallelKey, printRun, imageUrl }) {
  const rungs = getRungs(setData);
  const unnumbered = setData.parallels.unnumbered || [];
  const all = [...setData.parallels.numbered, ...unnumbered];
  const matched = parallelKey ? all.find((p) => p.key === parallelKey) || null : null;

  const serial = Number(printRun);
  const activeRun = matched?.run || (rungs.some((r) => r.run === serial) ? serial : null);
  const mi = activeRun ? rungs.findIndex((r) => r.run === activeRun) : -1;
  const isBase = !matched ? mi < 0 : matched.key === setData.baseKey;
  const isAuto = setData.kind === 'auto';
  const unnumberedMatch = matched && !matched.run && !isBase;

  const [openRow, setOpenRow] = useState(null);
  const [showRarer, setShowRarer] = useState(false);
  const [showCommoner, setShowCommoner] = useState(false);
  const [showUnnumbered, setShowUnnumbered] = useState(!!unnumberedMatch);

  // ── Header: three short lines, one idea each ──
  let big, line2, line3;
  if (mi >= 0) {
    big = activeRun === 1 ? 'One of one' : `Only ${activeRun.toLocaleString('en-US')} made`;
    line2 = mi === 0
      ? `The rarest card in ${setData.label}`
      : `${ordinal(mi + 1)} rarest of ${rungs.length} in ${setData.label}`;
    line3 = matched ? oddsLine(matched) : "The listing doesn't name the colour.";
  } else if (unnumberedMatch) {
    big = 'Not numbered';
    line2 = `${shortName(matched.name)} · ${setData.label}`;
    line3 = oddsLine(matched);
  } else {
    big = isAuto ? 'Base autograph' : 'Base card';
    line2 = isAuto ? `The plain signed version from ${setData.label}.` : `The standard version from ${setData.label}.`;
    line3 = (matched && oddsLine(matched)) || (isAuto ? 'The colours below are the rarer signed versions.' : 'The colours below are the rarer versions.');
  }

  // Window: two rows either side of this card; the rarest five otherwise.
  const anchor = mi >= 0 ? mi : 2;
  const lo = showRarer ? 0 : Math.max(0, anchor - 2);
  const hi = showCommoner ? rungs.length - 1 : Math.min(rungs.length - 1, anchor + 2);

  return (
    <div className="rt" data-no-tilt>
      <div className="rt-head">
        <div className="rt-big">{big}</div>
        <div className="rt-line">{line2}</div>
        {line3 && <div className="rt-line rt-quiet">{line3}</div>}
      </div>

      <div className="rt-key">
        <span>Higher = rarer</span>
        <span>Tap a row to see its colours</span>
      </div>

      <div className="rt-ladder">
        {lo > 0 && (
          <button type="button" className="rt-fold" onClick={() => setShowRarer(true)}>
            <ChevronUp className="inline-block w-3.5 h-3.5 -mt-0.5" strokeWidth={2} aria-hidden="true" /> Show {lo} rarer
          </button>
        )}

        {rungs.slice(lo, hi + 1).map((r, i, arr) => {
          const t = tierOf(r.run);
          const newTier = i === 0 || tierOf(arr[i - 1].run) !== t;
          const isMe = r.run === activeRun;
          const me = isMe ? (matched || null) : null;
          const lead = me || r.parallels[0];
          const open = openRow === r.run;
          return (
            <div key={r.run}>
              {newTier && (
                <div className="rt-tier">{t.key === '1of1' ? t.label : `${t.label} · ${t.made}`}</div>
              )}
              <button
                type="button"
                className={`rt-row${isMe ? ' me' : ''}${open ? ' open' : ''}`}
                aria-expanded={open}
                onClick={() => setOpenRow(open ? null : r.run)}
              >
                <span className="rt-made">{made(r.run)}</span>
                <span className="rt-dots" aria-label={`${r.parallels.length} colours`}>
                  <i style={{ background: gradientCss(lead.gradient) }} />
                  {r.parallels.length > 1 && <em>+{r.parallels.length - 1}</em>}
                </span>
                {isMe && (
                  <span className="rt-me">
                    {imageUrl && <CardThumb src={imageUrl} />}
                    {me && <span className="rt-me-name">{shortName(me.name)}</span>}
                    <span className="rt-tag">This card</span>
                  </span>
                )}
              </button>
              {open && <RowDetail parallels={r.parallels} meKey={me?.key} />}
            </div>
          );
        })}

        {hi < rungs.length - 1 && (
          <button type="button" className="rt-fold" onClick={() => setShowCommoner(true)}>
            <ChevronDown className="inline-block w-3.5 h-3.5 -mt-0.5" strokeWidth={2} aria-hidden="true" /> Show {rungs.length - 1 - hi} more common
          </button>
        )}

        {unnumbered.length > 0 && (
          <div className="rt-unnum">
            <button
              type="button"
              className={`rt-row rt-row-unnum${unnumberedMatch ? ' me' : ''}`}
              aria-expanded={showUnnumbered}
              onClick={() => setShowUnnumbered((v) => !v)}
            >
              <span className="rt-made">Not numbered</span>
              <span className="rt-line rt-quiet">{unnumbered.length} colours with no serial number</span>
              {unnumberedMatch && (
                <span className="rt-me">
                  {imageUrl && <CardThumb src={imageUrl} />}
                  <span className="rt-tag">This card</span>
                </span>
              )}
            </button>
            {showUnnumbered && <RowDetail parallels={unnumbered} meKey={matched?.key} />}
          </div>
        )}
      </div>

      <div className="rt-source">
        {setData.note && <>{setData.note} </>}
        {isAuto
          ? 'Colours for this autograph set only. Other autograph sets and inserts have their own.'
          : 'Base cards only; autographs and inserts have their own colours.'}{' '}
        Source:{' '}
        {setData.source?.url
          ? <a href={setData.source.url} target="_blank" rel="noopener noreferrer">{setData.source.name}</a>
          : setData.source?.name}
      </div>
      <TreeStyles />
    </div>
  );
}

function RowDetail({ parallels, meKey }) {
  return (
    <ul className="rt-detail">
      {parallels.map((p) => (
        <li key={p.key} className={p.key === meKey ? 'me' : ''}>
          <i style={{ background: gradientCss(p.gradient) }} />
          <span className="rt-detail-name">{shortName(p.name)}</span>
          <span className="rt-quiet">{oddsLine(p) || ''}</span>
        </li>
      ))}
    </ul>
  );
}

function CardThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eBay thumbnails; a plain img keeps the browser's own referrer and cache.
  return <img className="rt-thumb" src={src} alt="" onError={() => setFailed(true)} />;
}

// ──────────────────────────────────────────────────────────────────────
// Unknown set: hobby-wide ladder by print run
// ──────────────────────────────────────────────────────────────────────

function UnknownSet({ printRun }) {
  const run = Number(printRun) || null;

  if (!run) {
    return (
      <div className="rt" data-no-tilt>
        <div className="rt-head">
          <div className="rt-big rt-big-sm">No serial number listed</div>
          <div className="rt-line rt-quiet">The listing doesn&apos;t say how many were made.</div>
        </div>
        <TreeStyles />
      </div>
    );
  }

  const active = universalTierForRun(run);
  return (
    <div className="rt" data-no-tilt>
      <div className="rt-head">
        <div className="rt-big">{run === 1 ? 'One of one' : `Only ${run.toLocaleString('en-US')} made`}</div>
        <div className="rt-line rt-quiet">
          We don&apos;t have this set&apos;s colours yet. Common print runs show where {run === 1 ? 'a one of one sits' : `${run} copies sit`} across the hobby.
        </div>
      </div>
      <div className="rt-key"><span>Common print runs</span></div>
      <div className="rt-ladder">
        {TIERS.map((t) => {
          const isMe = t.key === active;
          return (
            <div key={t.key} className={`rt-row rt-row-static${isMe ? ' me' : ''}`}>
              <span className="rt-made">{t.made}</span>
              <span className="rt-quiet rt-tier-word">{t.label}</span>
              {isMe && <span className="rt-me"><span className="rt-tag">This card</span></span>}
            </div>
          );
        })}
      </div>
      <div className="rt-source">
        Know this card&apos;s colours?{' '}
        <a href="mailto:contribute@fieldsandfloors.com">Send us the list <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" strokeWidth={2} aria-hidden="true" /></a>
      </div>
      <TreeStyles />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Styles. Tokens only; colours inside the dots come from the data.
// ──────────────────────────────────────────────────────────────────────

const mix = (token, pct) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

function TreeStyles() {
  return (
    <style jsx global>{`
      .rt { border: 1px solid var(--line); border-radius: 12px; background: var(--bg-base); overflow: hidden; text-align: left; }
      .rt-quiet { color: var(--ink-400); }

      .rt-head { padding: 16px 18px 12px; }
      .rt-big { font: italic 400 30px/1.1 'Instrument Serif', serif; color: var(--gold-bright); margin-bottom: 4px; }
      .rt-big-sm { font-size: 24px; color: var(--ink-200); }
      .rt-line { font-size: 14px; line-height: 1.45; color: var(--ink-200); }

      .rt-key { display: flex; justify-content: space-between; gap: 12px; padding: 8px 18px; border-top: 1px solid var(--line); background: var(--bg-elev-2); font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-400); }

      .rt-ladder { padding: 6px 10px 10px; }
      .rt-tier { margin: 12px 10px 4px; display: flex; align-items: center; gap: 10px; font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--ink-400); white-space: nowrap; }
      .rt-tier::after { content: ''; flex: 1; height: 1px; background: var(--line-soft); }
      .rt-tier-word { font: 500 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; }

      .rt-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 40px; padding: 6px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ink-200); text-align: left; cursor: pointer; font: inherit; }
      .rt-row:hover { background: var(--bg-elev); }
      .rt-row.open { background: var(--bg-elev); }
      .rt-row.me { flex-wrap: wrap; row-gap: 6px; min-height: 56px; background: ${mix('--gold', 10)}; box-shadow: inset 0 0 0 1px ${mix('--gold-bright', 45)}; }
      .rt-row-static { cursor: default; }
      .rt-row-static:hover { background: transparent; }
      .rt-made { flex: none; min-width: 92px; font: 400 14px 'Geist', system-ui, sans-serif; color: var(--ink-200); }
      .rt-row.me .rt-made { color: var(--ink-100); font-weight: 500; }
      .rt-dots { display: inline-flex; align-items: center; gap: 6px; }
      .rt-dots i, .rt-detail i { width: 14px; height: 14px; border-radius: 50%; flex: none; box-shadow: inset 0 0 0 .5px ${mix('--ink-200', 45)}; }
      .rt-dots em { font: 500 11px 'Geist Mono', ui-monospace, monospace; font-style: normal; color: var(--ink-400); }
      .rt-me { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
      .rt-me-name { font-size: 14px; font-weight: 500; color: var(--ink-100); white-space: nowrap; }
      .rt-tag { flex: none; font: 600 11px 'Geist Mono', ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; color: var(--bg-base); background: var(--gold-bright); padding: 2px 6px; border-radius: 3px; }
      .rt-thumb { flex: none; max-width: none; width: 34px; height: 48px; object-fit: cover; border-radius: 3px; box-shadow: 0 0 0 2px var(--gold-bright); }

      .rt-detail { list-style: none; margin: 2px 0 8px 10px; padding: 4px 0 4px 104px; }
      .rt-detail li { display: grid; grid-template-columns: 14px 1fr; gap: 2px 10px; align-items: center; padding: 5px 0; font-size: 14px; color: var(--ink-200); }
      .rt-detail li .rt-quiet { grid-column: 2; font-size: 12px; }
      .rt-detail li.me .rt-detail-name { color: var(--gold-bright); font-weight: 500; }

      .rt-fold { display: block; width: calc(100% - 12px); margin: 4px 6px; padding: 8px 10px; border: 1px dashed var(--line); border-radius: 8px; background: transparent; color: var(--gold-bright); font: 500 12px 'Geist', system-ui, sans-serif; text-align: center; cursor: pointer; }
      .rt-unnum { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); }
      .rt-row-unnum .rt-line { font-size: 13px; }

      .rt-source { padding: 10px 18px 14px; border-top: 1px solid var(--line); font-size: 12px; line-height: 1.5; color: var(--ink-600); }
      .rt-source a { color: var(--gold-bright); text-decoration: none; border-bottom: 1px solid var(--gold-deep); }

      @media (max-width: 480px) {
        .rt-head { padding: 14px 14px 10px; }
        .rt-big { font-size: 26px; }
        .rt-key { padding: 8px 14px; }
        .rt-key span:last-child { display: none; }
        .rt-ladder { padding: 4px 6px 8px; }
        .rt-made { min-width: 78px; }
        .rt-thumb { width: 30px; height: 42px; }
        .rt-detail { padding-left: 24px; }
        .rt-source { padding: 10px 14px 12px; }
      }
    `}</style>
  );
}
