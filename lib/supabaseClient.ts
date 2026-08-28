import { createClient } from '@supabase/supabase-js';

/**
 * LEGACY COMPATIBILITY CLIENT.
 *
 * New authenticated application code must use the secure HttpOnly server session
 * through same-origin Next.js APIs. This client remains only for legacy public,
 * realtime and recovery flows while those screens are migrated.
 */
export const supabase = createClient(
  'https://yzlhlilxiszefneshatm.supabase.co',
  'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6',
  { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } },
);

// Route known authenticated Edge Function calls through the cookie-authenticated
// same-origin proxy. This prevents protected screens from depending on a browser
// refresh token and also removes Safari cross-origin/session drift from the path.
if(typeof window!=='undefined'){
  const marker='__ifixLegacyEdgeProxyInstalled__';
  const w=window as typeof window & Record<string,unknown>;
  if(!w[marker]){
    w[marker]=true;
    const nativeFetch=window.fetch.bind(window);
    const prefix='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/';
    const allowed=new Set([
      'customer-requests','dispatch-control','request-media','request-messages',
      'submit-request','provider-offers','provider-marketplace','provider-onboarding',
      'provider-subscription','provider-insights',
    ]);
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(raw.startsWith(prefix)){
        const service=raw.slice(prefix.length).split(/[?#]/,1)[0];
        if(allowed.has(service)){
          const headers=new Headers(init?.headers);
          headers.delete('Authorization');
          headers.delete('apikey');
          const body=init?.body;
          if(body instanceof FormData){
            // Browser must generate the multipart boundary itself.
            headers.delete('Content-Type');
          }else if(!headers.has('Content-Type')){
            headers.set('Content-Type','application/json');
          }
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

// Keep explicit legacy sign-out callers synchronized with the authoritative
// secure server session. Browser auth events themselves are not logout authority.
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
  await Promise.race([
    Promise.allSettled([serverLogout, browserLogout]),
    new Promise(resolve => setTimeout(resolve, 1800)),
  ]);
  return { error: null } as any;
};
