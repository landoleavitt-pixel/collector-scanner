// floorsandfables.com front door (middleware rewrites "/" there to this page).
// Two equal choices, each going to its side's own domain (lib/domains.js).
// Approved mockup: mockups/floors-and-fables-chooser.html. Covers the whole
// screen like the app's launch chooser, so the sports header doesn't show.

import { ArrowRight } from 'lucide-react';
import { SPORTS_ORIGIN, FABLES_ORIGIN } from '../../lib/domains';

export const metadata = {
  title: { absolute: 'Floors & Fables' },
  description: 'Search eBay for rare cards. Pick a side: Fields & Floors for sports cards, Foils & Fables for trading card games.',
};


export default function ChoosePage() {
  return (
    <main className="fixed inset-0 z-[400] overflow-y-auto"
          style={{ background: 'radial-gradient(700px 360px at 50% -10%,rgba(255,255,255,.05),transparent 60%),#0d0d0f', color: '#efede8' }}>
      <div className="min-h-full max-w-[960px] mx-auto px-[18px] md:px-8 pt-16 md:pt-20 pb-8 flex flex-col">
        <header className="text-center">
          <h1 className="italic text-price md:text-h1 leading-none tracking-[-0.01em]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Floors <span style={{ color: '#d5d9e8', fontStyle: 'normal' }}>&amp;</span> Fables
          </h1>
          <p className="text-h3 mt-3" style={{ color: '#9c9a95' }}>What do you collect?</p>
        </header>

        <div className="grid gap-3.5 md:gap-5 md:grid-cols-2 my-7 md:my-10">
          <a href={SPORTS_ORIGIN}
             className="relative flex flex-col justify-end rounded-[22px] overflow-hidden px-[22px] md:px-7 py-6 md:py-8 min-h-[220px] md:min-h-[300px]"
             style={{ background: 'linear-gradient(180deg,#1a150e,#0b0a08)', color: '#f7f1e1', border: '1px solid #26262b' }}>
            <span className="italic text-h1 md:text-h1 leading-none" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Fields <span style={{ color: '#e6b96b', fontStyle: 'normal' }}>&amp;</span> Floors
            </span>
            <span className="text-lede md:text-lede mt-2" style={{ color: '#b5aa90' }}>Sports cards</span>
            <span className="text-body mt-1.5" style={{ color: '#8a8170' }}>Hockey · Basketball · Baseball · Football</span>
            <Arrow bg="#e6b96b" fg="#1a1612" />
          </a>
          <a href={FABLES_ORIGIN}
             className="relative flex flex-col justify-end rounded-[22px] overflow-hidden px-[22px] md:px-7 py-6 md:py-8 min-h-[220px] md:min-h-[300px]"
             style={{ background: 'radial-gradient(420px 260px at 75% 15%,rgba(143,211,232,.14),transparent 60%),linear-gradient(180deg,#121626,#080a12)', color: '#eef0f7', border: '1px solid #26262b' }}>
            <span className="italic text-h1 md:text-h1 leading-none" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Foils <span style={{ color: '#b9e6f2', fontStyle: 'normal' }}>&amp;</span> Fables
            </span>
            <span className="text-lede md:text-lede mt-2" style={{ color: '#a3aac2' }}>Trading card games</span>
            <span className="text-body mt-1.5" style={{ color: '#7d849c' }}>Pokémon · Magic: The Gathering · Yu-Gi-Oh! · One Piece · Lorcana</span>
            <Arrow bg="#b9e6f2" fg="#071018" />
          </a>
        </div>

        <footer className="mt-auto text-center text-meta leading-relaxed" style={{ color: '#6e6c68' }}>
          <p>One free account works on both.</p>
          <p>Not affiliated with eBay or any game publisher.</p>
        </footer>
      </div>
    </main>
  );
}

function Arrow({ bg, fg }) {
  return (
    <span className="absolute right-5 top-5 w-[52px] h-[52px] rounded-full grid place-items-center" style={{ background: bg, color: fg }} aria-hidden="true">
      <ArrowRight className="w-[22px] h-[22px]" strokeWidth={2.2} />
    </span>
  );
}
