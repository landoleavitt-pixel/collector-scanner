'use client';

import { useEffect } from 'react';

// Marks <html> as the Foils & Fables side while any /fables page is mounted,
// and remembers the side for the app's switch.
export default function FablesSide() {
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-side', 'fables');
    try { localStorage.setItem('ffSide', 'fables'); } catch {}
    return () => {
      el.removeAttribute('data-side');
      try { localStorage.setItem('ffSide', 'sports'); } catch {}
    };
  }, []);
  return null;
}
