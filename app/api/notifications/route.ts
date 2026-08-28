import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../lib/serverAuth';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

async function userId(auth:{authorization:string}){
 const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:KEY,Authorization:auth.authorization},cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!r.ok)return'';const p=await r.json().catch(()=>({}));return String(p?.id||'');
}

export async function GET(request:NextRequest){
 const auth=await resolveServerAuth(request);if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{const uid=await userId(auth);if(!uid)return applyAuthCookies(NextResponse.json({error:'Authentication required.'},{status:401}),auth);
  const[profileResponse,notificationResponse]=await Promise.all([
   fetch(`${SUPABASE_URL}/rest/v1/auth_profiles?select=role&user_id=eq.${encodeURIComponent(uid)}&limit=1`,{headers:{apikey:KEY,Authorization:auth.authorization},cache:'no-store',signal:AbortSignal.timeout(5000)}),
   fetch(`${SUPABASE_URL}/rest/v1/user_notifications?select=id,role,notification_type,title,message,request_id,ticket_number,action_href,created_at,read_at&user_id=eq.${encodeURIComponent(uid)}&order=created_at.desc&limit=100`,{headers:{apikey:KEY,Authorization:auth.authorization},cache:'no-store',signal:AbortSignal.timeout(7000)}),
  ]);
  const profiles=profileResponse.ok?await profileResponse.json().catch(()=>[]):[];const items=notificationResponse.ok?await notificationResponse.json().catch(()=>[]):[];
  if(!notificationResponse.ok)return applyAuthCookies(NextResponse.json({error:'Unable to load notifications.'},{status:notificationResponse.status}),auth);
  return applyAuthCookies(NextResponse.json({role:Array.isArray(profiles)?profiles[0]?.role||'CUSTOMER':'CUSTOMER',items:Array.isArray(items)?items:[]},{headers:{'Cache-Control':'no-store'}}),auth);
 }catch{return applyAuthCookies(NextResponse.json({error:'Unable to load notifications.'},{status:503}),auth);}
}

export async function PATCH(request:NextRequest){
 const auth=await resolveServerAuth(request);if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 try{const uid=await userId(auth);if(!uid)return applyAuthCookies(NextResponse.json({error:'Authentication required.'},{status:401}),auth);const body=await request.json().catch(()=>({}));const id=String(body?.id||'').trim();const all=body?.all===true;const now=new Date().toISOString();let url=`${SUPABASE_URL}/rest/v1/user_notifications?user_id=eq.${encodeURIComponent(uid)}`;if(all)url+='&read_at=is.null';else if(id)url+=`&id=eq.${encodeURIComponent(id)}`;else return applyAuthCookies(NextResponse.json({error:'Notification id required.'},{status:400}),auth);
  const r=await fetch(url,{method:'PATCH',headers:{apikey:KEY,Authorization:auth.authorization,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({read_at:now}),cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)return applyAuthCookies(NextResponse.json({error:'Unable to update notifications.'},{status:r.status}),auth);return applyAuthCookies(NextResponse.json({ok:true,read_at:now},{headers:{'Cache-Control':'no-store'}}),auth);
 }catch{return applyAuthCookies(NextResponse.json({error:'Unable to update notifications.'},{status:503}),auth);}
}
