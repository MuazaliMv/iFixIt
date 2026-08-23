import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';
const ACCESS_COOKIE='ifixmv_access_token';
const REFRESH_COOKIE='ifixmv_refresh_token';

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const response=await fetch(AUTH_API,{
  method:'POST',
  headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||'', 'X-Forwarded-For':request.headers.get('x-forwarded-for')||''},
  body:JSON.stringify({action:'login',email:body.email,password:body.password})
 });
 const payload=await response.json().catch(()=>({error:'Unable to sign in.'}));
 const next=NextResponse.json(payload,{status:response.status});
 if(response.ok&&payload?.session?.access_token){
  next.cookies.set(ACCESS_COOKIE,payload.session.access_token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:Number(payload.session.expires_in)||3600});
  if(payload.session.refresh_token)next.cookies.set(REFRESH_COOKIE,payload.session.refresh_token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:60*60*24*30});
 }
 return next;
}
