import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{
  const r=await fetch(`${SUPABASE_URL}/rest/v1/service_categories?select=id,code,name,sort_order&is_active=eq.true&parent_id=is.null&order=sort_order.asc,name.asc`,{
   headers:{apikey:KEY,Authorization:auth.authorization},cache:'no-store',signal:AbortSignal.timeout(7000),
  });
  const rows=await r.json().catch(()=>[]);
  if(!r.ok)return applyAuthCookies(NextResponse.json({error:'Unable to load services.'},{status:r.status}),auth);
  return applyAuthCookies(NextResponse.json({services:Array.isArray(rows)?rows:[]},{headers:{'Cache-Control':'no-store'}}),auth);
 }catch{return applyAuthCookies(NextResponse.json({error:'Unable to load services.'},{status:503}),auth);}
}
