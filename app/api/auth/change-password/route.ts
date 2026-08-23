import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 return !origin||origin===request.nextUrl.origin;
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 const body=await request.json().catch(()=>({}));
 try{
  const response=await fetch(AUTH_API,{
   method:'POST',signal:AbortSignal.timeout(12000),
   headers:{'Content-Type':'application/json',Authorization:auth.authorization,'User-Agent':request.headers.get('user-agent')||''},
   body:JSON.stringify({action:'change_password',currentPassword:body.currentPassword,newPassword:body.newPassword})
  });
  const payload=await response.json().catch(()=>({error:'Unable to change password.'}));
  return applyAuthCookies(NextResponse.json(payload,{status:response.status}),auth);
 }catch(error){
  return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to change password.'},{status:503}),auth);
 }
}
