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
 *
 * IMPORTANT: autoRefreshToken stays disabled. The same OTP session is mirrored
 * temporarily into this legacy browser client after login, but the secure
 * HttpOnly server session is authoritative and owns refresh-token rotation.
 * Allowing the browser client to auto-refresh the same refresh token can rotate
 * it out from under the server cookie and cause a login -> app -> login loop.
 */
export const supabase = createClient(
  'https://yzlhlilxiszefneshatm.supabase.co',
  'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6',
  { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } },
);

// Legacy customer screens still call three Supabase Edge Function URLs directly.
// On mobile Safari this can leave the page stuck on "Loading…" when the browser
// session and the secure HttpOnly server session drift apart, or when a cross-
// origin request stalls. Route only these known calls through the authenticated
// same-origin server proxy. This keeps navigation responsive and gives the calls
// a hard server timeout while the legacy screens are migrated to apiFetch().
if(typeof window!=='undefined'){
  const marker='__ifixLegacyEdgeProxyInstalled__';
  const w=window as typeof window & Record<string,unknown>;
  if(!w[marker]){
    w[marker]=true;
    const nativeFetch=window.fetch.bind(window);
    const prefix='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/';
    const allowed=new Set(['customer-requests','dispatch-control','request-media']);
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(raw.startsWith(prefix)){
        const service=raw.slice(prefix.length).split(/[?#]/,1)[0];
        if(allowed.has(service)){
          const headers=new Headers(init?.headers);
          headers.delete('Authorization');
          headers.delete('apikey');
          if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
          return nativeFetch(`/api/legacy-edge?service=${encodeURIComponent(service)}`,{
            ...init,
            method:init?.method||'POST',
            headers,
            credentials:'same-origin',
            cache:'no-store',
          });
        }
      }
      return nativeFetch(input,init);
    }) as typeof window.fetch;
  }
}

// Keep every legacy sign-out caller synchronized with the secure server session.
// The local/browser logout must never make the UI wait on a slow network call.
const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
(supabase.auth as any).signOut = async (...args: any[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('ifixmv-login-workspace');
      localStorage.removeItem('fixit:mobile-nav-role');
      localStorage.removeItem('fixit:app-mode');
      localStorage.removeItem('fixit:account-role');
      sessionStorage.removeItem('fixit:mode-toast');
    } catch {}
  }

  const serverLogout = typeof window !== 'undefined'
    ? fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }).catch(() => null)
    : Promise.resolve(null);

  const browserLogout = originalSignOut(...args).catch((error: unknown) => ({ error } as any));

  // Do both cleanups together, but cap the wait so logout always feels immediate.
  await Promise.race([
    Promise.allSettled([serverLogout, browserLogout]),
    new Promise(resolve => setTimeout(resolve, 1800)),
  ]);

  return { error: null } as any;
};
