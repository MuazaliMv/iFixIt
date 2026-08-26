import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

async function readTable(path:string,authorization:string){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    headers:{apikey:PUBLISHABLE_KEY,Authorization:authorization,Accept:'application/json'},
    cache:'no-store',
    signal:AbortSignal.timeout(10000),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.message||payload?.error||`Location database returned ${response.status}.`);
  return Array.isArray(payload)?payload:[];
}

export async function GET(request:NextRequest){
  const auth=await resolveServerAuth(request);
  if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
  try{
    const [atolls,islands]=await Promise.all([
      readTable('atolls?select=id,code,display_name,sort_order&is_active=eq.true&is_serviceable=eq.true&order=sort_order.asc,display_name.asc',auth.authorization),
      readTable('islands?select=id,atoll_id,display_name,sort_order&is_active=eq.true&is_serviceable=eq.true&order=sort_order.asc,display_name.asc',auth.authorization),
    ]);
    if(!atolls.length)throw new Error('No active Atoll / Region records are available.');
    if(!islands.length)throw new Error('No active Island / City records are available.');
    return applyAuthCookies(NextResponse.json({atolls,islands},{headers:{'Cache-Control':'private, no-store'}}),auth);
  }catch(error){
    const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
    return applyAuthCookies(NextResponse.json({error:timedOut?'Location database timed out. Please try again.':error instanceof Error?error.message:'Unable to load locations.'},{status:503}),auth);
  }
}
