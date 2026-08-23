import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({authenticated:false},{status:401});
 try{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/auth_profiles?select=user_id,email,full_name,role,provider_approved&limit=1`,{
   headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth.authorization},
   cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  if(!response.ok)return applyAuthCookies(NextResponse.json({authenticated:false},{status:response.status}),auth);
  const rows=await response.json().catch(()=>[]);const profile=Array.isArray(rows)?rows[0]:null;
  if(!profile)return applyAuthCookies(NextResponse.json({authenticated:false},{status:404}),auth);
  return applyAuthCookies(NextResponse.json({authenticated:true,profile}),auth);
 }catch(error){
  return applyAuthCookies(NextResponse.json({authenticated:false,error:error instanceof Error?error.message:'Unable to check session.'},{status:503}),auth);
 }
}
