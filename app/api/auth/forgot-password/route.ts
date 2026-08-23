import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const origin=request.nextUrl.origin;
 const response=await fetch(AUTH_API,{
  method:'POST',
  headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||'', 'X-Forwarded-For':request.headers.get('x-forwarded-for')||''},
  body:JSON.stringify({action:'forgot_password',email:body.email,redirectTo:`${origin}/reset-password`})
 });
 const payload=await response.json().catch(()=>({error:'Unable to start password reset.'}));
 return NextResponse.json(payload,{status:response.status});
}
