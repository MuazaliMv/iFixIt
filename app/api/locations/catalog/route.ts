import { NextResponse } from 'next/server';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

async function readTable(path:string){
 const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
  headers:{apikey:SUPABASE_KEY},
  cache:'no-store',
  signal:AbortSignal.timeout(10000),
 });
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(payload?.message||payload?.error||'Unable to load location catalogue.');
 return payload;
}

export async function GET(){
 try{
  const[atolls,islands,wards]=await Promise.all([
   readTable('atolls?select=id,official_name,display_name,sort_order&is_active=eq.true&order=sort_order.asc,display_name.asc'),
   readTable('islands?select=id,atoll_id,canonical_name,display_name,location_kind,sort_order&is_active=eq.true&order=sort_order.asc,display_name.asc'),
   readTable('location_units?select=id,island_id,display_name,canonical_name,sort_order&is_active=eq.true&unit_type=eq.WARD&order=sort_order.asc,display_name.asc'),
  ]);
  return NextResponse.json({atolls,islands,wards},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
  return NextResponse.json({error:timedOut?'Location catalogue timed out. Please try again.':error instanceof Error?error.message:'Unable to load location catalogue.'},{status:503});
 }
}
