'use client';

// iOS app only: "choose a side" on every cold launch (DECISIONS.md).
// - Both sides shown equally, no last-used highlight; one tap opens a side.
// - Not shown when returning from the background: sessionStorage survives
//   that, and is fresh after a cold launch.
// - Not shown when the app opens on a deep link (alert, shared link): only
//   a bare "/" or "/fables" launch gets the chooser.
// Inside the app the header switch moves between sides afterwards.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { isNativeApp } from '../../lib/native';

const FLAG = 'ffSideChosen';

export default function SideChooser() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    let chosen = false;
    try { chosen = sessionStorage.getItem(FLAG) === '1'; } catch {}
    const { pathname, search } = window.location;
    const bareLaunch = (pathname === '/' || pathname === '/fables') && !search;
    if (!chosen && bareLaunch) setOpen(true);
    else { try { sessionStorage.setItem(FLAG, '1'); } catch {} }
  }, []);

  if (!open) return null;

  const pick = (href) => {
    try { sessionStorage.setItem(FLAG, '1'); } catch {}
    setOpen(false);
    if (window.location.pathname !== href) router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[300] grid grid-rows-2" role="dialog" aria-label="Choose a side">
      <button type="button" onClick={() => pick('/')}
              className="relative flex flex-col justify-end text-left px-6 pb-8 pt-16 overflow-hidden"
              style={{ background: 'linear-gradient(180deg,#14110c,#0a0907)', color: '#f7f1e1' }}>
        <span className="font-display italic text-[40px] leading-none" style={{ fontFamily: "'Instrument Serif', serif" }}>Fields &amp; Floors</span>
        <span className="text-[14px] mt-2 pr-16" style={{ color: '#a99e85' }}>Sports cards: numbered, autographed and rookie</span>
        <span className="absolute right-6 bottom-8 w-11 h-11 rounded-full grid place-items-center" style={{ background: '#e6b96b', color: '#1a1612' }}>
          <ArrowRight className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        </span>
      </button>
      <button type="button" onClick={() => pick('/fables')}
              className="relative flex flex-col justify-end text-left px-6 pb-12 pt-10 overflow-hidden"
              style={{ background: 'radial-gradient(420px 300px at 70% 20%,rgba(143,211,232,.12),transparent 60%),linear-gradient(180deg,#10131f,#080a12)', color: '#eef0f7', borderTop: '1px solid #242a3d' }}>
        <span className="text-[40px] leading-none italic" style={{ fontFamily: "'Fraunces', serif" }}>
          Foils <span style={{ background: 'linear-gradient(100deg,#9fe3f5,#b6a8f0,#f0b3d0,#f3d9a0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>&amp;</span> Fables
        </span>
        <span className="text-[14px] mt-2 pr-16" style={{ color: '#9198b0' }}>Trading card games and collectible cards</span>
        <span className="absolute right-6 bottom-12 w-11 h-11 rounded-full grid place-items-center" style={{ background: '#b9e6f2', color: '#071018' }}>
          <ArrowRight className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
