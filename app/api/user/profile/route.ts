import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;
const FIXED_COUNTRY='Maldives';

function normalizeProfilePhone(value:unknown){
 const raw=String(value??'').trim().replace(/[\s()-]/g,'');
 if(!raw)return '';
 if(/^\d{7}$/.test(raw))return `+960${raw}`;
 if(/^960\d{7}$/.test(raw))return `+${raw}`;
 return raw;
}

function localProfilePhone(value:unknown){
 const raw=String(value??'').trim();
 return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;
}

function forceMaldivesAddress(value:unknown){
 if(!value)return value;
 try{
  const parsed=typeof value==='string'?JSON.parse(value):value;
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return value;
  return {...parsed,country:FIXED_COUNTRY};
 }catch{return value;}
}

function forceMaldivesServiceAddresses(value:unknown){
 if(!value)return value;
 try{
  const parsed=typeof value==='string'?JSON.parse(value):value;
  if(!Array.isArray(parsed))return value;
  return parsed.map(address=>address&&typeof address==='object'?{...address,country:FIXED_COUNTRY}:address);
 }catch{return value;}
}

async function fallbackProfile(authorization:string){
 const url=new URL(`${SUPABASE_URL}/rest/v1/auth_profiles`);
 url.searchParams.set('select','user_id,email,full_name,role,provider_approved,phone_number,is_phone_verified,profile_photo_url,address_line1,address_line2,city,state_region,postal_code,country,provider_address_line1,provider_address_line2,provider_city,provider_state_region,provider_postal_code,provider_country,created_at');
 url.searchParams.set('limit','1');
 const response=await fetch(url,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:authorization},cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)return null;
 const rows=await response.json().catch(()=>[]);
 const row=Array.isArray(rows)?rows[0]:null;
 if(!row)return null;
 return {
  user_id:row.user_id,
  email:row.email,
  full_name:row.full_name,
  role:row.role,
  provider_approved:Boolean(row.provider_approved),
  phone_number:localProfilePhone(row.phone_number),
  is_phone_verified:Boolean(row.is_phone_verified),
  profile_photo_url:row.profile_photo_url,
  photoUrl:row.profile_photo_url,
  primaryAddress:{line1:row.address_line1||'',line2:row.address_line2||'',city:row.city||'',stateRegion:row.state_region||'',postalCode:row.postal_code||'',country:FIXED_COUNTRY},
  providerAddress:{line1:row.provider_address_line1||'',line2:row.provider_address_line2||'',city:row.provider_city||'',stateRegion:row.provider_state_region||'',postalCode:row.provider_postal_code||'',country:FIXED_COUNTRY},
  serviceAddresses:[],
  created_at:row.created_at,
 };
}

export async function GET(request:NextRequest){
 const authorization=request.headers.get('authorization')||'';
 if(!authorization.toLowerCase().startsWith('bearer '))return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'profile_get'}),cache:'no-store',signal:AbortSignal.timeout(7000)});
  const payload=await response.json().catch(()=>({error:'Unable to load profile.'}));
  if(response.ok&&payload?.profile){
   if(payload.profile.phone_number)payload.profile.phone_number=localProfilePhone(payload.profile.phone_number);
   return NextResponse.json(payload,{status:response.status});
  }
 }catch{}
 try{
  const profile=await fallbackProfile(authorization);
  if(profile)return NextResponse.json({profile,fallback:true},{status:200});
 }catch{}
 return NextResponse.json({error:'Unable to load your profile right now. Please refresh and try again.'},{status:503});
}

export async function PUT(request:NextRequest){
 const authorization=request.headers.get('authorization')||'';
 const contentType=request.headers.get('content-type')||'';
 let response:Response;
 if(contentType.includes('multipart/form-data')){
  const form=await request.formData();
  form.set('action','profile_update');
  const phone=form.get('phoneNumber');
  if(phone!==null)form.set('phoneNumber',normalizeProfilePhone(phone));
  const primaryAddress=form.get('primaryAddress');
  if(primaryAddress!==null)form.set('primaryAddress',JSON.stringify(forceMaldivesAddress(primaryAddress)));
  const providerAddress=form.get('providerAddress');
  if(providerAddress!==null)form.set('providerAddress',JSON.stringify(forceMaldivesAddress(providerAddress)));
  const serviceAddresses=form.get('serviceAddresses');
  if(serviceAddresses!==null)form.set('serviceAddresses',JSON.stringify(forceMaldivesServiceAddresses(serviceAddresses)));
  response=await fetch(AUTH_API,{method:'POST',headers:{Authorization:authorization},body:form,signal:AbortSignal.timeout(15000)});
 }else{
  const body=await request.json().catch(()=>({}));
  if('phoneNumber' in body)body.phoneNumber=normalizeProfilePhone(body.phoneNumber);
  if('primaryAddress' in body)body.primaryAddress=forceMaldivesAddress(body.primaryAddress);
  if('providerAddress' in body)body.providerAddress=forceMaldivesAddress(body.providerAddress);
  if('serviceAddresses' in body)body.serviceAddresses=forceMaldivesServiceAddresses(body.serviceAddresses);
  response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'profile_update',...body}),signal:AbortSignal.timeout(15000)});
 }
 const payload=await response.json().catch(()=>({error:'Unable to update profile.'}));
 return NextResponse.json(payload,{status:response.status});
}
