import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from './lib/serverAuth';
import { canAccessPortal, normalizeAccountRole, type AccountRole } from './lib/roleAccess';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;

type AccessProfile={role:AccountRole;providerApproved:boolean};

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

async function resolveAccessProfile(authorization:string):Promise<AccessProfile|null>{
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
  return {
   role:normalizeAccountRole(payload?.profile?.role),
   providerApproved:Boolean(payload?.profile?.provider_approved),
  };
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

 const access=await resolveAccessProfile(auth.authorization);
 if(!access){
  // Role-protected surfaces fail closed. A permission-service outage must never
  // temporarily expose Admin or Service Provider interfaces or APIs.
  if(adminApi||providerApi){
   return applyAuthCookies(apiError('Unable to verify account permissions.',503),auth);
  }
  return applyAuthCookies(NextResponse.redirect(new URL('/home',request.url)),auth);
 }

 if((adminRoute||adminApi)&&!canAccessPortal(access.role,'admin',access.providerApproved)){
  if(adminApi)return applyAuthCookies(apiError('Admin permission required.',403),auth);
  return applyAuthCookies(NextResponse.redirect(new URL('/home',request.url)),auth);
 }

 if((providerRoute||providerApi)&&!canAccessPortal(access.role,'provider',access.providerApproved)){
  if(providerApi)return applyAuthCookies(apiError('Service Provider permission required.',403),auth);
  return applyAuthCookies(NextResponse.redirect(new URL('/home',request.url)),auth);
 }

 const response=applyAuthCookies(NextResponse.next(),auth);
 return applyProviderNoStore(response,path);
}

export const config={
 matcher:[
  // Public exceptions are deliberately narrow: OTP/login APIs, Railway health,
  // and framework/static assets. Everything else is authenticated globally.
  // The location catalogue is excluded from this proxy only because its route
  // handler performs the same OTP-backed server auth itself, which
  // prevents refresh-token double consumption without weakening authentication.
  '/((?!login(?:/|$)|api/auth(?:/|$)|api/health$|api/locations/catalogue$|_next/static|_next/image|favicon.ico$|robots.txt$|sitemap.xml$|manifest.webmanifest$|.*\\.[^/]+$).*)',
 ],
};
