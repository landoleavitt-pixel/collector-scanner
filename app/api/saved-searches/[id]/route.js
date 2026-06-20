import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// Fetch a single saved search by id
export async function GET(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ search: data });
}

// Update a saved search (rename, toggle notifications)
export async function PATCH(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const updates = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.notify_enabled === 'boolean') updates.notify_enabled = body.notify_enabled;
  // Edit flow: query + filters can be updated together when the user
  // overwrites a saved search from the home page's filter panel.
  if (typeof body.query === 'string' && body.query.trim()) {
    updates.query = body.query.trim();
  }
  if (body.filters && typeof body.filters === 'object') {
    updates.filters = body.filters;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ search: data });
}

// Delete a saved search
export async function DELETE(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
