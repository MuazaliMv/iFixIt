import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
export const ACCESS_COOKIE='ifixmv_access_token';
export const REFRESH_COOKIE='ifixmv_refresh_token';
const AUTH_VALIDATION_TTL_MS=15_000;
const AUTH_VALIDATION_CACHE_LIMIT=500;
type CachedAuth={expiresAt:number;userId:string};
const validAccessTokens=new Map<string,CachedAuth>();

type RefreshSession={access_token:string;refresh_token?:string;expires_in?:number;expires_at?:number;user?:{id?:string}|null};
export type ServerAuthResult={authorization:string;accessToken:string;userId:string;refreshToken?:string;refreshed:boolean;expiresIn:number};
type AmrEntry=string|{method?:unknown};

function decodeTokenPayload(token:string){
 try{
  const parts=token.split('.');if(parts.length!==3)return null;
  const encoded=parts[1].replace(/-/g,'+').replace(/_/g,'/');
  const padded=encoded.padEnd(Math.ceil(encoded.length/4)*4,'=');
  const payload=JSON.parse(atob(padded));
  return payload&&typeof payload==='object'?payload:null;
 }catch{return null;}
}
function hasOtpAuthenticationMethod(token:string){
 const payload=decodeTokenPayload(token);if(!payload)return false;
 const amr=Array.isArray(payload?.amr)?payload.amr as AmrEntry[]:[];
 return amr.some(entry=>typeof entry==='string'?entry.toLowerCase()==='otp':String(entry?.method||'').toLowerCase()==='otp');
}
function tokenSubject(token:string){const payload=decodeTokenPayload(token);const sub=String(payload?.sub||'').trim();return sub||null;}
function rememberValidToken(token:string,userId:string){
 if(validAccessTokens.size>=AUTH_VALIDATION_CACHE_LIMIT){const first=validAccessTokens.keys().next().value as string|undefined;if(first)validAccessTokens.delete(first);}
 validAccessTokens.set(token,{expiresAt:Date.now()+AUTH_VALIDATION_TTL_MS,userId});
}

async function validateAccessToken(token:string):Promise<string|null>{
 if(!hasOtpAuthenticationMethod(token))return null;
 const cached=validAccessTokens.get(token);
 if(cached&&cached.expiresAt>Date.now())return cached.userId;
 if(cached)validAccessTokens.delete(token);
 try{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return null;
  const payload=await response.json().catch(()=>null);
  const userId=String(payload?.id||'').trim();
  if(!userId)return null;
  rememberValidToken(token,userId);
  return userId;
 }catch{return null;}
}

async function refreshAccessToken(refreshToken:string):Promise<(RefreshSession&{userId:string})|null>{
 try{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken}),cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const payload=await response.json().catch(()=>null) as RefreshSession|null;
  if(!payload?.access_token||!hasOtpAuthenticationMethod(payload.access_token))return null;
  const userId=String(payload.user?.id||tokenSubject(payload.access_token)||'').trim();
  if(!userId)return null;
  rememberValidToken(payload.access_token,userId);
  return {...payload,userId};
 }catch{return null;}
}

export async function resolveServerAuth(request:NextRequest):Promise<ServerAuthResult|null>{
 const accessToken=request.cookies.get(ACCESS_COOKIE)?.value||'';
 const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value||'';
 if(accessToken){const userId=await validateAccessToken(accessToken);if(userId)return{authorization:`Bearer ${accessToken}`,accessToken,userId,refreshToken:refreshToken||undefined,refreshed:false,expiresIn:3600};}
 if(!refreshToken)return null;
 const refreshed=await refreshAccessToken(refreshToken);if(!refreshed)return null;
 return{authorization:`Bearer ${refreshed.access_token}`,accessToken:refreshed.access_token,userId:refreshed.userId,refreshToken:refreshed.refresh_token||refreshToken,refreshed:true,expiresIn:Number(refreshed.expires_in)||3600};
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
