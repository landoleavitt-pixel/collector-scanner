'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// /admin/visitors: PostHog numbers for the last 7 or 30 days, Fields & Floors
// (sports) and Foils & Fables side by side. The route (/api/admin/visitors)
// does the admin check and talks to PostHog; the key never reaches the browser.

const PAGE_NAMES = {
  '/': 'Home (Fields & Floors)',
  '/fables': 'Home (Foils & Fables)',
  '/fables/lists': 'Card lists',
  '/fables/checklist': 'A card checklist',
  '/fables/find': 'Find a card version',
  '/share': 'A shared search',
  '/login': 'Sign in',
  '/signup': 'Create account',
  '/how-it-works': 'How it works',
  '/watchlist': 'Saved searches',
  '/watchlist-cards': 'Starred cards',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
  '/filters': 'Filters guide',
  '/alerts': 'Alerts guide',
  '/guides': 'Guides',
  '/glossary': 'Glossary',
  '/reading-list': 'Reading list',
  '/contact': 'Contact',
};
const GAME_NAMES = { pokemon: 'Pokémon', mtg: 'Magic: The Gathering', yugioh: 'Yu-Gi-Oh!', onepiece: 'One Piece', lorcana: 'Disney Lorcana' };
const SIDE_LABEL = { sports: 'Fields & Floors', fables: 'Foils & Fables' };

const n = (v) => Number(v || 0).toLocaleString('en-US');
const short = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// A bar for each day. One colour: the side's accent (data-side swaps the tokens).
function DailyChart({ data, label }) {
  const max = Math.max(1, ...data.map((d) => d.visitors));
  const total = data.reduce((s, d) => s + d.visitors, 0);
  const W = 600;
  const H = 120;
  const gap = data.length > 14 ? 2 : 4;
  const bw = (W - gap * (data.length - 1)) / data.length;
  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H + 4}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`${label}: ${n(total)} visitor-days over ${data.length} days, busiest day ${n(max)}`}
      >
        <line x1="0" y1={H} x2={W} y2={H} stroke="var(--line)" strokeWidth="1" />
        {data.map((d, i) => {
          const h = d.visitors ? Math.max(3, (d.visitors / max) * (H - 6)) : 0;
          return (
            <rect key={d.day} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx="2" fill="var(--gold-bright)" opacity="0.9">
              <title>{`${short(d.day)}: ${n(d.visitors)} visitors`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--ink-400)' }}>
        <span>{short(data[0].day)}</span>
        <span>Busiest day: {n(max)} visitors</span>
        <span>{short(data[data.length - 1].day)}</span>
      </figcaption>
    </figure>
  );
}

function Block({ title, children }) {
  return (
    <div className="mt-7">
      <div className="text-[11px] tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--ink-400)' }}>{title}</div>
      {children}
    </div>
  );
}

function Rows({ rows, empty = 'Nothing yet.' }) {
  if (!rows.length) return <p className="text-[14px]" style={{ color: 'var(--ink-400)' }}>{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-[14px]" style={{ color: 'var(--ink-200)' }}>
          <div className="flex justify-between gap-3">
            <span className="truncate">{r.label}</span>
            <span style={{ color: 'var(--ink-100)' }}>{n(r.value)}</span>
          </div>
          <div className="h-[3px] rounded-full mt-1" style={{ background: 'var(--line)' }} aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: 'var(--gold-bright)' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SideSection({ side, win }) {
  const funnel = win.funnel[side];
  const visited = funnel[0]?.people || 0;
  const daily = win.daily[side];
  return (
    <section
      data-side={side === 'fables' ? 'fables' : undefined}
      className="rounded-[14px] p-5 md:p-6"
      style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}
    >
      <h2 className="font-display italic text-[26px] leading-tight" style={{ color: 'var(--ink-100)' }}>{SIDE_LABEL[side]}</h2>
      <p className="text-[14px] mt-1" style={{ color: 'var(--ink-200)' }}>
        <strong style={{ color: 'var(--gold-bright)' }}>{n(visited)}</strong> different people visited
      </p>

      <DailyChart data={daily} label={`${SIDE_LABEL[side]} visitors per day`} />

      <Block title="What they did (people)">
        <ul className="grid gap-1.5">
          {funnel.map((s, i) => (
            <li key={s.step} className="text-[14px]" style={{ color: 'var(--ink-200)' }}>
              <div className="flex justify-between gap-3">
                <span>{s.step}</span>
                <span style={{ color: 'var(--ink-100)' }}>
                  {n(s.people)}{i > 0 && visited ? <span style={{ color: 'var(--ink-400)' }}> · {Math.round((s.people / visited) * 100)}%</span> : null}
                </span>
              </div>
              <div className="h-[3px] rounded-full mt-1" style={{ background: 'var(--line)' }} aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${visited ? Math.max(s.people ? 2 : 0, (s.people / visited) * 100) : 0}%`, background: 'var(--gold-bright)' }} />
              </div>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Where they came from (people)">
        <Rows rows={win.sources[side].map((r) => ({ label: r.name === 'direct' ? 'Typed the address, or no referrer' : r.name, value: r.visitors }))} />
      </Block>

      <Block title="Most visited pages (views)">
        <Rows rows={win.pages[side].map((r) => ({ label: PAGE_NAMES[r.path] || r.path, value: r.views }))} />
      </Block>

      {side === 'fables' && (
        <Block title="Card lists, by game (opens)">
          {win.lists.length === 0 ? (
            <p className="text-[14px]" style={{ color: 'var(--ink-400)' }}>Nothing yet.</p>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <table className="w-full text-[14px]" style={{ color: 'var(--ink-200)', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="text-[11px] tracking-[0.12em] uppercase" style={{ color: 'var(--ink-400)', background: 'var(--bg-elev-2)' }}>
                    <th className="text-left p-3">Game</th>
                    <th className="text-right p-3">Browsing lists</th>
                    <th className="text-right p-3">A checklist</th>
                  </tr>
                </thead>
                <tbody>
                  {win.lists.map((r) => (
                    <tr key={r.game} style={{ borderTop: '1px solid var(--line)' }}>
                      <td className="p-3">{GAME_NAMES[r.game] || r.game}</td>
                      <td className="p-3 text-right" style={{ color: 'var(--ink-100)' }}>{n(r.lists)}</td>
                      <td className="p-3 text-right" style={{ color: 'var(--ink-100)' }}>{n(r.checklists)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[12px] mt-2 leading-[1.5]" style={{ color: 'var(--ink-600)' }}>
            Which game, never which card: card names aren&rsquo;t sent to PostHog.
          </p>
        </Block>
      )}
    </section>
  );
}

export default function AdminVisitorsPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/visitors');
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { router.push('/login?next=/admin/visitors'); return; }
        if (!res.ok) { setState({ loading: false, data: null, error: data.error || `Error ${res.status}` }); return; }
        setState({ loading: false, data, error: null });
      } catch (e) {
        setState({ loading: false, data: null, error: e.message });
      }
    })();
  }, [router]);

  const { data } = state;
  const win = data?.configured ? data.windows?.[days] : null;

  return (
    <main className="min-h-[calc(100vh-200px)] py-12 md:py-16">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-[11px] tracking-[0.22em] uppercase mb-3" style={{ color: 'var(--gold)' }}>
          Admin · Visitors
        </div>
        <h1 className="font-display italic text-[36px] md:text-[44px] leading-[1.05]" style={{ color: 'var(--ink-100)' }}>
          Who&rsquo;s visiting.
        </h1>
        <p className="text-[13px] mt-2 max-w-[560px] leading-[1.5]" style={{ color: 'var(--ink-400)' }}>
          Numbers from PostHog, both sites side by side. People, not page loads. No emails, names or search words are in here.
        </p>

        <div className="flex gap-2 mt-8 mb-6" role="tablist" aria-label="Time range">
          {[7, 30].map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={days === d}
              onClick={() => setDays(d)}
              className="text-[11px] tracking-[0.14em] uppercase px-4 py-2.5 rounded-full"
              style={{
                color: days === d ? 'var(--bg-base)' : 'var(--ink-200)',
                background: days === d ? 'var(--gold-bright)' : 'transparent',
                border: '1px solid var(--line)',
              }}
            >
              Last {d} days
            </button>
          ))}
        </div>

        {state.loading && <p style={{ color: 'var(--ink-400)' }}>Loading…</p>}
        {state.error && <p role="alert" className="text-[14px]" style={{ color: 'var(--ink-200)' }}>{state.error}</p>}

        {data && data.configured === false && (
          <div className="rounded-[14px] p-5" style={{ border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
            <p className="text-[16px]" style={{ color: 'var(--ink-100)' }}>Waiting for the PostHog key.</p>
            <p className="text-[14px] mt-2 leading-[1.6]" style={{ color: 'var(--ink-400)' }}>
              This page fills in once the read-only PostHog key and project number are added in Vercel (see LANDON_TODO.md). Nothing is wrong.
            </p>
          </div>
        )}

        {win && (
          <div className="grid gap-6">
            {win.errors.length > 0 && (
              <p role="status" className="text-[13px]" style={{ color: 'var(--ink-400)' }}>
                Some numbers couldn&rsquo;t be loaded ({win.errors.join(', ')}). The rest are fine.
              </p>
            )}
            <SideSection side="sports" win={win} />
            <SideSection side="fables" win={win} />
          </div>
        )}

        {win && (
          <p className="text-[12px] mt-6 leading-[1.5]" style={{ color: 'var(--ink-600)' }}>
            Updated {new Date(data.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}; refreshed about every 10 minutes.
            Our own browsers and anyone who turned off Usage stats are left out. People are counted per browser (or per account once signed in), so one person on two devices counts twice.
            The &ldquo;what they did&rdquo; rows count people who did each thing, not a strict step-by-step path.
          </p>
        )}
      </div>
    </main>
  );
}
