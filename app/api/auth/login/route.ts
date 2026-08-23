import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../../../lib/serverAuth';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');return !origin||origin===request.nextUrl.origin;}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const email=String(body.email||'').trim().toLowerCase();
 const password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!password)return NextResponse.json({error:'Invalid email or password.'},{status:400});
 try{
  const response=await fetch(AUTH_API,{
   method:'POST',signal:AbortSignal.timeout(12000),
   headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||''},
   body:JSON.stringify({action:'login',email,password})
  });
  const payload=await response.json().catch(()=>({error:'Unable to sign in.'}));
  const next=NextResponse.json(payload,{status:response.status});
  if(response.ok&&payload?.session?.access_token){
   next.cookies.set(ACCESS_COOKIE,payload.session.access_token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:Number(payload.session.expires_in)||3600});
   if(payload.session.refresh_token)next.cookies.set(REFRESH_COOKIE,payload.session.refresh_token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:60*60*24*30});
  }
  return next;
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to sign in.'},{status:503});}
}
