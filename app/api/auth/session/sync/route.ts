import { NextResponse } from 'next/server';

export async function POST(){
 return NextResponse.json(
  {
   authenticated:false,
   error:'Legacy session synchronization is disabled. Sign in with phone OTP to create an application session.',
   code:'OTP_LOGIN_REQUIRED',
  },
  {status:410,headers:{'Cache-Control':'no-store'}},
 );
}
