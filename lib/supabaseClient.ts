import { createClient } from '@supabase/supabase-js';

/**
 * LEGACY COMPATIBILITY CLIENT.
 *
 * Do NOT use supabase.auth.getSession(), browser JWT/localStorage sessions,
 * client-side refresh tokens, or direct privileged Edge Function bearer calls
 * in new or migrated FixIt application code.
 *
 * Required application auth architecture:
 * Browser -> secure HttpOnly cookie -> same-origin Next.js API -> Supabase.
 *
 * This client remains temporarily for legacy data/realtime paths while those
 * screens are migrated. Password-recovery is the only intentional exception
 * where a Supabase recovery session/token may exist in the browser.
 */
export const supabase = createClient(
  'https://yzlhlilxiszefneshatm.supabase.co',
  'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

// Temporary compatibility only: keep old sign-out callers synchronized with
// the secure server session until all legacy callers have been removed.
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
