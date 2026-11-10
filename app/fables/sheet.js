'use client';

// Bottom sheet on phones, centred box on wider screens, and its big button.
// Used by the checklist and the versions-first search.

import { useEffect } from 'react';

export function BigButton({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
            className="w-full min-h-[60px] rounded-2xl text-lede font-semibold mt-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(180deg,var(--accent-fill-top),var(--accent-fill-bottom))', color: 'var(--ink-on-accent)' }}>
      {children}
    </button>
  );
}

export function Sheet({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
           className="w-full md:w-[440px] max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl px-[18px] pt-3.5 pb-7"
           style={{ background: 'var(--bg-elev)', borderTop: '1px solid var(--line)', paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
        <div className="w-10 h-[5px] rounded-full mx-auto mb-4 md:hidden" style={{ background: 'var(--line)' }} />
        {children}
      </div>
    </div>
  );
}
