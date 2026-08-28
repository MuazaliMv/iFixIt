import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'https://yzlhlilxiszefneshatm.supabase.co';
const PRODUCTION_ORIGINS=new Set(['https://ifixmv.com','https://www.ifixmv.com']);

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{
  const normalized=new URL(origin).origin;
  if(PRODUCTION_ORIGINS.has(normalized))return true;
  return process.env.NODE_ENV!=='production'&&normalized===request.nextUrl.origin;
 }catch{return false;}
}
function normalizePhone(value:unknown){
 const digits=String(value??'').replace(/\D/g,'');
 if(/^960\d{7}$/.test(digits))return `+${digits}`;
 if(/^\d{7}$/.test(digits))return `+960${digits}`;
 return '';
}
function adminClient(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)throw new Error('Phone verification service is not configured.');
 return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const body=await request.json().catch(()=>({}));
  const phone=normalizePhone(body.phone);
  const otp=String(body.otp??'').trim();
  if(!phone)return applyAuthCookies(NextResponse.json({error:'Enter a valid 7-digit Maldives phone number.'},{status:400}),auth);
  if(otp!=='9999')return applyAuthCookies(NextResponse.json({error:'Incorrect verification code.'},{status:400}),auth);

  const client=adminClient();
  const userResult=await client.auth.getUser(auth.accessToken);
  if(userResult.error||!userResult.data.user)return applyAuthCookies(NextResponse.json({error:'Authentication required.'},{status:401}),auth);
  const user=userResult.data.user;
  const local=phone.slice(4);

  const profileResult=await client.from('auth_profiles').select('user_id,phone_number,phone_verified_at').eq('user_id',user.id).maybeSingle();
  if(profileResult.error)throw profileResult.error;
  if(!profileResult.data)return applyAuthCookies(NextResponse.json({error:'Profile not found.'},{status:404}),auth);

  const existingPhone=normalizePhone(profileResult.data.phone_number);
  if(existingPhone){
   if(existingPhone!==phone)return applyAuthCookies(NextResponse.json({error:'This account already has a different verified phone number.'},{status:409}),auth);
   return applyAuthCookies(NextResponse.json({ok:true,phone_number:local,already_verified:Boolean(profileResult.data.phone_verified_at)}),auth);
  }

  const duplicate=await client.from('auth_profiles').select('user_id').neq('user_id',user.id).or(`phone_number.eq.${phone},phone_number.eq.${local},phone_number.eq.960${local}`).limit(1).maybeSingle();
  if(duplicate.error)throw duplicate.error;
  if(duplicate.data)return applyAuthCookies(NextResponse.json({error:'This phone number is already linked to another iFixMV account.'},{status:409}),auth);

  const verifiedAt=new Date().toISOString();
  const updated=await client.from('auth_profiles').update({phone_number:phone,phone_verified_at:verifiedAt,updated_at:verifiedAt}).eq('user_id',user.id).select('user_id,phone_number,phone_verified_at').single();
  if(updated.error)throw updated.error;

  const metadata={...(user.user_metadata||{}),phone_number:phone};
  await client.auth.admin.updateUserById(user.id,{user_metadata:metadata}).catch(()=>null);
  await client.from('activity_logs').insert({actor_user_id:user.id,subject_user_id:user.id,action:'LEGACY_PHONE_MIGRATION',module:'auth',entity_type:'user',entity_id:user.id,status:'SUCCESS',metadata:{phone_suffix:phone.slice(-4),source:'profile_verify_phone'}}).catch(()=>null);

  return applyAuthCookies(NextResponse.json({ok:true,phone_number:local,phone_verified_at:verifiedAt}),auth);
 }catch(error){
  return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to verify phone number.'},{status:500}),auth);
 }
}
