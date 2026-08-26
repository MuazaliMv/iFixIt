import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const CATALOG_API=`${SUPABASE_URL}/functions/v1/location-catalog`;

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'OTP-verified authentication required.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const response=await fetch(CATALOG_API,{
   method:'GET',
   headers:{Authorization:auth.authorization},
   cache:'no-store',
   signal:AbortSignal.timeout(12000),
  });
  const payload=await response.json().catch(()=>({error:'Unable to load location catalogue.'}));
  if(!response.ok)return applyAuthCookies(NextResponse.json(payload,{status:response.status,headers:{'Cache-Control':'no-store'}}),auth);
  if(!Array.isArray(payload?.atolls)||payload.atolls.length===0){
   return applyAuthCookies(NextResponse.json({error:'Location catalogue returned no atolls.'},{status:503,headers:{'Cache-Control':'no-store'}}),auth);
  }
  return applyAuthCookies(NextResponse.json(payload,{headers:{'Cache-Control':'no-store'}}),auth);
 }catch(error){
  const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
  return applyAuthCookies(NextResponse.json({error:timedOut?'Location catalogue timed out. Please retry.':error instanceof Error?error.message:'Unable to load location catalogue.'},{status:503,headers:{'Cache-Control':'no-store'}}),auth);
 }
}
