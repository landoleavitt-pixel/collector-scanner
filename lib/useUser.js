'use client';

import { useEffect, useState } from 'react';
import { createClient } from './supabaseClient';

// True when signed in, even if useUser hasn't finished loading. A tap right
// after a page opens mustn't be mistaken for a signed-out visitor.
export async function isSignedIn(user) {
  if (user) return true;
  const { data } = await createClient().auth.getSession();
  return !!data.session;
}

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data, error }) => {
      // A network blip isn't a sign-out; the listener below has the session.
      if (!error || (error.status >= 400 && error.status < 500)) setUser(data.user ?? null);
      setLoading(false);
    });

    // Listen for changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
