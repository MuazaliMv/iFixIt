import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies, resolveServerAuth } from '../../../lib/serverAuth';

export const dynamic='force-dynamic';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const ALLOWED_SERVICES=new Set(['customer-requests','dispatch-control','request-media']);

function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{
  const parsed=new URL(origin);
  const forwardedHost=(request.headers.get('x-forwarded-host')||request.headers.get('host')||'').split(',')[0].trim();
  const forwardedProto=(request.headers.get('x-forwarded-proto')||'https').split(',')[0].trim();
  if(forwardedHost&&parsed.host===forwardedHost&&parsed.protocol===`${forwardedProto}:`)return true;
  return parsed.origin===request.nextUrl.origin;
 }catch{return false;}
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const service=String(request.nextUrl.searchParams.get('service')||'').trim();
 if(!ALLOWED_SERVICES.has(service))return NextResponse.json({error:'Unsupported service.'},{status:400});
 const auth=await resolveServerAuth(request);
 if(!auth)return NextResponse.json({error:'Authentication required.'},{status:401});
 const body=await request.text();
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/${service}`,{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:auth.authorization},
   body,
   cache:'no-store',
   signal:AbortSignal.timeout(12000),
  });
  const text=await response.text();
  const next=new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}});
  return applyAuthCookies(next,auth);
 }catch(error){
  console.error('Legacy edge proxy failed',{service,error});
  return applyAuthCookies(NextResponse.json({error:error instanceof Error?error.message:'Service temporarily unavailable.'},{status:503}),auth);
 }
}
