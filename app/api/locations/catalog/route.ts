import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';

function adminClient(){
 const url=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||FALLBACK_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)throw new Error('Location catalogue server configuration is incomplete.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function GET(){
 try{
  const client=adminClient();
  const [atollResult,islandResult,wardResult]=await Promise.all([
   client.from('atolls').select('id,official_name,display_name,sort_order').eq('is_active',true).order('sort_order').order('display_name'),
   client.from('islands').select('id,atoll_id,canonical_name,display_name,location_kind,sort_order').eq('is_active',true).order('sort_order').order('display_name'),
   client.from('location_units').select('id,island_id,display_name,canonical_name,sort_order').eq('is_active',true).eq('unit_type','WARD').order('sort_order').order('display_name'),
  ]);
  if(atollResult.error)throw atollResult.error;
  if(islandResult.error)throw islandResult.error;
  if(wardResult.error)throw wardResult.error;
  const atolls=atollResult.data||[];
  const islands=islandResult.data||[];
  const wards=wardResult.data||[];
  if(!atolls.length)throw new Error('No active atolls were returned from the location catalogue.');
  return NextResponse.json({atolls,islands,wards,counts:{atolls:atolls.length,islands:islands.length,wards:wards.length}},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to load location catalogue.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
