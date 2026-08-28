import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../../../lib/serverAuth';

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_ANON_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-security`;

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{
  const parsed=new URL(origin);
  const forwardedHost=(request.headers.get('x-forwarded-host')||request.headers.get('host')||'').split(',')[0].trim();
  const forwardedProto=(request.headers.get('x-forwarded-proto')||'https').split(',')[0].trim();
  if(forwardedHost&&parsed.host===forwardedHost&&parsed.protocol===`${forwardedProto}:`)return true;
  return parsed.origin===request.nextUrl.origin;
 }catch{return false;}
}

function secureCookie(request:NextRequest){
 const forwardedProto=(request.headers.get('x-forwarded-proto')||'').split(',')[0].trim();
 return forwardedProto?forwardedProto==='https':request.nextUrl.protocol==='https:';
}

async function persistVerifiedPhone(accessToken:string,userId:string,phone:string,phoneVerifiedAt:string){
 const response=await fetch(`${SUPABASE_URL}/rest/v1/auth_profiles?user_id=eq.${encodeURIComponent(userId)}`,{
  method:'PATCH',cache:'no-store',signal:AbortSignal.timeout(7000),
  headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json','Prefer':'return=minimal'},
  body:JSON.stringify({phone_number:phone,phone_verified_at:phoneVerifiedAt}),
 });
 if(!response.ok){
  const payload=await response.json().catch(()=>null);
  throw new Error(payload?.message||payload?.error||'Verified phone could not be saved to your profile.');
 }
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403,headers:{'Cache-Control':'no-store'}});
 const body=await request.json().catch(()=>({}));
 const digits=String(body.phone||'').replace(/\D/g,'');
 const phone=/^960\d{7}$/.test(digits)?`+${digits}`:/^\d{7}$/.test(digits)?`+960${digits}`:'';
 const otp=String(body.otp||'').trim();
 if(!phone)return NextResponse.json({error:'Enter a valid 7-digit Maldives phone number.'},{status:400,headers:{'Cache-Control':'no-store'}});
 if(!/^\d{4}$/.test(otp))return NextResponse.json({error:'Enter the 4-digit verification code.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const response=await fetch(AUTH_API,{
   method:'POST',signal:AbortSignal.timeout(12000),cache:'no-store',
   headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||''},
   body:JSON.stringify({action:'login',phone,otp})
  });
  const payload=await response.json().catch(()=>({error:'Unable to sign in.'}));
  if(!response.ok||!payload?.session?.access_token){
   return NextResponse.json(payload?.error?payload:{error:'Unable to create an authenticated session.'},{status:response.ok?500:response.status,headers:{'Cache-Control':'no-store'}});
  }

  const phoneVerifiedAt=String(payload?.profile?.phone_verified_at||'').trim();
  const verifiedPhone=Boolean(phoneVerifiedAt)&&payload?.profile?.phone_number===phone;
  if(!verifiedPhone){
   return NextResponse.json({error:'Phone verification was not recorded. Please verify the OTP again.'},{status:500,headers:{'Cache-Control':'no-store'}});
  }

  const userId=String(payload?.profile?.user_id||payload?.user?.id||'').trim();
  if(!userId)return NextResponse.json({error:'Verified account profile could not be identified.'},{status:500,headers:{'Cache-Control':'no-store'}});
  await persistVerifiedPhone(payload.session.access_token,userId,phone,phoneVerifiedAt);

  const role=String(payload?.profile?.role||payload?.user?.role||'CUSTOMER').toUpperCase();
  const normalizedRole=role==='ADMIN'?'ADMIN':role==='PROVIDER'?'PROVIDER':'CUSTOMER';
  const responsePayload={...payload,ok:true,profile:{...(payload?.profile||{}),role:normalizedRole,phone_number:phone,phone_verified_at:phoneVerifiedAt}};
  const next=NextResponse.json(responsePayload,{status:200,headers:{'Cache-Control':'no-store'}});
  const secure=secureCookie(request);
  next.cookies.set(ACCESS_COOKIE,payload.session.access_token,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:Number(payload.session.expires_in)||3600});
  if(payload.session.refresh_token)next.cookies.set(REFRESH_COOKIE,payload.session.refresh_token,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:60*60*24*30});
  return next;
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to sign in.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
