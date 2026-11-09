'use client';

// A set's name for chips ("Dominaria United", not "dmu"). The set list is
// cached by the CDN; it's only fetched when a set is picked.

import { useEffect, useState } from 'react';

export default function useSetName(game, code) {
  const [names, setNames] = useState({});
  const key = `${game}|${code}`;
  useEffect(() => {
    if (!game || !code || names[key]) return undefined;
    let alive = true;
    fetch(`/api/tcg-versions?game=${encodeURIComponent(game)}&sets=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      const name = d?.sets?.find((s) => s.code === code)?.name;
      if (alive) setNames((n) => ({ ...n, [key]: name || code }));
    });
    return () => { alive = false; };
  }, [game, code, key, names]);
  return names[key] || null;
}
