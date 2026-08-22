import { NextRequest, NextResponse } from 'next/server';

const REGISTER_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/register-account';

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>({}));
  const response=await fetch(REGISTER_API,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      fullName:body.fullName,
      email:body.email,
      password:body.password,
      role:body.role,
      phoneNumber:body.phoneNumber,
    }),
  });
  const payload=await response.json().catch(()=>({error:'Unable to create account.'}));
  return NextResponse.json(payload,{status:response.status});
}
