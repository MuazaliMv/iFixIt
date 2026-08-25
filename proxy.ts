import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from './lib/serverAuth';
import { canAccessPortal, normalizeAccountRole, type AccountRole } from './lib/roleAccess';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;

type AccessProfile={role:AccountRole;providerApproved:boolean};

function isProviderApplicationRoute(path:string){
 return path==='/provider/onboarding'||path.startsWith('/provider/onboarding/');
}

function loginUrl(request:NextRequest){
 const url=new URL('/login',request.url);
 url.searchParams.set('next',`${request.nextUrl.pathname}${request.nextUrl.search}`);
 return url;
}

function apiError(message:string,status:number){
 return NextResponse.json({error:message},{status});
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
 const customerRoute=path==='/home'||path.startsWith('/home/')||path==='/requests'||path.startsWith('/requests/')||path==='/messages'||path.startsWith('/messages/');
 const providerRoute=!providerApplicationRoute&&(path==='/provider'||path.startsWith('/provider/'));
 const adminRoute=path==='/admin'||path.startsWith('/admin/');
 const adminApi=path==='/api/admin'||path.startsWith('/api/admin/');
 const providerApi=path==='/api/provider'||path.startsWith('/api/provider/');
 const customerApi=path==='/api/service-requests'||path.startsWith('/api/service-requests/');
 const protectedApi=adminApi||providerApi||customerApi;
 const protectedRoute=customerRoute||providerRoute||adminRoute||providerApplicationRoute||protectedApi;
 if(!protectedRoute)return NextResponse.next();

 const auth=await resolveServerAuth(request);
 if(!auth){
  if(protectedApi)return apiError('Authentication required.',401);
  return NextResponse.redirect(loginUrl(request));
 }

 // Customer workspace routes, customer-owned request APIs, and provider application
 // require an authenticated session. Data ownership is still enforced downstream.
 if(customerRoute||customerApi||providerApplicationRoute){
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

 return applyAuthCookies(NextResponse.next(),auth);
}

export const config={
 matcher:[
  '/home/:path*',
  '/requests/:path*',
  '/messages/:path*',
  '/provider/:path*',
  '/admin/:path*',
  '/api/service-requests/:path*',
  '/api/provider/:path*',
  '/api/admin/:path*',
 ],
};
