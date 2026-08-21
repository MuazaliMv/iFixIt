import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-account';

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',fullName:body.fullName,email:body.email,password:body.password,role:body.role,phoneNumber:body.phoneNumber,otp:body.otp})});
 const payload=await response.json().catch(()=>({error:'Unable to create account.'}));
 return NextResponse.json(payload,{status:response.status});
}
