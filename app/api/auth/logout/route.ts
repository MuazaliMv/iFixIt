import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 return !origin||origin===request.nextUrl.origin;
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const auth=await resolveServerAuth(request);
 if(auth){
  try{
   await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`,{
    method:'POST',
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth.authorization},
    signal:AbortSignal.timeout(7000),cache:'no-store',
   });
  }catch{}
 }
 return clearAuthCookies(NextResponse.json({ok:true}));
}
