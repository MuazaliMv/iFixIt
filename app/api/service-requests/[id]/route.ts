import { NextRequest, NextResponse } from 'next/server';

const REQUEST_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const authorization=request.headers.get('authorization')||'';
 let reason:string|undefined;
 try{const body=await request.json();reason=body?.reason;}catch{}
 const response=await fetch(REQUEST_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({action:'cancel',ticketNumber:decodeURIComponent(id),reason})});
 const payload=await response.json().catch(()=>({error:'Unable to cancel request.'}));
 return NextResponse.json(payload,{status:response.status});
}
