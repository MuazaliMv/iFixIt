import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from './lib/serverAuth';
import { canAccessPortal, normalizeAccountRole, type AccountRole } from './lib/roleAccess';

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'https://yzlhlilxiszefneshatm.supabase.co';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;

type AccessProfile={userId:string;role:AccountRole;providerApproved:boolean};
type CachedAccess={profile:AccessProfile|null;expiresAt:number};
const accessCache=new Map<string,CachedAccess>();
const accessInFlight=new Map<string,Promise<AccessProfile|null>>();
const ACCESS_OK_CACHE_MS=10_000;
const ACCESS_FAIL_CACHE_MS=1_000;
const MAX_ACCESS_CACHE_ENTRIES=500;

function isProviderApplicationRoute(path:string){
 return path==='/provider/onboarding'||path.startsWith('/provider/onboarding/');
}

function isAdminProviderRoute(path:string){
 return path==='/admin/providers'||path.startsWith('/admin/providers/');
}

function loginUrl(request:NextRequest){
 const url=new URL('/login',request.url);
 url.searchParams.set('next',`${request.nextUrl.pathname}${request.nextUrl.search}`);
 return url;
}

function accessIssueUrl(request:NextRequest,portal:'admin'|'provider',reason:'unavailable'|'denied'){
 const url=new URL('/access-status',request.url);
 url.searchParams.set('portal',portal);
 url.searchParams.set('reason',reason);
 url.searchParams.set('next',`${request.nextUrl.pathname}${request.nextUrl.search}`);
 return url;
}

function apiError(message:string,status:number,code?:string){
 return NextResponse.json({error:message,...(code?{code}:{})},{status,headers:{'Cache-Control':'no-store'}});
}

function applyProviderNoStore(response:NextResponse,path:string){
 if(!isAdminProviderRoute(path))return response;
 response.headers.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
 response.headers.set('Pragma','no-cache');
 response.headers.set('Expires','0');
 response.headers.set('Surrogate-Control','no-store');
 return response;
}

function accessCacheKey(authorization:string){
 return authorization.startsWith('Bearer ')?authorization.slice(7):authorization;
}

function rememberAccess(key:string,profile:AccessProfile|null){
 if(accessCache.size>=MAX_ACCESS_CACHE_ENTRIES){
  const firstKey=accessCache.keys().next().value as string|undefined;
  if(firstKey)accessCache.delete(firstKey);
 }
 accessCache.set(key,{profile,expiresAt:Date.now()+(profile?ACCESS_OK_CACHE_MS:ACCESS_FAIL_CACHE_MS)});
 return profile;
}

async function fetchAccessProfile(authorization:string):Promise<AccessProfile|null>{
 try{
  const response=await fetch(AUTH_API,{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:authorization},
   body:JSON.stringify({action:'profile_get'}),
   cache:'no-store',
   signal:AbortSignal.timeout(7000),
  });
  if(!response.ok)return null;
  const payload=await response.json().catch(()=>null);
  const userId=String(payload?.profile?.user_id||payload?.profile?.id||'').trim();
  return {
   userId,
   role:normalizeAccountRole(payload?.profile?.role),
   providerApproved:Boolean(payload?.profile?.provider_approved),
  };
 }catch{
  return null;
 }
}

async function resolveAccessProfile(authorization:string):Promise<AccessProfile|null>{
 const key=accessCacheKey(authorization);
 const cached=accessCache.get(key);
 if(cached&&cached.expiresAt>Date.now())return cached.profile;
 if(cached)accessCache.delete(key);

 const existing=accessInFlight.get(key);
 if(existing)return existing;

 const promise=fetchAccessProfile(authorization)
  .then(profile=>rememberAccess(key,profile))
  .finally(()=>accessInFlight.delete(key));
 accessInFlight.set(key,promise);
 return promise;
}

async function resolveProviderSuspended(userId:string,providerApproved:boolean):Promise<boolean|null>{
 if(!providerApproved)return false;
 if(!userId)return null;
 const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!serviceRole)return null;
 try{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/provider_onboarding_profiles?select=onboarding_status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,{
   headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`},
   cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  if(!response.ok)return null;
  const rows=await response.json().catch(()=>[]);
  const status=Array.isArray(rows)?String(rows[0]?.onboarding_status||'').toUpperCase():'';
  return status==='SUSPENDED';
 }catch{
  return null;
 }
}

export default async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;
 const providerApplicationRoute=isProviderApplicationRoute(path);
 const providerRoute=!providerApplicationRoute&&(path==='/provider'||path.startsWith('/provider/'));
 const adminRoute=path==='/admin'||path.startsWith('/admin/');
 const apiRoute=path==='/api'||path.startsWith('/api/');
 const adminApi=path==='/api/admin'||path.startsWith('/api/admin/');
 const providerApi=path==='/api/provider'||path.startsWith('/api/provider/');

 // Global invariant: every matched application page and API requires a valid,
 // OTP-backed server session before any role or business authorization runs.
 const auth=await resolveServerAuth(request);
 if(!auth){
  if(apiRoute)return apiError('OTP-verified authentication required.',401,'OTP_LOGIN_REQUIRED');
  return NextResponse.redirect(loginUrl(request));
 }

 // Most application surfaces only need the global authenticated-session gate here;
 // ownership and business rules continue to be enforced in their route handlers.
 if(!adminRoute&&!providerRoute&&!adminApi&&!providerApi){
  return applyAuthCookies(NextResponse.next(),auth);
 }

 // One navigation can request several admin/provider resources concurrently. Cache
 // the same account permission result briefly so every resource does not invoke the
 // auth-account Edge Function again during that route transition.
 const access=await resolveAccessProfile(auth.authorization);
 if(!access){
  // Never move a user into the Customer workspace merely because the permission
  // service is unavailable. Preserve the selected workspace and show a neutral
  // status surface instead, preventing /admin -> /home -> /admin redirect loops.
  if(adminApi||providerApi){
   return applyAuthCookies(apiError('Unable to verify account permissions.',503,'PERMISSION_SERVICE_UNAVAILABLE'),auth);
  }
  const portal=adminRoute?'admin':'provider';
  return applyAuthCookies(NextResponse.redirect(accessIssueUrl(request,portal,'unavailable')),auth);
 }

 if((adminRoute||adminApi)&&!canAccessPortal(access.role,'admin',access.providerApproved)){
  if(adminApi)return applyAuthCookies(apiError('Admin permission required.',403,'ADMIN_PERMISSION_REQUIRED'),auth);
  return applyAuthCookies(NextResponse.redirect(accessIssueUrl(request,'admin','denied')),auth);
 }

 if(providerRoute||providerApi){
  const providerSuspended=await resolveProviderSuspended(access.userId,access.providerApproved);
  if(providerSuspended===null){
   if(providerApi)return applyAuthCookies(apiError('Unable to verify Service Provider permission.',503,'PERMISSION_SERVICE_UNAVAILABLE'),auth);
   return applyAuthCookies(NextResponse.redirect(accessIssueUrl(request,'provider','unavailable')),auth);
  }
  if(!canAccessPortal(access.role,'provider',access.providerApproved,providerSuspended)){
   if(providerApi)return applyAuthCookies(apiError(providerSuspended?'Service Provider account is suspended.':'Service Provider permission required.',403,providerSuspended?'PROVIDER_SUSPENDED':'PROVIDER_PERMISSION_REQUIRED'),auth);
   return applyAuthCookies(NextResponse.redirect(accessIssueUrl(request,'provider','denied')),auth);
  }
 }

 const response=applyAuthCookies(NextResponse.next(),auth);
 return applyProviderNoStore(response,path);
}

export const config={
 matcher:[
  // Public exceptions are deliberately narrow: OTP/login APIs, Railway health,
  // and framework/static assets. Everything else is authenticated globally.
  // Both location-catalogue URLs are excluded from this proxy only because their
  // shared route handler performs the same OTP-backed server auth itself, which
  // prevents refresh-token double consumption without weakening authentication.
  '/((?!login(?:/|$)|api/auth(?:/|$)|api/health$|api/locations/catalog$|api/locations/catalogue$|_next/static|_next/image|favicon.ico$|robots.txt$|sitemap.xml$|manifest.webmanifest$|.*\\.[^/]+$).*)',
 ],
};
