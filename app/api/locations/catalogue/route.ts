import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const FALLBACK_SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';

function adminClient(){
  const url=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||FALLBACK_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if(!key)throw new Error('Location catalogue server configuration is incomplete.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function GET(request:NextRequest){
  const auth=await resolveServerAuth(request);
  if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});

  try{
    const client=adminClient();
    const [atollResult,islandResult]=await Promise.all([
      client
        .from('atolls')
        .select('id,code,display_name,sort_order')
        .eq('is_active',true)
        .eq('is_serviceable',true)
        .order('sort_order',{ascending:true})
        .order('display_name',{ascending:true}),
      client
        .from('islands')
        .select('id,atoll_id,display_name,sort_order')
        .eq('is_active',true)
        .eq('is_serviceable',true)
        .order('sort_order',{ascending:true})
        .order('display_name',{ascending:true}),
    ]);

    if(atollResult.error)throw atollResult.error;
    if(islandResult.error)throw islandResult.error;

    const atolls=atollResult.data||[];
    const islands=islandResult.data||[];

    if(!atolls.length)throw new Error('No active Atoll / Region records are available.');
    if(!islands.length)throw new Error('No active Island / City records are available.');

    const atollIds=new Set(atolls.map(row=>row.id));
    const validIslands=islands.filter(row=>row.atoll_id&&atollIds.has(row.atoll_id));
    if(!validIslands.length)throw new Error('Island / City records are not linked to an active Atoll / Region.');

    return applyAuthCookies(NextResponse.json({
      atolls,
      islands:validIslands,
      counts:{atolls:atolls.length,islands:validIslands.length},
    },{headers:{'Cache-Control':'private, no-store'}}),auth);
  }catch(error){
    return applyAuthCookies(NextResponse.json({
      error:error instanceof Error?error.message:'Unable to load locations.',
    },{status:503}),auth);
  }
}
