import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const AUTH_API=`${SUPABASE_URL}/functions/v1/auth-account`;
const FIXED_COUNTRY='Maldives';
const PRODUCTION_ORIGINS=new Set(['https://ifixmv.com','https://www.ifixmv.com']);

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
function normalizeProfileResponse(payload:any){
 const p=payload?.profile;
 if(!p||typeof p!=='object')return payload;
 const signedPhoto=typeof p.photoUrl==='string'&&p.photoUrl?p.photoUrl:null;
 const primaryAddress=p.primaryAddress&&typeof p.primaryAddress==='object'?{...p.primaryAddress,country:FIXED_COUNTRY}:p.primaryAddress;
 const providerAddress=p.providerAddress&&typeof p.providerAddress==='object'?{...p.providerAddress,country:FIXED_COUNTRY}:p.providerAddress;
 const serviceAddresses=Array.isArray(p.serviceAddresses)?p.serviceAddresses.map((address:any)=>address&&typeof address==='object'?{...address,country:FIXED_COUNTRY}:address):[];
 return {...payload,profile:{...p,phone_number:localProfilePhone(p.phone_number),profile_photo_url:signedPhoto,photoUrl:signedPhoto,primaryAddress,providerAddress,serviceAddresses}};
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth.authorization},body:JSON.stringify({action:'profile_get'}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const payload=await response.json().catch(()=>({error:'Unable to load your profile.'}));
  return applyAuthCookies(NextResponse.json(normalizeProfileResponse(payload),{status:response.status}),auth);
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
