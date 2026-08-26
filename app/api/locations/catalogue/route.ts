import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

type LocationRow=Record<string,unknown>;

async function readTable(path:string,authorization?:string){
  const headers:Record<string,string>={apikey:PUBLISHABLE_KEY,Accept:'application/json'};
  if(authorization)headers.Authorization=authorization;
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    headers,
    cache:'no-store',
    signal:AbortSignal.timeout(10000),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.message||payload?.error||`Location database returned ${response.status}.`);
  return Array.isArray(payload)?payload as LocationRow[]:[];
}

async function readCatalogue(authorization:string){
  const atollPath='atolls?select=id,code,display_name,sort_order&is_active=eq.true&is_serviceable=eq.true&order=sort_order.asc,display_name.asc';
  const islandPath='islands?select=id,atoll_id,display_name,sort_order&is_active=eq.true&is_serviceable=eq.true&order=sort_order.asc,display_name.asc';

  // First use the OTP-backed user's JWT. If an older/misaligned RLS policy returns
  // an empty catalogue, retry through the anonymous read policy while keeping this
  // route itself protected by the application session.
  let [atolls,islands]=await Promise.all([
    readTable(atollPath,authorization),
    readTable(islandPath,authorization),
  ]);

  if(!atolls.length||!islands.length){
    [atolls,islands]=await Promise.all([
      readTable(atollPath),
      readTable(islandPath),
    ]);
  }

  return {atolls,islands};
}

export async function GET(request:NextRequest){
  const auth=await resolveServerAuth(request);
  if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
  try{
    const {atolls,islands}=await readCatalogue(auth.authorization);
    if(!atolls.length)throw new Error('No active Atoll / Region records are available.');
    if(!islands.length)throw new Error('No active Island / City records are available.');

    const atollIds=new Set(atolls.map(row=>String(row.id||'')));
    const validIslands=islands.filter(row=>atollIds.has(String(row.atoll_id||'')));
    if(!validIslands.length)throw new Error('Island / City records are not linked to an active Atoll / Region.');

    return applyAuthCookies(NextResponse.json({
      atolls,
      islands:validIslands,
      counts:{atolls:atolls.length,islands:validIslands.length},
    },{headers:{'Cache-Control':'private, no-store'}}),auth);
  }catch(error){
    const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
    return applyAuthCookies(NextResponse.json({error:timedOut?'Location database timed out. Please try again.':error instanceof Error?error.message:'Unable to load locations.'},{status:503}),auth);
  }
}
