import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const CATALOG_API=`${SUPABASE_URL}/functions/v1/location-catalog`;
const FALLBACK_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

function projectApiKey(){
 return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  ||process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  ||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  ||process.env.SUPABASE_ANON_KEY?.trim()
  ||FALLBACK_PUBLISHABLE_KEY;
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'OTP-verified authentication required.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const response=await fetch(CATALOG_API,{
   method:'GET',
   headers:{
    Authorization:auth.authorization,
    apikey:projectApiKey(),
    Accept:'application/json',
   },
   cache:'no-store',
   signal:AbortSignal.timeout(12000),
  });
  const payload=await response.json().catch(()=>({error:'Unable to load location catalogue.'}));
  if(!response.ok){
   const message=payload?.error||payload?.message||`Location catalogue request failed (${response.status}).`;
   return applyAuthCookies(NextResponse.json({error:message,upstreamStatus:response.status},{status:response.status,headers:{'Cache-Control':'no-store'}}),auth);
  }
  if(!Array.isArray(payload?.atolls)||payload.atolls.length===0){
   return applyAuthCookies(NextResponse.json({error:'Location catalogue returned no atolls.'},{status:503,headers:{'Cache-Control':'no-store'}}),auth);
  }
  return applyAuthCookies(NextResponse.json(payload,{headers:{'Cache-Control':'no-store'}}),auth);
 }catch(error){
  const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
  return applyAuthCookies(NextResponse.json({error:timedOut?'Location catalogue timed out. Please retry.':error instanceof Error?error.message:'Unable to load location catalogue.'},{status:503,headers:{'Cache-Control':'no-store'}}),auth);
 }
}
