import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const FALLBACK_SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const ADDRESS_COLUMNS='id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at';
const PRODUCTION_ORIGINS=new Set(['https://ifixmv.com','https://www.ifixmv.com']);

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{const normalized=new URL(origin).origin;return PRODUCTION_ORIGINS.has(normalized)||(process.env.NODE_ENV!=='production'&&normalized===request.nextUrl.origin);}catch{return false;}
}
function userClient(token:string){
 const url=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||FALLBACK_SUPABASE_URL;
 const key=process.env.SUPABASE_ANON_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
 if(!key)throw new Error('Supabase public client configuration is incomplete.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
}
function clean(value:unknown){return String(value??'').trim();}
function payloadFrom(body:Record<string,unknown>){
 return {
  label:clean(body.label),address_line1:clean(body.address_line1),address_line2:clean(body.address_line2),
  city:clean(body.city),state_region:clean(body.state_region),postal_code:clean(body.postal_code)||null,country:'Maldives',
  service_atoll_id:clean(body.service_atoll_id)||null,service_island_id:clean(body.service_island_id)||null,
  service_location_unit_id:clean(body.service_location_unit_id)||null,access_instructions:clean(body.access_instructions)||null,is_active:true,
 };
}
function validateAddress(input:ReturnType<typeof payloadFrom>){
 const missing:string[]=[];
 if(!input.label)missing.push('Name');if(!input.address_line1)missing.push('House / Apartment');if(!input.address_line2)missing.push('Road');
 if(!input.service_atoll_id)missing.push('Atoll / Region');if(!input.service_island_id)missing.push('Island / City');
 return missing;
}
async function currentUser(client:ReturnType<typeof userClient>,token:string){
 const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new Error('Authentication required.');return data.user;
}
async function syncDefault(client:ReturnType<typeof userClient>,userId:string,address:any|null){
 const profileValues=address?{default_service_address_id:address.id,address_line1:address.address_line1,address_line2:address.address_line2||null,city:address.city||null,state_region:address.state_region||null,postal_code:address.postal_code||null,country:'Maldives',primary_atoll_id:address.service_atoll_id||null,primary_island_id:address.service_island_id||null,primary_location_unit_id:address.service_location_unit_id||null}:{default_service_address_id:null,address_line1:null,address_line2:null,city:null,state_region:null,postal_code:null,primary_atoll_id:null,primary_island_id:null,primary_location_unit_id:null};
 const profile=await client.from('auth_profiles').update(profileValues).eq('user_id',userId);
 if(profile.error)throw profile.error;
}
async function setDefault(client:ReturnType<typeof userClient>,userId:string,addressId:string){
 const selected=await client.from('user_service_addresses').select(ADDRESS_COLUMNS).eq('id',addressId).eq('user_id',userId).eq('is_active',true).single();
 if(selected.error||!selected.data)throw new Error('Service Address not found.');
 const missing=validateAddress(payloadFrom(selected.data as Record<string,unknown>));if(missing.length)throw new Error(`Enter the missing Service Address records: ${missing.join(', ')}.`);
 const clear=await client.from('user_service_addresses').update({is_default:false}).eq('user_id',userId).eq('is_default',true);if(clear.error)throw clear.error;
 const chosen=await client.from('user_service_addresses').update({is_default:true}).eq('id',addressId).eq('user_id',userId).select(ADDRESS_COLUMNS).single();if(chosen.error)throw chosen.error;
 try{await syncDefault(client,userId,chosen.data);}catch(error){await client.from('user_service_addresses').update({is_default:false}).eq('id',addressId).eq('user_id',userId);throw error;}
 return chosen.data;
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{const client=userClient(auth.accessToken);const user=await currentUser(client,auth.accessToken);const result=await client.from('user_service_addresses').select(ADDRESS_COLUMNS).eq('user_id',user.id).eq('is_active',true).order('is_default',{ascending:false}).order('updated_at',{ascending:false});if(result.error)throw result.error;return applyAuthCookies(NextResponse.json({addresses:result.data||[]}),auth);}catch(error){return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to load Service Addresses.'},{status:500}),auth);}
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});const auth=await resolveServerAuth(request);if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{const client=userClient(auth.accessToken);const user=await currentUser(client,auth.accessToken);const body=await request.json().catch(()=>({})) as Record<string,unknown>;const input=payloadFrom(body);const missing=validateAddress(input);if(missing.length)return applyAuthCookies(NextResponse.json({error:`Enter the missing Service Address records: ${missing.join(', ')}.`},{status:400}),auth);const count=await client.from('user_service_addresses').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_active',true);if(count.error)throw count.error;const result=await client.from('user_service_addresses').insert({...input,user_id:user.id,is_default:false}).select(ADDRESS_COLUMNS).single();if(result.error)throw result.error;let address=result.data;if((count.count||0)===0)address=await setDefault(client,user.id,address.id);return applyAuthCookies(NextResponse.json({address},{status:201}),auth);}catch(error){return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to save Service Address.'},{status:500}),auth);}
}

export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});const auth=await resolveServerAuth(request);if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{const client=userClient(auth.accessToken);const user=await currentUser(client,auth.accessToken);const body=await request.json().catch(()=>({})) as Record<string,unknown>;const id=clean(body.id);if(!id)return applyAuthCookies(NextResponse.json({error:'Service Address is required.'},{status:400}),auth);if(body.action==='set_default'){const address=await setDefault(client,user.id,id);return applyAuthCookies(NextResponse.json({address}),auth);}const input=payloadFrom(body);const missing=validateAddress(input);if(missing.length)return applyAuthCookies(NextResponse.json({error:`Enter the missing Service Address records: ${missing.join(', ')}.`},{status:400}),auth);const existing=await client.from('user_service_addresses').select('is_default').eq('id',id).eq('user_id',user.id).eq('is_active',true).single();if(existing.error)throw new Error('Service Address not found.');const updated=await client.from('user_service_addresses').update(input).eq('id',id).eq('user_id',user.id).select(ADDRESS_COLUMNS).single();if(updated.error)throw updated.error;let address=updated.data;if(existing.data.is_default)address=await setDefault(client,user.id,id);return applyAuthCookies(NextResponse.json({address}),auth);}catch(error){return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to update Service Address.'},{status:500}),auth);}
}

export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});const auth=await resolveServerAuth(request);if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{const client=userClient(auth.accessToken);const user=await currentUser(client,auth.accessToken);const body=await request.json().catch(()=>({})) as Record<string,unknown>;const id=clean(body.id);if(!id)return applyAuthCookies(NextResponse.json({error:'Service Address is required.'},{status:400}),auth);const existing=await client.from('user_service_addresses').select('id,is_default').eq('id',id).eq('user_id',user.id).eq('is_active',true).single();if(existing.error)throw new Error('Service Address not found.');const removed=await client.from('user_service_addresses').update({is_active:false,is_default:false}).eq('id',id).eq('user_id',user.id);if(removed.error)throw removed.error;if(existing.data.is_default){const next=await client.from('user_service_addresses').select(ADDRESS_COLUMNS).eq('user_id',user.id).eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(next.error)throw next.error;if(next.data)await setDefault(client,user.id,next.data.id);else await syncDefault(client,user.id,null);}return applyAuthCookies(NextResponse.json({removed:true}),auth);}catch(error){return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to remove Service Address.'},{status:500}),auth);}
}
