import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

type ProviderPermissionState={suspended:boolean;verified:boolean};

async function resolveProviderPermission(userId:string,providerApproved:boolean):Promise<ProviderPermissionState>{
 if(!providerApproved)return{suspended:false,verified:true};
 const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!serviceRole)return{suspended:true,verified:false};
 try{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/provider_onboarding_profiles?select=onboarding_status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,{
   headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`},
   cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  if(!response.ok)return{suspended:true,verified:false};
  const rows=await response.json().catch(()=>[]);
  const status=Array.isArray(rows)?String(rows[0]?.onboarding_status||'').toUpperCase():'';
  return{suspended:status==='SUSPENDED',verified:true};
 }catch{
  return{suspended:true,verified:false};
 }
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({authenticated:false},{status:401});
 try{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/auth_profiles?select=user_id,email,full_name,role,provider_approved&limit=1`,{
   headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth.authorization},
   cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  if(response.status===401||response.status===403)return applyAuthCookies(NextResponse.json({authenticated:false},{status:401}),auth);
  if(!response.ok)return applyAuthCookies(NextResponse.json({authenticated:true,profile:{role:'CUSTOMER',provider_approved:false,provider_suspended:true},profile_degraded:true},{status:200,headers:{'Cache-Control':'no-store'}}),auth);
  const rows=await response.json().catch(()=>[]);const profile=Array.isArray(rows)?rows[0]:null;
  if(!profile)return applyAuthCookies(NextResponse.json({authenticated:true,profile:{role:'CUSTOMER',provider_approved:false,provider_suspended:true},profile_degraded:true},{status:200,headers:{'Cache-Control':'no-store'}}),auth);
  const providerApproved=Boolean(profile.provider_approved);
  const providerPermission=await resolveProviderPermission(String(profile.user_id||''),providerApproved);
  return applyAuthCookies(NextResponse.json({authenticated:true,profile:{...profile,provider_suspended:providerPermission.suspended,provider_permission_verified:providerPermission.verified}},{headers:{'Cache-Control':'no-store'}}),auth);
 }catch{
  // Authentication is already proven by resolveServerAuth(). Downstream profile or
  // permission outages must not transform a valid login into a logout loop. Fall
  // back to the least-privileged customer workspace until those services recover.
  return applyAuthCookies(NextResponse.json({authenticated:true,profile:{role:'CUSTOMER',provider_approved:false,provider_suspended:true},profile_degraded:true},{status:200,headers:{'Cache-Control':'no-store'}}),auth);
 }
}
