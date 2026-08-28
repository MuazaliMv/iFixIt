import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_ANON_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
export const ACCESS_COOKIE='ifixmv_access_token';
export const REFRESH_COOKIE='ifixmv_refresh_token';

type RefreshSession={
 access_token:string;
 refresh_token?:string;
 expires_in?:number;
 expires_at?:number;
 user?:unknown;
};

export type ServerAuthResult={
 authorization:string;
 accessToken:string;
 refreshToken?:string;
 refreshed:boolean;
 expiresIn:number;
};

type CachedRefresh={session:RefreshSession;expiresAt:number};
type CachedValidation={valid:boolean;expiresAt:number};
const refreshInFlight=new Map<string,Promise<RefreshSession|null>>();
const refreshCache=new Map<string,CachedRefresh>();
const validationInFlight=new Map<string,Promise<boolean>>();
const validationCache=new Map<string,CachedValidation>();
const REFRESH_CACHE_MS=10_000;
const VALIDATION_OK_CACHE_MS=10_000;
const VALIDATION_FAIL_CACHE_MS=1_000;
const MAX_VALIDATION_CACHE_ENTRIES=500;

function rememberValidation(token:string,valid:boolean){
 if(validationCache.size>=MAX_VALIDATION_CACHE_ENTRIES){
  const firstKey=validationCache.keys().next().value as string|undefined;
  if(firstKey)validationCache.delete(firstKey);
 }
 validationCache.set(token,{valid,expiresAt:Date.now()+(valid?VALIDATION_OK_CACHE_MS:VALIDATION_FAIL_CACHE_MS)});
 return valid;
}

async function performAccessTokenValidation(token:string){
 for(let attempt=0;attempt<2;attempt+=1){
  try{
   const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},
    cache:'no-store',signal:AbortSignal.timeout(5000),
   });
   if(response.ok)return true;
   if(response.status===401||response.status===403)return false;
  }catch{}
  if(attempt===0)await new Promise(resolve=>setTimeout(resolve,120));
 }
 return false;
}

async function validateAccessToken(token:string){
 const cached=validationCache.get(token);
 if(cached&&cached.expiresAt>Date.now())return cached.valid;
 if(cached)validationCache.delete(token);

 const existing=validationInFlight.get(token);
 if(existing)return existing;

 const promise=performAccessTokenValidation(token)
  .then(valid=>rememberValidation(token,valid))
  .finally(()=>validationInFlight.delete(token));
 validationInFlight.set(token,promise);
 return promise;
}

async function performRefresh(refreshToken:string):Promise<RefreshSession|null>{
 try{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
   method:'POST',
   headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({refresh_token:refreshToken}),
   cache:'no-store',signal:AbortSignal.timeout(7000),
  });
  if(!response.ok)return null;
  const payload=await response.json().catch(()=>null);
  if(!payload?.access_token)return null;
  return payload as RefreshSession;
 }catch{return null;}
}

async function refreshAccessToken(refreshToken:string):Promise<RefreshSession|null>{
 const cached=refreshCache.get(refreshToken);
 if(cached&&cached.expiresAt>Date.now())return cached.session;
 if(cached)refreshCache.delete(refreshToken);

 const existing=refreshInFlight.get(refreshToken);
 if(existing)return existing;

 const promise=performRefresh(refreshToken).then(session=>{
  if(session){
   refreshCache.set(refreshToken,{session,expiresAt:Date.now()+REFRESH_CACHE_MS});
   rememberValidation(session.access_token,true);
  }
  return session;
 }).finally(()=>refreshInFlight.delete(refreshToken));

 refreshInFlight.set(refreshToken,promise);
 return promise;
}

export async function resolveServerAuth(request:NextRequest):Promise<ServerAuthResult|null>{
 // FixIt authentication is intentionally cookie-bound. A caller cannot promote an
 // arbitrary Supabase bearer token into an application session. These cookies are
 // issued by /api/auth/login only after successful OTP verification and verified
 // phone state has been confirmed. Once issued, validate the Supabase session itself
 // rather than requiring a second JWT AMR claim that the custom OTP auth flow may not emit.
 //
 // Important: a single Next.js navigation can invoke proxy + several API routes at once.
 // Supabase token validation is therefore briefly cached and deduplicated per process,
 // preventing dozens of identical /auth/v1/user requests during one mobile transition.
 // Refreshes are also serialized because Supabase refresh tokens rotate.
 const accessToken=request.cookies.get(ACCESS_COOKIE)?.value||'';
 const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value||'';
 if(accessToken&&await validateAccessToken(accessToken))return{authorization:`Bearer ${accessToken}`,accessToken,refreshToken:refreshToken||undefined,refreshed:false,expiresIn:3600};
 if(!refreshToken)return null;

 const refreshed=await refreshAccessToken(refreshToken);
 if(!refreshed)return null;
 return{
  authorization:`Bearer ${refreshed.access_token}`,
  accessToken:refreshed.access_token,
  refreshToken:refreshed.refresh_token||refreshToken,
  refreshed:true,
  expiresIn:Number(refreshed.expires_in)||3600,
 };
}

export function applyAuthCookies(response:NextResponse,auth:ServerAuthResult|null){
 if(!auth?.refreshed)return response;
 response.cookies.set(ACCESS_COOKIE,auth.accessToken,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:auth.expiresIn});
 if(auth.refreshToken)response.cookies.set(REFRESH_COOKIE,auth.refreshToken,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:60*60*24*30});
 return response;
}

export function clearAuthCookies(response:NextResponse){
 response.cookies.set(ACCESS_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
 response.cookies.set(REFRESH_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
 return response;
}
