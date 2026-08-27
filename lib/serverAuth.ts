import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
export const ACCESS_COOKIE='ifixmv_access_token';
export const REFRESH_COOKIE='ifixmv_refresh_token';

const authClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
});

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
 userId:string;
 refreshToken?:string;
 refreshed:boolean;
 expiresIn:number;
};

type AmrEntry=string|{method?:unknown};
type JwtClaims={sub?:unknown;amr?:unknown};

function hasOtpAuthenticationMethod(claims:JwtClaims){
 const amr=Array.isArray(claims.amr)?claims.amr as AmrEntry[]:[];
 return amr.some(entry=>{
  if(typeof entry==='string')return entry.toLowerCase()==='otp';
  return String(entry?.method||'').toLowerCase()==='otp';
 });
}

async function verifiedClaims(token:string):Promise<JwtClaims|null>{
 try{
  const {data,error}=await authClient.auth.getClaims(token);
  const claims=data?.claims as JwtClaims|undefined;
  if(error||!claims||typeof claims.sub!=='string'||!claims.sub||!hasOtpAuthenticationMethod(claims))return null;
  return claims;
 }catch{return null;}
}

async function refreshAccessToken(refreshToken:string):Promise<RefreshSession|null>{
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

export async function resolveServerAuth(request:NextRequest):Promise<ServerAuthResult|null>{
 // Authentication stays cookie-bound. Tokens are accepted only from HttpOnly cookies
 // issued after OTP login, and their signatures/expiry are verified before use.
 // getClaims() avoids the previous /auth/v1/user request for asymmetric Supabase JWTs
 // by using Supabase's cached JWKS verification path.
 const accessToken=request.cookies.get(ACCESS_COOKIE)?.value||'';
 const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value||'';
 if(accessToken){
  const claims=await verifiedClaims(accessToken);
  if(claims)return{authorization:`Bearer ${accessToken}`,accessToken,userId:String(claims.sub),refreshToken:refreshToken||undefined,refreshed:false,expiresIn:3600};
 }
 if(!refreshToken)return null;

 const refreshed=await refreshAccessToken(refreshToken);
 if(!refreshed)return null;
 const claims=await verifiedClaims(refreshed.access_token);
 if(!claims)return null;
 return{
  authorization:`Bearer ${refreshed.access_token}`,
  accessToken:refreshed.access_token,
  userId:String(claims.sub),
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
