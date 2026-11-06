// lib/safeNext.js
//
// Where to go after signing in. Only same-site paths: "@evil.com" or
// "//evil.com" would otherwise send someone to another site after sign-in.

export function safeNext(raw) {
  const next = raw ?? '/';
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
}
