// lib/appleAuth.js
//
// Sign in with Apple token revocation (App Review 5.1.1(v): "Apps that
// support Sign in with Apple should use the Sign in with Apple REST API to
// revoke user tokens" when an account is deleted).
//
//   1. At sign-in, the app sends Apple's one-time authorization code to
//      /api/account/apple-token, which swaps it for a refresh token here and
//      stores it in public.apple_tokens (service role only).
//   2. On account delete, /api/account/delete revokes that token here.
//
// Server only. Needs four env vars; with any missing, isAppleConfigured() is
// false and both steps are skipped, so sign-in and deletion work as before.
//   APPLE_TEAM_ID      10-character Team ID
//   APPLE_KEY_ID       10-character Key ID of the Sign in with Apple key
//   APPLE_PRIVATE_KEY  contents of that key's .p8 file (PEM)
//   APPLE_CLIENT_ID    com.fieldsandfloors.app (the app's bundle ID, which
//                      Apple issued the authorization code to)
//
// The client secret is an ES256 JWT signed with the .p8 key, built with
// Node's crypto (no extra package). Apple accepts one valid for up to six
// months; we make a fresh 5-minute one per call.

import { createPrivateKey, sign } from 'node:crypto';

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const TOKEN_URL = 'https://appleid.apple.com/auth/token';
const REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
const TIMEOUT_MS = 8000;

export function appleConfig(env = process.env) {
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const clientId = env.APPLE_CLIENT_ID?.trim();
  // Vercel and .env files often store the PEM with literal "\n".
  const privateKey = env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!teamId || !keyId || !clientId || !privateKey) return null;
  return { teamId, keyId, clientId, privateKey };
}

export function isAppleConfigured(env = process.env) {
  return appleConfig(env) !== null;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** The client_secret JWT Apple's token and revoke endpoints expect. */
export function appleClientSecret(cfg, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const header = { alg: 'ES256', kid: cfg.keyId, typ: 'JWT' };
  const payload = { iss: cfg.teamId, iat, exp: iat + 300, aud: APPLE_AUDIENCE, sub: cfg.clientId };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  // JWTs use the raw r||s signature, not DER.
  const sig = sign('sha256', Buffer.from(input), { key: createPrivateKey(cfg.privateKey), dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64url(sig)}`;
}

async function postForm(url, form, fetchImpl) {
  return fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * Swap a one-time authorization code (valid 5 minutes) for a refresh token.
 * Returns the refresh token, or throws with Apple's error code (never the
 * token or code) in the message.
 */
export async function exchangeAppleCode(code, { env = process.env, fetchImpl = fetch } = {}) {
  const cfg = appleConfig(env);
  if (!cfg) throw new Error('apple not configured');
  const res = await postForm(TOKEN_URL, {
    client_id: cfg.clientId,
    client_secret: appleClientSecret(cfg),
    code,
    grant_type: 'authorization_code',
  }, fetchImpl);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.refresh_token) throw new Error(`apple token ${res.status} ${data.error || 'no refresh_token'}`);
  return data.refresh_token;
}

/** Revoke a refresh token. Resolves true on success, false on any failure. */
export async function revokeAppleToken(refreshToken, { env = process.env, fetchImpl = fetch, log = console } = {}) {
  const cfg = appleConfig(env);
  if (!cfg || !refreshToken) return false;
  try {
    const res = await postForm(REVOKE_URL, {
      client_id: cfg.clientId,
      client_secret: appleClientSecret(cfg),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }, fetchImpl);
    if (res.ok) return true;
    const data = await res.json().catch(() => ({}));
    log.error(`apple revoke failed: ${res.status} ${data.error || ''}`.trim());
    return false;
  } catch (err) {
    log.error(`apple revoke failed: ${err?.name || 'error'}`);
    return false;
  }
}

/**
 * Account-delete step: revoke and remove the member's stored Apple token, if
 * any. Never throws, so it can't block deletion; every failure is logged.
 * `admin` is a service-role Supabase client.
 */
export async function revokeStoredAppleToken(admin, userId, { env = process.env, fetchImpl = fetch, log = console } = {}) {
  try {
    const { data, error } = await admin.from('apple_tokens').select('refresh_token').eq('user_id', userId).maybeSingle();
    // Table missing (migration not run yet) or no row: nothing to revoke.
    if (error || !data?.refresh_token) return 'none';
    let ok = false;
    if (isAppleConfigured(env)) ok = await revokeAppleToken(data.refresh_token, { env, fetchImpl, log });
    else log.error('apple revoke skipped: APPLE_* env vars not set');
    const del = await admin.from('apple_tokens').delete().eq('user_id', userId);
    if (del.error) log.error(`apple token row delete failed: ${del.error.message}`);
    return ok ? 'revoked' : 'failed';
  } catch (err) {
    log.error(`apple revoke step failed: ${err?.message || err}`);
    return 'failed';
  }
}
