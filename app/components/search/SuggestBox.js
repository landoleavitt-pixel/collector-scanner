'use client';

// Search-box name help and the editable results heading, shared by Fields &
// Floors (app/page.js) and Foils & Fables (app/fables). Pass side="fables"
// for card and character names instead of athletes and teams.

import { useState, useEffect, useLayoutEffect, useMemo, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { suggestTeams, teamFromQuery } from '../../../lib/teams';

/* ─────────────────────────────────────────────
   Player-name help — autocomplete + "Did you mean".
   The matcher and player list (lib/playerSuggest.js) load lazily after
   first paint, so they never slow the landing page. Until they arrive the
   search box simply works without suggestions.
   ───────────────────────────────────────────── */
// Sports: athlete names (lib/playerSuggest.js). Fables: card and character
// names (lib/cardNameSuggest.js). Both share lib/nameMatcher.js.
const nameModules = {};
const NAME_LOADERS = {
  sports: () => import('../../../lib/playerSuggest'),
  fables: () => import('../../../lib/cardNameSuggest'),
};
export function useNameSuggest(side = 'sports') {
  const [mod, setMod] = useState(null);
  useEffect(() => {
    let alive = true;
    nameModules[side] = nameModules[side] || NAME_LOADERS[side]();
    nameModules[side].then((m) => { if (alive) setMod(m); }).catch(() => {});
    return () => { alive = false; };
  }, [side]);
  return mod;
}
export function usePlayerSuggest() {
  return useNameSuggest('sports');
}

/* Wires a text input to the suggestion dropdown. Returns props/handlers for
   the input, a ref for the element the dropdown sits under, and the
   dropdown itself (portalled to <body> so overflow-hidden parents never
   clip it). */
export function useSuggestBox(value, onPick, { side = 'sports' } = {}) {
  const mod = useNameSuggest(side);
  const sports = side === 'sports';
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState(null);

  const rows = useMemo(() => {
    if (!open) return [];
    // Teams come first ("pira" → Pittsburgh Pirates); they need no loading.
    const teams = !sports ? [] : suggestTeams(value, 5).map((t) => ({ kind: 'team', value: t.label, sport: `${t.league} team` }));
    if (!mod) return teams;
    const typed = mod.normalizeName(value);
    if (typed.length < 2) return [];
    let players = mod.suggestPlayers(value, 6);
    // Mid-word ("wemb") isn't a typo: skip the fix while the last word is
    // still the start of a name we're suggesting.
    const lastWord = typed.split(' ').pop();
    const stillTyping = players.some((p) => mod.normalizeName(p.name).split(' ').some((t) => t !== lastWord && t.startsWith(lastWord)));
    const fix = stillTyping || (sports && teamFromQuery(value)) ? null : mod.didYouMean(value);
    // The fixed player's full name, if typing hasn't already surfaced it.
    if (fix?.sport && !players.some((p) => p.name === fix.name)) players = [{ name: fix.name, sport: fix.sport }, ...players];
    players = players.filter((p) => !fix || mod.normalizeName(p.name) !== mod.normalizeName(fix.query));
    // With a team on the list, keep only players whose name really starts
    // with what's typed ("duke" → Duke Clark), not near-misses.
    if (teams.length) {
      const words = typed.split(' ');
      players = players.filter((p) => words.every((w) => mod.normalizeName(p.name).split(' ').some((t) => t.startsWith(w))));
    }
    const list = [
      ...teams,
      ...(fix ? [{ kind: 'fix', value: fix.query }] : []),
      ...players.map((p) => ({ kind: 'player', value: p.name, sport: p.sport })),
    ].slice(0, 7);
    // Nothing to offer if the only row is exactly what's typed.
    if (list.length === 1 && mod.normalizeName(list[0].value) === typed) return [];
    return list;
  }, [mod, open, value, sports]);

  useEffect(() => { setActive(-1); }, [value]);

  const visible = open && rows.length > 0;
  useLayoutEffect(() => {
    if (!visible) return;
    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setRect({ left: r.left + window.scrollX, top: r.bottom + window.scrollY, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [visible, rows.length]);

  const pick = (v) => { setOpen(false); onPick(v); };

  // Returns true when the key was used by the dropdown.
  function handleKey(e) {
    if (!visible) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % rows.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? rows.length - 1 : i - 1)); return true; }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(rows[active].value); return true; }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return true; }
    return false;
  }

  const listId = useMemo(() => `ff-suggest-${Math.random().toString(36).slice(2, 8)}`, []);
  const dropdown = visible && rect && typeof document !== 'undefined'
    ? createPortal(
        <PlayerSuggestDropdown
          id={listId}
          rows={rows}
          active={active}
          typed={value}
          rect={rect}
          label={sports ? 'Player and team suggestions' : 'Card name suggestions'}
          onHover={setActive}
          onPick={pick}
        />,
        document.body,
      )
    : null;

  return {
    anchorRef,
    dropdown,
    handleKey,
    openBox: () => setOpen(true),
    close: () => setOpen(false),
    inputProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': visible,
      'aria-controls': visible ? listId : undefined,
      'aria-activedescendant': visible && active >= 0 ? `${listId}-${active}` : undefined,
      autoComplete: 'off',
      spellCheck: false,
    },
  };
}

// Wrap the typed words where they start a word in the name.
function highlightTyped(name, typed) {
  const words = String(typed || '').trim().split(/\s+/).filter(Boolean)
    .map((w) => w.replace(/[^\p{L}\p{N}'.-]/gu, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (!words.length) return name;
  const re = new RegExp(`(^|[\\s'-])(${words.join('|')})`, 'gi');
  const out = [];
  let last = 0;
  name.replace(re, (m, pre, word, idx) => {
    const start = idx + pre.length;
    if (start > last) out.push(name.slice(last, start));
    out.push(<mark key={start} style={{ background: 'none', color: 'var(--accent-bright)', fontWeight: 500 }}>{word}</mark>);
    last = start + word.length;
    return m;
  });
  if (last < name.length) out.push(name.slice(last));
  return out;
}

function PlayerSuggestDropdown({ id, rows, active, typed, rect, label, onHover, onPick }) {
  const width = Math.min(Math.max(rect.width, 280), 560);
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={label}
      className="overflow-hidden"
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top + 8,
        width,
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 60,
        margin: 0,
        padding: 0,
        listStyle: 'none',
        borderRadius: 12,
        border: '0.5px solid var(--line)',
        background: 'var(--bg-elev)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
        fontFamily: 'Geist, system-ui, sans-serif',
        fontStyle: 'normal',
      }}
    >
      {rows.map((row, i) => {
        const on = i === active;
        // "Teams" / "Players" labels, only when the list has teams in it.
        const group = row.kind === 'team' ? 'Teams' : 'Players';
        const prevGroup = i > 0 ? (rows[i - 1].kind === 'team' ? 'Teams' : 'Players') : null;
        const showGroup = rows.some((r) => r.kind === 'team') && group !== prevGroup;
        return (
          <Fragment key={`${row.kind}-${row.value}-${row.sport || ''}`}>
          {showGroup && (
            <li role="presentation" style={{ fontSize: 12, color: 'var(--ink-600)', padding: '10px 16px 6px', background: 'var(--bg-base)' }}>
              {group}
            </li>
          )}
          <li
            id={`${id}-${i}`}
            role="option"
            aria-selected={on}
            // mousedown, not click: keeps focus in the input so blur doesn't
            // close the list (or commit the heading) before the pick lands.
            onMouseDown={(e) => { e.preventDefault(); onPick(row.value); }}
            onMouseEnter={() => onHover(i)}
            className="flex items-center justify-between gap-3 cursor-pointer"
            style={{
              minHeight: 48,
              padding: '0 16px',
              fontSize: row.kind === 'fix' ? 14 : 15,
              color: row.kind === 'fix' ? 'var(--ink-400)' : on ? 'var(--ink-100)' : 'var(--ink-200)',
              background: on || row.kind === 'fix' ? 'var(--bg-elev-2)' : 'transparent',
              borderBottom: i < rows.length - 1 ? '0.5px solid var(--line-soft)' : 'none',
            }}
          >
            {row.kind === 'fix' ? (
              <span>
                Did you mean <strong style={{ color: 'var(--accent-bright)', fontWeight: 500 }}>{row.value}</strong>?
              </span>
            ) : (
              <>
                <span className="truncate">{highlightTyped(row.value, typed)}</span>
                <span
                  className="font-mono flex-none rounded-full"
                  style={{
                    fontSize: 12,
                    color: row.kind === 'team' ? 'var(--accent)' : 'var(--ink-600)',
                    border: `0.5px solid ${row.kind === 'team' ? 'var(--accent-deep)' : 'var(--line)'}`,
                    padding: '3px 8px',
                  }}
                >
                  {row.sport}
                </span>
              </>
            )}
          </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

/* One quiet line under the results heading when the name looks misspelled. */
export function DidYouMeanLine({ fix, onPick, onDismiss }) {
  return (
    <p className="mt-3 text-body" style={{ color: 'var(--ink-400)' }}>
      Did you mean{' '}
      <button
        type="button"
        onClick={onPick}
        className="transition-colors hover:text-[var(--ink-100)]"
        style={{ color: 'var(--accent-bright)', borderBottom: '0.5px solid var(--accent-deep)' }}
      >
        {fix}
      </button>
      ?
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss suggestion"
        className="ml-2 text-meta px-1 transition-colors hover:text-[var(--ink-200)]"
        style={{ color: 'var(--ink-600)' }}
      >
        <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </p>
  );
}

/* EditableSearchHeading — the big italic player name on the results page.
   Behaves like a static heading until clicked; then becomes an inline
   input pre-filled with the current query. Submit (Enter) commits a new
   search; Escape cancels; blur with no change just exits edit mode.

   Designed to be the visible primary action on the results page so users
   can pivot to a new search without scrolling back to the hero. */
// `placeholder` shows when there's no name (a Foils & Fables search can be
// just a game and rarity).
export function EditableSearchHeading({ value, onSubmit, side = 'sports', placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(value);
  const inputRef = useRef(null);
  // Picking a suggested name runs that search straight away.
  const suggest = useSuggestBox(pending, (v) => { setPending(v); setEditing(false); onSubmit(v); }, { side });

  // Keep local pending state in sync if parent's query changes externally
  // (e.g. after a chip-search from the hero or a saved-search deep link).
  useEffect(() => { if (!editing) setPending(value); }, [value, editing]);

  // Focus + select-all once the input mounts so user can immediately retype.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    onSubmit(pending);
  }
  function cancel() {
    setEditing(false);
    setPending(value);
  }

  if (editing) {
    return (
      <div ref={suggest.anchorRef}>
      <input
        ref={inputRef}
        type="text"
        value={pending}
        onChange={(e) => { setPending(e.target.value); suggest.openBox(); }}
        onKeyDown={(e) => {
          if (suggest.handleKey(e)) return;
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        {...suggest.inputProps}
        onBlur={() => { suggest.close(); commit(); }}
        className="font-display italic w-full bg-transparent border-0 border-b outline-none p-0 m-0"
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 3.6rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: 'var(--accent-bright)',
          borderBottomColor: 'var(--accent)',
        }}
      />
      {suggest.dropdown}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group block text-left p-0 m-0 bg-transparent border-0 cursor-text"
      title="Click to search a different name"
    >
      <span
        className="font-display italic transition-colors group-hover:text-[var(--accent-bright)]"
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 3.6rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: 'var(--accent)',
          display: 'inline-block',
          borderBottom: '0.5px dashed transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--accent-deep)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
      >
        {value || placeholder}
      </span>
      <span
        className="ml-3 text-fine opacity-0 group-hover:opacity-100 transition-opacity align-middle"
        style={{ color: 'var(--ink-400)' }}
      >
        ✎ edit
      </span>
    </button>
  );
}
