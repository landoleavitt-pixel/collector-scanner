import { createHmac, timingSafeEqual } from 'node:crypto';

// Lets the hourly alert checker (supabase/functions/poller) skip the
// per-visitor search rate limit. Every checker request comes from one
// Supabase address, so with more than ~20 different saved searches the
// visitor limit would turn the rest away and those alerts would silently
// not run.
//
// The checker signs "poller:<unix seconds>" with a secret both sides already
// hold (POLLER_SECRET if set, else the Supabase service role key) and sends
// it as two headers. We accept it for 5 minutes. The secret itself never
// travels; only the signature does.

const MAX_AGE_SEC = 300;

export function isTrustedPoller(req) {
  const ts = req.headers.get('x-ff-poller-ts');
  const sig = req.headers.get('x-ff-poller-sig');
  if (!ts || !sig) return false;

  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > MAX_AGE_SEC) return false;

  const secrets = [process.env.POLLER_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(Boolean);
  for (const secret of secrets) {
    const expected = createHmac('sha256', secret).update(`poller:${ts}`).digest('hex');
    if (expected.length === sig.length && timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return true;
  }
  return false;
}
