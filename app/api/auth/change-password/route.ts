import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const authorization=request.headers.get('authorization')||'';
 const response=await fetch(AUTH_API,{
  method:'POST',
  headers:{
   'Content-Type':'application/json',
   Authorization:authorization,
   'User-Agent':request.headers.get('user-agent')||'',
   'X-Forwarded-For':request.headers.get('x-forwarded-for')||''
  },
  body:JSON.stringify({action:'change_password',currentPassword:body.currentPassword,newPassword:body.newPassword})
 });
 const payload=await response.json().catch(()=>({error:'Unable to change password.'}));
 return NextResponse.json(payload,{status:response.status});
}
