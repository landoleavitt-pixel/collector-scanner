'use client';

// The notification ask, shown when someone first turns an alert on in the
// iPhone app (not at launch): one plain line, then iOS's own prompt.
//
//   const pushAsk = usePushAsk();
//   await pushAsk.ask();          // resolves when they've chosen (or at once if there's nothing to ask)
//   ...
//   {pushAsk.node}                // render once, anywhere in the component
//
// Only inside the app, only while notifications haven't been asked about, and
// only once per visit if they say "Not now". Does nothing on the website.

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { isNativeApp, enablePush, pushPermission, PUSH_REASON } from '../../lib/native';

const SKIP_KEY = 'ffPushAskSkipped';

export function usePushAsk() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const resolveRef = useRef(null);

  const ask = useCallback(async () => {
    if (!isNativeApp()) return;
    try { if (sessionStorage.getItem(SKIP_KEY) === '1') return; } catch {}
    if ((await pushPermission()) !== 'prompt') return;
    await new Promise((resolve) => {
      resolveRef.current = resolve;
      setOpen(true);
    });
  }, []);

  const finish = useCallback(() => {
    setOpen(false);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  const allow = useCallback(async () => {
    try { await enablePush((path) => router.push(path), { ask: true }); } catch {}
    finish();
  }, [router, finish]);

  const notNow = useCallback(() => {
    try { sessionStorage.setItem(SKIP_KEY, '1'); } catch {}
    finish();
  }, [finish]);

  const node = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-ask-title"
          className="w-full max-w-[400px] rounded-xl p-6"
          style={{ background: 'var(--bg-elev-2)', border: '0.5px solid var(--gold-deep)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
        >
          <h2 id="push-ask-title" className="font-display italic text-price leading-tight">Get your alerts</h2>
          <p className="mt-2 text-body leading-relaxed" style={{ color: 'var(--ink-200)' }}>{PUSH_REASON}</p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={allow}
              autoFocus
              className="w-full h-11 rounded-lg text-meta font-semibold"
              style={{ background: 'var(--gold-bright)', color: 'var(--ink-on-gold)' }}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={notNow}
              className="w-full h-11 rounded-lg text-meta"
              style={{ background: 'transparent', color: 'var(--ink-200)', border: '0.5px solid var(--line)' }}
            >
              Not now
            </button>
          </div>
          <p className="mt-3 text-fine text-center" style={{ color: 'var(--ink-400)' }}>Email alerts still work either way.</p>
        </div>
      </div>,
      document.body,
    )
    : null;

  return { ask, node };
}
