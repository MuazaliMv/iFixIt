import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'https://yzlhlilxiszefneshatm.supabase.co';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;
const FIXED_COUNTRY='Maldives';
const PRODUCTION_ORIGINS=new Set(['https://ifixmv.com','https://www.ifixmv.com']);
const PROFILE_SELECT='user_id,email,full_name,role,provider_approved,profile_photo_url,phone_number,phone_verified_at,address_line1,address_line2,city,ward,state_region,postal_code,country,provider_address_line1,provider_address_line2,provider_city,provider_ward,provider_state_region,provider_postal_code,provider_country,default_service_address_id,created_at,updated_at';

type PrimaryAddress={line1?:string|null;line2?:string|null;city?:string|null;ward?:string|null;stateRegion?:string|null;postalCode?:string|null;country?:string|null};
type ResolvedLocation={atollId:string;islandId:string;locationUnitId:string|null};

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{
  const normalizedOrigin=new URL(origin).origin;
  if(PRODUCTION_ORIGINS.has(normalizedOrigin))return true;
  if(process.env.NODE_ENV!=='production'&&normalizedOrigin===request.nextUrl.origin)return true;
  return false;
 }catch{return false;}
}
function adminClient(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)throw new Error('Profile server configuration is incomplete.');
 return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function localProfilePhone(value:unknown){const raw=String(value??'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;}
function parseAddress(value:unknown):PrimaryAddress|null{
 if(!value)return null;
 try{const parsed=typeof value==='string'?JSON.parse(value):value;return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as PrimaryAddress:null;}catch{return null;}
}
function hasLocationSelection(address:PrimaryAddress|null){return Boolean(String(address?.stateRegion||'').trim()&&String(address?.city||'').trim());}
function forceMaldivesAddress(value:unknown){const parsed=parseAddress(value);return parsed?{...parsed,country:FIXED_COUNTRY}:value;}
function forceMaldivesServiceAddresses(value:unknown){if(!value)return value;try{const parsed=typeof value==='string'?JSON.parse(value):value;if(!Array.isArray(parsed))return value;return parsed.map(address=>address&&typeof address==='object'?{...address,country:FIXED_COUNTRY}:address);}catch{return value;}}
function normalizeProfileResponse(payload:any){
 const p=payload?.profile;
 if(!p||typeof p!=='object')return payload;
 const signedPhoto=typeof p.photoUrl==='string'&&p.photoUrl?p.photoUrl:null;
 const primaryAddress=p.primaryAddress&&typeof p.primaryAddress==='object'?{...p.primaryAddress,country:FIXED_COUNTRY}:p.primaryAddress;
 const providerAddress=p.providerAddress&&typeof p.providerAddress==='object'?{...p.providerAddress,country:FIXED_COUNTRY}:p.providerAddress;
 const serviceAddresses=Array.isArray(p.serviceAddresses)?p.serviceAddresses.map((address:any)=>address&&typeof address==='object'?{...address,country:FIXED_COUNTRY}:address):[];
 return {...payload,profile:{...p,phone_number:localProfilePhone(p.phone_number),is_phone_verified:Boolean(p.phone_verified_at),profile_photo_url:signedPhoto,photoUrl:signedPhoto,primaryAddress,providerAddress,serviceAddresses}};
}
async function resolvePrimaryLocation(client:ReturnType<typeof adminClient>,address:PrimaryAddress):Promise<ResolvedLocation>{
 const atollName=String(address.stateRegion||'').trim();const islandName=String(address.city||'').trim();const wardName=String(address.ward||'').trim();
 if(!atollName||!islandName)throw new Error('Both Atoll / Region and Island / City are required only when saving a location.');
 const atoll=await client.from('atolls').select('id,display_name,official_name').eq('is_active',true).or(`display_name.eq.${JSON.stringify(atollName)},official_name.eq.${JSON.stringify(atollName)}`).limit(1).maybeSingle();
 if(atoll.error)throw atoll.error;if(!atoll.data)throw new Error('The selected Atoll / Region is not in the location catalogue.');
 const island=await client.from('islands').select('id,display_name,canonical_name,atoll_id').eq('is_active',true).eq('atoll_id',atoll.data.id).or(`display_name.eq.${JSON.stringify(islandName)},canonical_name.eq.${JSON.stringify(islandName)}`).limit(1).maybeSingle();
 if(island.error)throw island.error;if(!island.data)throw new Error('The selected Island / City does not belong to the selected Atoll / Region.');
 let locationUnitId:string|null=null;
 if(wardName){
  const unit=await client.from('location_units').select('id,island_id,display_name,canonical_name').eq('is_active',true).eq('unit_type','WARD').eq('island_id',island.data.id).or(`display_name.eq.${JSON.stringify(wardName)},canonical_name.eq.${JSON.stringify(wardName)}`).limit(1).maybeSingle();
  if(unit.error)throw unit.error;if(!unit.data)throw new Error('The selected Ward does not belong to the selected Island / City.');locationUnitId=unit.data.id;
 }
 return {atollId:atoll.data.id,islandId:island.data.id,locationUnitId};
}
async function savePrimaryLocationIds(client:ReturnType<typeof adminClient>,accessToken:string,location:ResolvedLocation){
 const userResult=await client.auth.getUser(accessToken);if(userResult.error||!userResult.data.user)throw new Error('Authentication required.');
 const result=await client.from('auth_profiles').update({primary_atoll_id:location.atollId,primary_island_id:location.islandId,primary_location_unit_id:location.locationUnitId}).eq('user_id',userResult.data.user.id);
 if(result.error)throw result.error;
}
async function ensureProfile(client:ReturnType<typeof adminClient>,user:any){
 const existing=await client.from('auth_profiles').select(PROFILE_SELECT).eq('user_id',user.id).maybeSingle();
 if(existing.error)throw existing.error;
 if(existing.data)return existing.data;
 const phone=String(user.phone||'').trim()||null;
 const phoneVerifiedAt=phone?(user.phone_confirmed_at||user.confirmed_at||null):null;
 const created=await client.from('auth_profiles').insert({user_id:user.id,email:user.email||null,phone_number:phone,phone_verified_at:phoneVerifiedAt,role:'CUSTOMER',provider_approved:false,account_status:'ACTIVE',country:FIXED_COUNTRY}).select(PROFILE_SELECT).single();
 if(created.error)throw created.error;
 return created.data;
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const client=adminClient();
  const userResult=await client.auth.getUser(auth.accessToken);
  if(userResult.error||!userResult.data.user)return applyAuthCookies(NextResponse.json({error:'Authentication required.'},{status:401}),auth);
  const user=userResult.data.user;
  const userId=user.id;
  const p=await ensureProfile(client,user);

  let photoUrl:string|null=null;
  if(p.profile_photo_url){
   try{
    if(/^https?:\/\//i.test(p.profile_photo_url))photoUrl=p.profile_photo_url;
    else{const {data:signed,error:photoError}=await client.storage.from('profile-photos').createSignedUrl(p.profile_photo_url,3600);if(!photoError)photoUrl=signed?.signedUrl||null;}
   }catch{photoUrl=null;}
  }

  let addresses:any[]=[];
  let relatedDataWarning:string|null=null;
  try{
   const addressResult=await client.from('user_service_addresses').select('id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,created_at,updated_at').eq('user_id',userId).eq('is_active',true).order('is_default',{ascending:false}).order('updated_at',{ascending:false});
   if(addressResult.error)throw addressResult.error;
   addresses=addressResult.data??[];
  }catch(error){
   relatedDataWarning=error instanceof Error?error.message:'Service addresses could not be loaded.';
  }

  const payload={ok:true,warning:relatedDataWarning,profile:{...p,photoUrl,primaryAddress:{line1:p.address_line1,line2:p.address_line2,city:p.city,ward:p.ward,stateRegion:p.state_region,postalCode:p.postal_code,country:p.country},providerAddress:{line1:p.provider_address_line1,line2:p.provider_address_line2,city:p.provider_city,ward:p.provider_ward,stateRegion:p.provider_state_region,postalCode:p.provider_postal_code,country:p.provider_country},serviceAddresses:addresses,defaultServiceAddress:addresses.find((a:any)=>a.is_default)||null}};
  return applyAuthCookies(NextResponse.json(normalizeProfileResponse(payload),{status:200,headers:{'Cache-Control':'no-store'}}),auth);
 }catch(error){const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');return applyAuthCookies(NextResponse.json({error:timedOut?'Profile service timed out. Please refresh and try again.':error instanceof Error?error.message:'Unable to load your profile.'},{status:503,headers:{'Cache-Control':'no-store'}}),auth);}
}

export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 const contentType=request.headers.get('content-type')||'';
 try{
  let response:Response;let primaryAddress:PrimaryAddress|null=null;let resolvedLocation:ResolvedLocation|null=null;let client:ReturnType<typeof adminClient>|null=null;
  if(contentType.includes('multipart/form-data')){
   const form=await request.formData();form.set('action','profile_update');form.delete('phoneNumber');
   const rawPrimary=form.get('primaryAddress');primaryAddress=parseAddress(rawPrimary);
   if(primaryAddress){
    if(hasLocationSelection(primaryAddress)){client=adminClient();resolvedLocation=await resolvePrimaryLocation(client,primaryAddress);}
    form.set('primaryAddress',JSON.stringify({...primaryAddress,country:FIXED_COUNTRY}));
   }
   const providerAddress=form.get('providerAddress');if(providerAddress!==null)form.set('providerAddress',JSON.stringify(forceMaldivesAddress(providerAddress)));
   const serviceAddresses=form.get('serviceAddresses');if(serviceAddresses!==null)form.set('serviceAddresses',JSON.stringify(forceMaldivesServiceAddresses(serviceAddresses)));
   response=await fetch(AUTH_API,{method:'POST',headers:{Authorization:auth.authorization},body:form,signal:AbortSignal.timeout(15000)});
  }else{
   const body=await request.json().catch(()=>({}));delete body.phoneNumber;
   if('primaryAddress' in body){
    primaryAddress=parseAddress(body.primaryAddress);
    if(primaryAddress){if(hasLocationSelection(primaryAddress)){client=adminClient();resolvedLocation=await resolvePrimaryLocation(client,primaryAddress);}body.primaryAddress={...primaryAddress,country:FIXED_COUNTRY};}
   }
   if('providerAddress' in body)body.providerAddress=forceMaldivesAddress(body.providerAddress);if('serviceAddresses' in body)body.serviceAddresses=forceMaldivesServiceAddresses(body.serviceAddresses);
   response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth.authorization},body:JSON.stringify({action:'profile_update',...body}),signal:AbortSignal.timeout(15000)});
  }
  const payload=await response.json().catch(()=>({error:'Unable to update profile.'}));
  if(response.ok&&resolvedLocation&&client)await savePrimaryLocationIds(client,auth.accessToken,resolvedLocation);
  return applyAuthCookies(NextResponse.json(payload,{status:response.status}),auth);
 }catch(error){return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to update profile.'},{status:503}),auth);}
}
