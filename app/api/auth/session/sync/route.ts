import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

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

async function validAccessToken(token:string){
 try{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
   headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},
   cache:'no-store',
   signal:AbortSignal.timeout(7000),
  });
  return response.ok;
 }catch{return false;}
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});

 const body=await request.json().catch(()=>({}));
 const accessToken=String(body?.accessToken||'').trim();
 const refreshToken=String(body?.refreshToken||'').trim();
 const requestedExpiresIn=Number(body?.expiresIn);
 const expiresIn=Number.isFinite(requestedExpiresIn)
  ?Math.max(60,Math.min(Math.floor(requestedExpiresIn),60*60*24))
  :3600;

 if(!accessToken)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(!(await validAccessToken(accessToken)))return NextResponse.json({error:'Session is no longer valid.'},{status:401});

 const response=NextResponse.json({authenticated:true});
 response.cookies.set(ACCESS_COOKIE,accessToken,{
  httpOnly:true,
  secure:true,
  sameSite:'lax',
  path:'/',
  maxAge:expiresIn,
 });
 if(refreshToken){
  response.cookies.set(REFRESH_COOKIE,refreshToken,{
   httpOnly:true,
   secure:true,
   sameSite:'lax',
   path:'/',
   maxAge:60*60*24*30,
  });
 }
 return response;
}
