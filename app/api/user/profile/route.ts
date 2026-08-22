import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-account';
const FIXED_COUNTRY='Maldives';

function normalizeProfilePhone(value:unknown){
 const raw=String(value??'').trim().replace(/[\s()-]/g,'');
 if(!raw)return '';
 if(/^\d{7}$/.test(raw))return `+960${raw}`;
 if(/^960\d{7}$/.test(raw))return `+${raw}`;
 return raw;
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

export async function GET(request:NextRequest){
 const authorization=request.headers.get('authorization')||'';
 const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'profile_get'})});
 const payload=await response.json().catch(()=>({error:'Unable to load profile.'}));
 return NextResponse.json(payload,{status:response.status});
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
  response=await fetch(AUTH_API,{method:'POST',headers:{Authorization:authorization},body:form});
 }else{
  const body=await request.json().catch(()=>({}));
  if('phoneNumber' in body)body.phoneNumber=normalizeProfilePhone(body.phoneNumber);
  if('primaryAddress' in body)body.primaryAddress=forceMaldivesAddress(body.primaryAddress);
  if('providerAddress' in body)body.providerAddress=forceMaldivesAddress(body.providerAddress);
  if('serviceAddresses' in body)body.serviceAddresses=forceMaldivesServiceAddresses(body.serviceAddresses);
  response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'profile_update',...body})});
 }
 const payload=await response.json().catch(()=>({error:'Unable to update profile.'}));
 return NextResponse.json(payload,{status:response.status});
}
