import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { isAdminUser } from '../../../../lib/admin';

// GET /api/admin/me → { admin: true|false } for the signed-in user.
// Used only so an admin's own browsers stop counting in the funnel numbers.
export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ admin: isAdminUser(user?.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
