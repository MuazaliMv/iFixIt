import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
export const ACCESS_COOKIE='ifixmv_access_token';
export const REFRESH_COOKIE='ifixmv_refresh_token';
const AUTH_VALIDATION_TTL_MS=10_000;
const AUTH_VALIDATION_CACHE_LIMIT=500;
const validAccessTokens=new Map<string,number>();

type RefreshSession={access_token:string;refresh_token?:string;expires_in?:number;expires_at?:number;user?:unknown};
export type ServerAuthResult={authorization:string;accessToken:string;refreshToken?:string;refreshed:boolean;expiresIn:number};
type AmrEntry=string|{method?:unknown};

function hasOtpAuthenticationMethod(token:string){
 try{
  const parts=token.split('.');if(parts.length!==3)return false;
  const encoded=parts[1].replace(/-/g,'+').replace(/_/g,'/');
  const padded=encoded.padEnd(Math.ceil(encoded.length/4)*4,'=');
  const payload=JSON.parse(atob(padded));
  const amr=Array.isArray(payload?.amr)?payload.amr as AmrEntry[]:[];
  return amr.some(entry=>typeof entry==='string'?entry.toLowerCase()==='otp':String(entry?.method||'').toLowerCase()==='otp');
 }catch{return false;}
}

function rememberValidToken(token:string){
 if(validAccessTokens.size>=AUTH_VALIDATION_CACHE_LIMIT){const first=validAccessTokens.keys().next().value as string|undefined;if(first)validAccessTokens.delete(first);}
 validAccessTokens.set(token,Date.now()+AUTH_VALIDATION_TTL_MS);
}

async function validateAccessToken(token:string){
 if(!hasOtpAuthenticationMethod(token))return false;
 const cachedUntil=validAccessTokens.get(token)||0;
 if(cachedUntil>Date.now())return true;
 if(cachedUntil)validAccessTokens.delete(token);
 try{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(response.ok)rememberValidToken(token);
  return response.ok;
 }catch{return false;}
}

async function refreshAccessToken(refreshToken:string):Promise<RefreshSession|null>{
 try{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken}),cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const payload=await response.json().catch(()=>null);
  if(!payload?.access_token||!hasOtpAuthenticationMethod(payload.access_token))return null;
  rememberValidToken(payload.access_token);
  return payload as RefreshSession;
 }catch{return null;}
}

export async function resolveServerAuth(request:NextRequest):Promise<ServerAuthResult|null>{
 const accessToken=request.cookies.get(ACCESS_COOKIE)?.value||'';
 const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value||'';
 if(accessToken&&await validateAccessToken(accessToken))return{authorization:`Bearer ${accessToken}`,accessToken,refreshToken:refreshToken||undefined,refreshed:false,expiresIn:3600};
 if(!refreshToken)return null;
 const refreshed=await refreshAccessToken(refreshToken);if(!refreshed)return null;
 return{authorization:`Bearer ${refreshed.access_token}`,accessToken:refreshed.access_token,refreshToken:refreshed.refresh_token||refreshToken,refreshed:true,expiresIn:Number(refreshed.expires_in)||3600};
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
