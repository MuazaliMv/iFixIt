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
function normalizePlace(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function validMaldivesPostalCode(value:string){return /^\d{5}$/.test(value);}

function codeMatchesLocation(code:string,city:string){
 if(!validMaldivesPostalCode(code))return false;
 const place=normalizePlace(city);
 // Maldives' current postcode system uses 2xxxx for the Malé postal region.
 // Keep the well-defined capital-area prefixes from being mixed with atoll results.
 if(place==='male'||place==='male city')return /^20\d{3}$/.test(code);
 if(place==='villingili'||place==='villimale'||place==='villingili island')return /^21\d{3}$/.test(code);
 if(place==='hulhule'||place==='hulhule island')return code==='22000';
 if(place==='hulhumale'||place.startsWith('hulhumale '))return /^23\d{3}$/.test(code);
 // Other inhabited atolls use the 0xxxx/1xxxx postal regions, not Malé-region 2xxxx codes.
 return /^[01]\d{4}$/.test(code);
}

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

  // Do not merge broad fallback results with a more specific address match.
  // The first query level that yields valid, location-compatible Maldives postcodes wins.
  for(const parts of attempts){
   const rows=await queryNominatim(parts);
   const choices=new Map<string,PostalOption>();
   for(const row of rows){
    const code=String(row?.address?.postcode||'').trim();
    if(row?.address?.country_code?.toLowerCase()!=='mv')continue;
    if(!codeMatchesLocation(code,city))continue;
    if(!choices.has(code))choices.set(code,{postalCode:code,matchedAddress:row.display_name||null});
   }
   if(choices.size){
    const postalCodes=[...choices.values()];
    const first=postalCodes.length===1?postalCodes[0]:null;
    return NextResponse.json({
     postalCode:first?.postalCode||null,
     postalCodes,
     source:'OpenStreetMap Nominatim',
     matchedAddress:first?.matchedAddress||null,
     requiresSelection:postalCodes.length>1
    },{headers:{'Cache-Control':'private, max-age=900'}});
   }
  }

  return NextResponse.json({
   postalCode:null,
   postalCodes:[],
   source:'OpenStreetMap Nominatim',
   matchedAddress:null,
   requiresSelection:false
  },{headers:{'Cache-Control':'private, max-age=900'}});
 }catch(error){
  const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
  return NextResponse.json({error:timedOut?'Postal code lookup timed out. Please try again.':error instanceof Error?error.message:'Unable to look up postal code.'},{status:502});
 }
}
