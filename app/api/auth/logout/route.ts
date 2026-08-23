import { NextResponse } from 'next/server';

const ACCESS_COOKIE='ifixmv_access_token';
const REFRESH_COOKIE='ifixmv_refresh_token';

export async function POST(){
 const response=NextResponse.json({ok:true});
 response.cookies.set(ACCESS_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
 response.cookies.set(REFRESH_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
 return response;
}
