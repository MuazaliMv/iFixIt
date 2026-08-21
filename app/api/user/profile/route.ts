import { NextRequest, NextResponse } from 'next/server';

const AUTH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/auth-account';

export async function GET(request:NextRequest){
 const authorization=request.headers.get('authorization')||'';
 const response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'profile_get'})});
 const payload=await response.json().catch(()=>({error:'Unable to load profile.'}));
 return NextResponse.json(payload,{status:response.status});
}

export async function PUT(request:NextRequest){
 const authorization=request.headers.get('authorization')||'';
 const contentType=request.headers.get('content-type')||'';
 let response:Response;
 if(contentType.includes('multipart/form-data')){
  const form=await request.formData();
  form.set('action','profile_update');
  response=await fetch(AUTH_API,{method:'POST',headers:{Authorization:authorization},body:form});
 }else{
  const body=await request.json().catch(()=>({}));
  response=await fetch(AUTH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'profile_update',...body})});
 }
 const payload=await response.json().catch(()=>({error:'Unable to update profile.'}));
 return NextResponse.json(payload,{status:response.status});
}
