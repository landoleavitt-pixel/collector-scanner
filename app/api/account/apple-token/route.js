import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeAppleCode, isAppleConfigured } from '../../../../lib/appleAuth';
import { rateLimit, getClientIp } from '../../../../lib/rateLimit';

// POST /api/account/apple-token   Authorization: Bearer <Supabase access token>
//                                 { code: "<Apple authorization code>" }
//
// Called by the iPhone app right after Sign in with Apple
// (lib/native.js signInWithAppleNative). Swaps Apple's one-time code for a
// refresh token and stores it in public.apple_tokens, so deleting the
// account can revoke it (lib/appleAuth.js, App Review 5.1.1(v)).
//
// Best effort: with the APPLE_* env vars unset, or if Apple or the table
// isn't there, it answers 204 and sign-in carries on as before. The token is
// never sent back or logged.

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request) {
  if (!isAppleConfigured()) return done();

  const rate = rateLimit({ bucket: 'apple-token', key: getClientIp(request), limit: 10, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return done();

  const jwt = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let code;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (typeof code !== 'string' || code.length < 10 || code.length > 2000) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: { user } = {}, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  // Only Apple accounts have an Apple token to keep.
  if (!(user.identities || []).some((i) => i.provider === 'apple')) return done();

  let refreshToken;
  try {
    refreshToken = await exchangeAppleCode(code);
  } catch (err) {
    console.error(`apple-token: exchange failed for ${user.id}: ${err.message}`);
    return done();
  }

  const { error } = await admin
    .from('apple_tokens')
    .upsert({ user_id: user.id, refresh_token: refreshToken, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) console.error(`apple-token: save failed for ${user.id}: ${error.message}`);
  return done();
}
