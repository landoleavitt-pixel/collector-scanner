// scripts/apple-auth.test.mjs
//
// Sign in with Apple revocation (lib/appleAuth.js). No network: Apple's
// endpoints and Supabase are stubbed, and a throwaway P-256 key stands in
// for the real .p8.
//
//   npx tsx --test scripts/apple-auth.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  appleConfig, isAppleConfigured, appleClientSecret, exchangeAppleCode, revokeAppleToken, revokeStoredAppleToken,
} from '../lib/appleAuth.js';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const ENV = {
  APPLE_TEAM_ID: 'TEAM123456',
  APPLE_KEY_ID: 'KEY1234567',
  APPLE_CLIENT_ID: 'com.fieldsandfloors.app',
  // As Vercel often stores it: one line with literal \n.
  APPLE_PRIVATE_KEY: pem.replace(/\n/g, '\\n'),
};
const quiet = { error: () => {} };

function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, form: Object.fromEntries(new URLSearchParams(init.body)) });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

function fakeAdmin(row, { selectError = null } = {}) {
  const deleted = [];
  return {
    deleted,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: selectError }) }) }),
      delete: () => ({ eq: async (_col, id) => { deleted.push(id); return { error: null }; } }),
    }),
  };
}

test('not configured when any APPLE_* var is missing', () => {
  assert.equal(isAppleConfigured({}), false);
  for (const k of Object.keys(ENV)) assert.equal(isAppleConfigured({ ...ENV, [k]: '' }), false, k);
  assert.equal(isAppleConfigured(ENV), true);
});

test('client secret is an ES256 JWT Apple can verify', () => {
  const now = Date.UTC(2026, 10, 1);
  const jwt = appleClientSecret(appleConfig(ENV), now);
  const [h, p, s] = jwt.split('.');
  const header = JSON.parse(Buffer.from(h, 'base64url'));
  const payload = JSON.parse(Buffer.from(p, 'base64url'));
  assert.deepEqual(header, { alg: 'ES256', kid: 'KEY1234567', typ: 'JWT' });
  assert.equal(payload.iss, 'TEAM123456');
  assert.equal(payload.sub, 'com.fieldsandfloors.app');
  assert.equal(payload.aud, 'https://appleid.apple.com');
  assert.equal(payload.exp - payload.iat, 300);
  const ok = createVerify('sha256').update(`${h}.${p}`)
    .verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
  assert.ok(ok, 'signature verifies with the matching public key');
});

test('exchange posts the code and returns the refresh token', async () => {
  const f = fakeFetch(200, { refresh_token: 'r.abc', access_token: 'a', id_token: 'i' });
  assert.equal(await exchangeAppleCode('c.code123456', { env: ENV, fetchImpl: f }), 'r.abc');
  assert.equal(f.calls[0].url, 'https://appleid.apple.com/auth/token');
  assert.equal(f.calls[0].form.grant_type, 'authorization_code');
  assert.equal(f.calls[0].form.code, 'c.code123456');
  assert.equal(f.calls[0].form.client_id, 'com.fieldsandfloors.app');
});

test('exchange failure throws without leaking the code', async () => {
  const f = fakeFetch(400, { error: 'invalid_grant' });
  await assert.rejects(exchangeAppleCode('c.secretcode', { env: ENV, fetchImpl: f }), (err) => {
    assert.match(err.message, /invalid_grant/);
    assert.doesNotMatch(err.message, /secretcode/);
    return true;
  });
});

test('revoke posts the refresh token with the right hint', async () => {
  const f = fakeFetch(200, {});
  assert.equal(await revokeAppleToken('r.abc', { env: ENV, fetchImpl: f, log: quiet }), true);
  assert.equal(f.calls[0].url, 'https://appleid.apple.com/auth/revoke');
  assert.deepEqual(
    { token: f.calls[0].form.token, hint: f.calls[0].form.token_type_hint },
    { token: 'r.abc', hint: 'refresh_token' },
  );
});

test('revoke never throws: Apple error, network error, no config', async () => {
  assert.equal(await revokeAppleToken('r', { env: ENV, fetchImpl: fakeFetch(400, { error: 'invalid_client' }), log: quiet }), false);
  const boom = async () => { throw new Error('ENOTFOUND'); };
  assert.equal(await revokeAppleToken('r', { env: ENV, fetchImpl: boom, log: quiet }), false);
  assert.equal(await revokeAppleToken('r', { env: {}, fetchImpl: boom, log: quiet }), false);
});

test('account delete: stored token is revoked, then its row removed', async () => {
  const admin = fakeAdmin({ refresh_token: 'r.abc' });
  const f = fakeFetch(200, {});
  assert.equal(await revokeStoredAppleToken(admin, 'u1', { env: ENV, fetchImpl: f, log: quiet }), 'revoked');
  assert.equal(f.calls.length, 1);
  assert.deepEqual(admin.deleted, ['u1']);
});

test('account delete: failed revoke still removes the row and does not throw', async () => {
  const admin = fakeAdmin({ refresh_token: 'r.abc' });
  const logged = [];
  const res = await revokeStoredAppleToken(admin, 'u1', { env: ENV, fetchImpl: fakeFetch(500, {}), log: { error: (m) => logged.push(m) } });
  assert.equal(res, 'failed');
  assert.deepEqual(admin.deleted, ['u1']);
  assert.ok(logged.some((m) => /apple revoke failed: 500/.test(m)));
});

test('account delete: no token, missing table, or no keys = no Apple call', async () => {
  const boom = async () => { throw new Error('should not be called'); };
  assert.equal(await revokeStoredAppleToken(fakeAdmin(null), 'u1', { env: ENV, fetchImpl: boom, log: quiet }), 'none');
  const missingTable = fakeAdmin(null, { selectError: { message: 'relation "apple_tokens" does not exist' } });
  assert.equal(await revokeStoredAppleToken(missingTable, 'u1', { env: ENV, fetchImpl: boom, log: quiet }), 'none');
  const admin = fakeAdmin({ refresh_token: 'r.abc' });
  assert.equal(await revokeStoredAppleToken(admin, 'u1', { env: {}, fetchImpl: boom, log: quiet }), 'failed');
  assert.deepEqual(admin.deleted, ['u1']);
});

test('account delete: a crashing database client is caught', async () => {
  const admin = { from: () => { throw new Error('db down'); } };
  assert.equal(await revokeStoredAppleToken(admin, 'u1', { env: ENV, fetchImpl: fakeFetch(200, {}), log: quiet }), 'failed');
});
