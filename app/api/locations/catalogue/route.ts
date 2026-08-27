import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'https://yzlhlilxiszefneshatm.supabase.co';

function adminClient(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)throw new Error('Location catalogue server configuration is incomplete.');
 return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'OTP-verified authentication required.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const client=adminClient();
  const[atollResult,islandResult]=await Promise.all([
   client.from('atolls').select('id,code,official_name,display_name,sort_order').eq('is_active',true).eq('is_serviceable',true).order('sort_order').order('display_name'),
   client.from('islands').select('id,atoll_id,canonical_name,display_name,location_kind,sort_order').eq('is_active',true).eq('is_serviceable',true).order('sort_order').order('display_name'),
  ]);
  if(atollResult.error)throw atollResult.error;if(islandResult.error)throw islandResult.error;
  const atolls=atollResult.data||[];const atollIds=new Set(atolls.map(row=>row.id));
  const islands=(islandResult.data||[]).filter(row=>row.atoll_id&&atollIds.has(row.atoll_id));
  if(!atolls.length)throw new Error('No active Atoll / Region records are available.');
  if(!islands.length)throw new Error('No linked Island / City records are available.');
  return applyAuthCookies(NextResponse.json({atolls,islands,counts:{atolls:atolls.length,islands:islands.length}},{headers:{'Cache-Control':'private, no-store'}}),auth);
 }catch(error){
  return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Unable to load location catalogue.'},{status:503,headers:{'Cache-Control':'no-store'}}),auth);
 }
}
