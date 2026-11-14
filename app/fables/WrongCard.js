'use client';

// "Wrong card?" (mockups/fables-still-need-and-sets.html, approved 2026-11-14):
// one tap tells us a listing is labelled as the wrong card or version. The
// reason is optional and from a fixed list (no free text). POST
// /api/wrong-card stores only the listing id, our label, the side, the game,
// the reason and, when signed in, the account id.

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Sheet, BigButton } from './sheet';
import { SIDE } from './data';

const REASONS = [
  ['different_card', 'It’s a different card'],
  ['different_version', 'Right card, different version'],
  ['not_a_card', 'Not a single card (a lot or a box)'],
  ['fake_or_custom', 'It looks fake or custom-made'],
  ['other', 'Something else'],
];

export default function WrongCard({ item, label, game, className = '' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState(''); // '' | 'sending' | 'sent' | message
  async function send() {
    setState('sending');
    const r = await fetch('/api/wrong-card', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: item.id, label, side: SIDE, ...(game ? { game } : {}), ...(reason ? { reason } : {}) }),
    }).catch(() => null);
    if (r && (r.ok || r.status === 204)) { setState('sent'); setOpen(false); return; }
    const d = r ? await r.json().catch(() => ({})) : {};
    setState(d.error || 'That didn’t send. Try again.');
  }
  if (state === 'sent') {
    return <p className={`text-meta ${className}`} style={{ color: 'var(--accent-bright)' }} role="status">Thanks, we’ll check it.</p>;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
              className={`inline-flex items-center gap-1.5 text-meta underline underline-offset-[3px] min-h-[32px] ${className}`}
              style={{ color: 'var(--ink-400)' }}>
        <Flag className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />Wrong card?
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h3 className="font-display italic text-price leading-tight mb-1">Is this the wrong card?</h3>
          <p className="text-body mb-3" style={{ color: 'var(--ink-400)' }}>
            We labelled it <b className="font-semibold" style={{ color: 'var(--ink-100)' }}>{label}</b>. Want to say why? (Optional)
          </p>
          <div role="radiogroup" aria-label="Reason">
            {REASONS.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={reason === k} onClick={() => setReason(reason === k ? '' : k)}
                      className="w-full flex items-center gap-3 min-h-[52px] text-left text-lede"
                      style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--ink-200)' }}>
                <span className="w-[22px] h-[22px] rounded-full flex-none" style={reason === k ? { border: '7px solid var(--accent-bright)' } : { border: '2px solid var(--ink-600)' }} aria-hidden="true" />
                {l}
              </button>
            ))}
          </div>
          {state && state !== 'sending' && <p className="text-meta mt-3" style={{ color: 'var(--crit)' }}>{state}</p>}
          <div className="mt-3"><BigButton onClick={send} disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</BigButton></div>
          <button type="button" onClick={() => setOpen(false)} className="w-full min-h-[52px] text-lede mt-1" style={{ color: 'var(--ink-400)' }}>Cancel</button>
          <p className="text-fine text-center mt-1" style={{ color: 'var(--ink-600)' }}>We keep only this listing, our label and your reason.</p>
        </Sheet>
      )}
    </>
  );
}
