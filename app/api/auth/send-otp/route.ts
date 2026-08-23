import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-account';

function normalizeMaldivesPhone(value:unknown){
 const raw=String(value??'').trim().replace(/[\s()-]/g,'');
 if(/^\d{7}$/.test(raw))return `+960${raw}`;
 if(/^960\d{7}$/.test(raw))return `+${raw}`;
 if(/^\+960\d{7}$/.test(raw))return raw;
 return raw;
}

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const phoneNumber=normalizeMaldivesPhone(body.phoneNumber);
 const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send_otp',phoneNumber})});
 const payload=await response.json().catch(()=>({error:'Unable to send OTP.'}));
 return NextResponse.json(payload,{status:response.status});
}
