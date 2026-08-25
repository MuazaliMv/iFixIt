import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_URL='https://nominatim.openstreetmap.org/search';

type NominatimResult={
 address?:{
  postcode?:string;
  country_code?:string;
 };
 display_name?:string;
};

type PostalOption={postalCode:string;matchedAddress:string|null};

function clean(value:string|null){return String(value||'').trim().slice(0,160);}

async function queryNominatim(parts:string[]){
 const q=parts.filter(Boolean).join(', ');
 const params=new URLSearchParams({format:'jsonv2',addressdetails:'1',limit:'10',countrycodes:'mv',q});
 const response=await fetch(`${NOMINATIM_URL}?${params.toString()}`,{
  headers:{
   Accept:'application/json',
   'Accept-Language':'en',
   'User-Agent':'iFixMV/1.0 (postal-code-lookup; https://ifixmv.com)'
  },
  cache:'no-store',
  signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error(`Postal lookup provider returned ${response.status}.`);
 const rows=await response.json() as NominatimResult[];
 return Array.isArray(rows)?rows:[];
}

export async function GET(request:NextRequest){
 const line1=clean(request.nextUrl.searchParams.get('line1'));
 const line2=clean(request.nextUrl.searchParams.get('line2'));
 const city=clean(request.nextUrl.searchParams.get('city'));
 const ward=clean(request.nextUrl.searchParams.get('ward'));
 const atoll=clean(request.nextUrl.searchParams.get('atoll'));
 if(!city||!atoll)return NextResponse.json({error:'Island / City and Atoll / Region are required.'},{status:400});

 try{
  const attempts=[
   [line1,line2,ward,city,atoll,'Maldives'],
   [line2,ward,city,atoll,'Maldives'],
   [ward,city,atoll,'Maldives'],
   [city,atoll,'Maldives']
  ];
  const choices=new Map<string,PostalOption>();
  for(const parts of attempts){
   const rows=await queryNominatim(parts);
   for(const row of rows){
    const code=String(row?.address?.postcode||'').trim();
    if(row?.address?.country_code?.toLowerCase()==='mv'&&code&&!choices.has(code)){
     choices.set(code,{postalCode:code,matchedAddress:row.display_name||null});
    }
   }
  }
  const postalCodes=[...choices.values()];
  const first=postalCodes[0]||null;
  return NextResponse.json({
   postalCode:first?.postalCode||null,
   postalCodes,
   source:'OpenStreetMap Nominatim',
   matchedAddress:first?.matchedAddress||null
  },{headers:{'Cache-Control':'private, max-age=900'}});
 }catch(error){
  const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
  return NextResponse.json({error:timedOut?'Postal code lookup timed out. Please try again.':error instanceof Error?error.message:'Unable to look up postal code.'},{status:502});
 }
}
