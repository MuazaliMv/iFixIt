import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const response=await fetch(AUTH_API,{
  method:'POST',
  headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||'', 'X-Forwarded-For':request.headers.get('x-forwarded-for')||''},
  body:JSON.stringify({action:'login',email:body.email,password:body.password})
 });
 const payload=await response.json().catch(()=>({error:'Unable to sign in.'}));
 return NextResponse.json(payload,{status:response.status});
}
