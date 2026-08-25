import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

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

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});

 // Logout should always finish locally, even when the upstream session is already expired.
 const auth=await resolveServerAuth(request).catch(()=>null);
 if(auth){
  try{
   await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`,{
    method:'POST',
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth.authorization},
    signal:AbortSignal.timeout(3500),
    cache:'no-store',
   });
  }catch{}
 }

 const response=clearAuthCookies(NextResponse.json({ok:true,signedOut:true}));
 response.headers.set('Cache-Control','no-store, max-age=0');
 return response;
}
