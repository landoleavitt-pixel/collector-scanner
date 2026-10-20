import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { getServiceSupabase } from '../../../../lib/revenuecat';

// POST   /api/push/register  { token, platform }  — save this device for alerts
// DELETE /api/push/register  { token }            — forget it (sign-out)
//
// Writes go through the service role after we've verified the caller, so
// push_tokens needs no RLS policies or grants for the authenticated role.

const PLATFORMS = ['ios', 'android'];

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await readBody(request);
  const token = String(body?.token || '').trim();
  const platform = String(body?.platform || '');
  if (!token || token.length > 512 || !PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  // A device token belongs to whoever signed in on it most recently.
  const { error } = await getServiceSupabase().from('push_tokens').upsert({
    token,
    user_id: user.id,
    platform,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'token' });
  if (error) {
    console.error('push register failed:', error.message);
    return NextResponse.json({ error: 'Could not save device' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await readBody(request);
  const token = String(body?.token || '').trim();
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

  await getServiceSupabase().from('push_tokens').delete().eq('token', token).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
