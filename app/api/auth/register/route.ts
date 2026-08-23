import { NextRequest, NextResponse } from 'next/server';

const REGISTER_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/register-account';
const ALLOWED_ROLES=new Set(['CUSTOMER','PROVIDER']);

function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{
    const originUrl=new URL(origin);
    const forwardedHost=(request.headers.get('x-forwarded-host')||'').split(',')[0]?.trim();
    const host=(forwardedHost||request.headers.get('host')||request.nextUrl.host).trim();
    const forwardedProto=(request.headers.get('x-forwarded-proto')||'').split(',')[0]?.trim();
    const protocol=(forwardedProto||request.nextUrl.protocol.replace(':','')).trim();
    const expectedOrigin=`${protocol}://${host}`;
    return originUrl.origin===expectedOrigin||originUrl.origin===request.nextUrl.origin;
  }catch{
    return false;
  }
}

export async function POST(request:NextRequest){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const body=await request.json().catch(()=>({}));
  const role=String(body.role||'CUSTOMER').toUpperCase();
  if(!ALLOWED_ROLES.has(role))return NextResponse.json({error:'Invalid account type.'},{status:400});
  const email=String(body.email||'').trim().toLowerCase();
  const fullName=String(body.fullName||'').trim();
  const password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  if(fullName.length<2)return NextResponse.json({error:'Enter your full name.'},{status:400});
  if(password.length<8)return NextResponse.json({error:'Password must be at least 8 characters.'},{status:400});
  try{
    const response=await fetch(REGISTER_API,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(12000),body:JSON.stringify({fullName,email,password,role,phoneNumber:body.phoneNumber})});
    const payload=await response.json().catch(()=>({error:'Unable to create account.'}));
    return NextResponse.json(payload,{status:response.status});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to create account.'},{status:503});}
}
