import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yzlhlilxiszefneshatm.supabase.co',
  'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

// Keep legacy Supabase-client logout calls synchronized with the secure
// HTTP-only session cookies used by the server authentication flow.
const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
(supabase.auth as any).signOut = async (...args: any[]) => {
  const result = await originalSignOut(...args);
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {}
  }
  return result;
};
