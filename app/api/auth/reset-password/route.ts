import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-account';

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const authorization=request.headers.get('authorization')||'';
 const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'reset_password',password:body.password})});
 const payload=await response.json().catch(()=>({error:'Unable to reset password.'}));
 return NextResponse.json(payload,{status:response.status});
}
