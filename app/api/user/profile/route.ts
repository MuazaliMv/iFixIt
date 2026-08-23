import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;
const FIXED_COUNTRY='Maldives';

function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');return !origin||origin===request.nextUrl.origin;}
function normalizeProfilePhone(value:unknown){
 const raw=String(value??'').trim().replace(/[\s()-]/g,'');
 if(!raw)return '';
 if(/^\d{7}$/.test(raw))return `+960${raw}`;
 if(/^960\d{7}$/.test(raw))return `+${raw}`;
 return raw;
}
function localProfilePhone(value:unknown){const raw=String(value??'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;}
function forceMaldivesAddress(value:unknown){if(!value)return value;try{const parsed=typeof value==='string'?JSON.parse(value):value;if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return value;return {...parsed,country:FIXED_COUNTRY};}catch{return value;}}
function forceMaldivesServiceAddresses(value:unknown){if(!value)return value;try{const parsed=typeof value==='string'?JSON.parse(value):value;if(!Array.isArray(parsed))return value;return parsed.map(address=>address&&typeof address==='object'?{...address,country:FIXED_COUNTRY}:address);}catch{return value;}}
async function rest(path:string,authorization:string,timeoutMs=5000){return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:authorization},cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});}
async function currentAuthUser(authorization:string){
 const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:authorization},cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)return null;
 const user=await response.json().catch(()=>null);
 return user?.id?user:null;
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const authUser=await currentAuthUser(auth.authorization);
  if(!authUser?.id)return applyAuthCookies(NextResponse.json({error:'Unable to identify the signed-in user.'},{status:401}),auth);
  const profileUrl=`auth_profiles?select=user_id,email,full_name,role,provider_approved,phone_number,is_phone_verified,profile_photo_url,address_line1,address_line2,city,state_region,postal_code,country,provider_address_line1,provider_address_line2,provider_city,provider_state_region,provider_postal_code,provider_country,account_status,created_at,updated_at&user_id=eq.${encodeURIComponent(authUser.id)}&limit=1`;
  const profileResponse=await rest(profileUrl,auth.authorization,5000);
  if(!profileResponse.ok){const detail=await profileResponse.text().catch(()=> '');return applyAuthCookies(NextResponse.json({error:'Unable to load your profile.',detail},{status:profileResponse.status}),auth);}
  const rows=await profileResponse.json().catch(()=>[]);const row=Array.isArray(rows)?rows[0]:null;
  if(!row)return applyAuthCookies(NextResponse.json({error:'Profile record not found.'},{status:404}),auth);
  let serviceAddresses:any[]=[];
  try{const addressResponse=await rest(`user_service_addresses?select=id,label,address_line1,address_line2,city,state_region,postal_code,country,access_instructions,service_atoll_id,service_island_id,service_location_unit_id,is_default&user_id=eq.${encodeURIComponent(authUser.id)}&is_active=eq.true&order=updated_at.desc`,auth.authorization,3000);if(addressResponse.ok)serviceAddresses=await addressResponse.json().catch(()=>[]);}catch{}
  const profile={user_id:row.user_id,email:row.email||authUser.email||null,full_name:row.full_name,role:row.role,provider_approved:Boolean(row.provider_approved),phone_number:localProfilePhone(row.phone_number),is_phone_verified:Boolean(row.is_phone_verified),profile_photo_url:row.profile_photo_url,photoUrl:row.profile_photo_url,account_status:row.account_status||'ACTIVE',primaryAddress:{line1:row.address_line1||'',line2:row.address_line2||'',city:row.city||'',stateRegion:row.state_region||'',postalCode:row.postal_code||'',country:FIXED_COUNTRY},providerAddress:{line1:row.provider_address_line1||'',line2:row.provider_address_line2||'',city:row.provider_city||'',stateRegion:row.provider_state_region||'',postalCode:row.provider_postal_code||'',country:FIXED_COUNTRY},serviceAddresses:Array.isArray(serviceAddresses)?serviceAddresses:[],created_at:row.created_at,updated_at:row.updated_at,last_active_at:authUser.last_sign_in_at||authUser.updated_at||null};
  return applyAuthCookies(NextResponse.json({profile},{status:200}),auth);
 }catch(error){const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');return applyAuthCookies(NextResponse.json({error:timedOut?'Profile service timed out. Please refresh and try again.':error instanceof Error?error.message:'Unable to load your profile.'},{status:503}),auth);}
}

export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 const contentType=request.headers.get('content-type')||'';
 try{
  let response:Response;
  if(contentType.includes('multipart/form-data')){
   const form=await request.formData();form.set('action','profile_update');const phone=form.get('phoneNumber');if(phone!==null)form.set('phoneNumber',normalizeProfilePhone(phone));const primaryAddress=form.get('primaryAddress');if(primaryAddress!==null)form.set('primaryAddress',JSON.stringify(forceMaldivesAddress(primaryAddress)));const providerAddress=form.get('providerAddress');if(providerAddress!==null)form.set('providerAddress',JSON.stringify(forceMaldivesAddress(providerAddress)));const serviceAddresses=form.get('serviceAddresses');if(serviceAddresses!==null)form.set('serviceAddresses',JSON.stringify(forceMaldivesServiceAddresses(serviceAddresses)));response=await fetch(AUTH_API,{method:'POST',headers:{Authorization:auth.authorization},body:form,signal:AbortSignal.timeout(15000)});
  }else{
   const body=await request.json().catch(()=>({}));if('phoneNumber' in body)body.phoneNumber=normalizeProfilePhone(body.phoneNumber);if('primaryAddress' in body)body.primaryAddress=forceMaldivesAddress(body.primaryAddress);if('providerAddress' in body)body.providerAddress=forceMaldivesAddress(body.providerAddress);if('serviceAddresses' in body)body.serviceAddresses=forceMaldivesServiceAddresses(body.serviceAddresses);response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth.authorization},body:JSON.stringify({action:'profile_update',...body}),signal:AbortSignal.timeout(15000)});
  }
  const payload=await response.json().catch(()=>({error:'Unable to update profile.'}));return applyAuthCookies(NextResponse.json(payload,{status:response.status}),auth);
 }catch(error){return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to update profile.'},{status:503}),auth);}
}
