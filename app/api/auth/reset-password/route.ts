import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-security';

function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');return !origin||origin===request.nextUrl.origin;}
function validPassword(value:unknown){const password=String(value??'');return password.length>=10&&password.length<=128&&/[A-Z]/.test(password)&&/[a-z]/.test(password)&&/\d/.test(password);}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const body=await request.json().catch(()=>({}));
 if(!validPassword(body.password))return NextResponse.json({error:'Password does not meet security requirements.'},{status:400});
 const authorization=request.headers.get('authorization')||'';
 if(!authorization.toLowerCase().startsWith('bearer '))return NextResponse.json({error:'Password reset session is invalid or expired.'},{status:401});
 try{
  const response=await fetch(AUTH_API,{
   method:'POST',signal:AbortSignal.timeout(12000),
   headers:{'Content-Type':'application/json',Authorization:authorization,'User-Agent':request.headers.get('user-agent')||''},
   body:JSON.stringify({action:'reset_password',password:String(body.password)})
  });
  const payload=await response.json().catch(()=>({error:'Unable to reset password.'}));
  return NextResponse.json(payload,{status:response.status});
 }catch(error){
  return NextResponse.json({error:error instanceof Error&&error.name==='TimeoutError'?'Password reset service timed out. Please try again.':'Unable to reset password.'},{status:503});
 }
}
