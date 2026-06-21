// Tiny per-IP rate limiter, shared across routes.
//
// In-memory only — resets when the serverless instance recycles and lives on
// just one Vercel instance. That's an acceptable trade for the current scale
// (small site, no auth on most endpoints); a determined attacker punching
// through to a different instance only multiplies their effective cap. When
// this gets insufficient, swap to Upstash Redis with the same call shape.
//
// Usage:
//   import { rateLimit, getClientIp } from '@/lib/rateLimit';
//   const { allowed, retryAfterSec } = rateLimit({
//     bucket: 'waitlist',     // namespace so buckets don't collide
//     key: getClientIp(req),
//     limit: 10,
//     windowMs: 60_000,
//   });

const MAX_TRACKED = 5000; // hard cap on tracked keys per bucket (memory safety)
const buckets = new Map(); // bucket -> Map<key, number[]>

function getBucket(name) {
  let m = buckets.get(name);
  if (!m) {
    m = new Map();
    buckets.set(name, m);
  }
  return m;
}

export function getClientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export function rateLimit({ bucket, key, limit, windowMs }) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const map = getBucket(bucket);

  // Crude eviction if the map grows too large under a botnet-style attack.
  if (map.size > MAX_TRACKED) {
    const keys = Array.from(map.keys());
    for (let i = 0; i < keys.length / 2; i++) map.delete(keys[i]);
  }

  const hits = map.get(key) || [];
  const recent = hits.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    map.set(key, recent);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  recent.push(now);
  map.set(key, recent);
  return { allowed: true, retryAfterSec: 0 };
}
