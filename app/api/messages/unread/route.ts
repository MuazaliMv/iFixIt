import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const userResponse=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth.authorization},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!userResponse.ok)return applyAuthCookies(NextResponse.json({count:0},{status:userResponse.status===401?401:200,headers:{'Cache-Control':'no-store'}}),auth);
  const user=await userResponse.json().catch(()=>({}));
  const userId=String(user?.id||'');
  if(!userId)return applyAuthCookies(NextResponse.json({count:0},{headers:{'Cache-Control':'no-store'}}),auth);
  const response=await fetch(`${SUPABASE_URL}/rest/v1/request_messages?select=id&recipient_auth_user_id=eq.${encodeURIComponent(userId)}&read_at=is.null`,{
   method:'HEAD',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth.authorization,Prefer:'count=exact'},cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  const range=response.headers.get('content-range')||'';
  const count=Number(range.split('/')[1]||0)||0;
  return applyAuthCookies(NextResponse.json({count},{headers:{'Cache-Control':'no-store'}}),auth);
 }catch{return applyAuthCookies(NextResponse.json({count:0},{headers:{'Cache-Control':'no-store'}}),auth);}
}
