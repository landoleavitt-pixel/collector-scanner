import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

// List all saved searches for the current user
export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ searches: data });
}

// Create a new saved search
export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { name, query, filters, notify_enabled = true } = body;

  if (!name?.trim() || !query?.trim()) {
    return NextResponse.json({ error: 'Name and query are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name: name.trim(),
      query: query.trim(),
      filters: filters ?? {},
      notify_enabled,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ search: data });
}
