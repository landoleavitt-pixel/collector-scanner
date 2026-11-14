'use client';

// A shared want list (opt-in, from Still need): only the versions the
// collector is missing, with what's for sale. No owner name, email or owned
// counts. Data: GET /api/want-share/<token> (404 when unknown or turned off).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FamilyBlock, BySet } from '../../still-need/StillNeed';

export default function SharedWants({ token }) {
  const [data, setData] = useState(null); // response | { gone } | { error }
  const [bySet, setBySet] = useState(false);
  useEffect(() => {
    fetch(`/api/want-share/${encodeURIComponent(token)}`, { cache: 'no-store' }).then(async (r) => {
      if (r.status === 404) return { gone: true };
      const d = await r.json().catch(() => null);
      return r.ok && d ? d : { error: true };
    }).catch(() => ({ error: true })).then(setData);
  }, [token]);
  const families = data?.families || [];
  const missing = families.reduce((n, f) => n + (f.missing || 0), 0);
  const forSale = families.reduce((n, f) => n + (f.missingForSale || 0), 0);
  const back = `/fables/wants/${token}`;
  return (
    <main className="max-w-[720px] mx-auto px-[18px] md:px-6 pt-6 md:pt-10 pb-28">
      <h1 className="font-display italic text-h1 leading-none mb-3">A collector’s want list</h1>
      {data === null && <p className="text-body" style={{ color: 'var(--ink-400)' }}>Checking eBay…</p>}
      {data?.gone && <p className="text-lede" style={{ color: 'var(--ink-200)' }}>This want list isn’t shared anymore.</p>}
      {data?.error && <p className="text-lede" style={{ color: 'var(--ink-200)' }}>This list couldn’t load right now. Try again in a moment.</p>}
      {families.length > 0 && (
        <>
          <p className="text-lede mb-4" style={{ color: 'var(--ink-400)' }}>
            {missing.toLocaleString('en-US')} cards they’re looking for. {forSale.toLocaleString('en-US')} {forSale === 1 ? 'is' : 'are'} for sale on eBay now.
          </p>
          <div className="flex gap-1 p-1 rounded-xl" role="group" aria-label="Group by" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
            {[[false, 'By card'], [true, 'By set']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => setBySet(v)} aria-pressed={bySet === v} className="flex-1 min-h-[40px] rounded-lg text-body"
                      style={bySet === v ? { background: 'var(--bg-elev-2)', color: 'var(--ink-100)', boxShadow: 'inset 0 0 0 1px var(--line)' } : { color: 'var(--ink-400)' }}>{l}</button>
            ))}
          </div>
          {bySet ? <BySet families={families} back={back} /> : families.map((f) => <FamilyBlock key={`${f.game}|${f.name}`} family={f} back={back} />)}
        </>
      )}
      {data && families.length === 0 && !data.gone && !data.error && <p className="text-lede" style={{ color: 'var(--ink-200)' }}>Nothing on this list right now.</p>}
      <Link href="/signup?src=want-list&next=/fables/still-need" className="flex items-center justify-center min-h-[52px] rounded-xl text-lede font-medium mt-8"
            style={{ border: '1.5px solid var(--line)', color: 'var(--ink-100)' }}>Make your own want list, free</Link>
      <p className="text-meta text-center mt-3" style={{ color: 'var(--ink-600)' }}>Not affiliated with eBay or any game publisher.</p>
    </main>
  );
}
