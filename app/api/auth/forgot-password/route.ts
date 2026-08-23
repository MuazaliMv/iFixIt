import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');return !origin||origin===request.nextUrl.origin;}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const email=String(body.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
 const origin=request.nextUrl.origin;
 try{
  const response=await fetch(AUTH_API,{
   method:'POST',signal:AbortSignal.timeout(12000),
   headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||''},
   body:JSON.stringify({action:'forgot_password',email,redirectTo:`${origin}/reset-password`})
  });
  const payload=await response.json().catch(()=>({error:'Unable to start password reset.'}));
  return NextResponse.json(payload,{status:response.status});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to start password reset.'},{status:503});}
}
