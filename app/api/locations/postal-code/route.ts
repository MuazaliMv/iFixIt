import { NextRequest, NextResponse } from 'next/server';

type PostalOption={postalCode:string;matchedAddress:string|null};

function clean(value:string|null){return String(value||'').trim().slice(0,160);}
function normalize(value:string){
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bcity\b/g,'').replace(/\batoll\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

const VERIFIED_LOCALITIES:Array<{atoll?:string;city:string;ward?:string;postalCode:string}>=[
 {atoll:'Kaafu',city:'Male',ward:'Hulhumale Phase 1',postalCode:'23000'},
 {atoll:'Kaafu',city:'Male',ward:'Hulhumale Phase 2',postalCode:'23000'},
 {atoll:'Kaafu',city:'Hulhumale',postalCode:'23000'},
];

function resolvePostalCode(atollValue:string,cityValue:string,wardValue:string){
 const atoll=normalize(atollValue),city=normalize(cityValue),ward=normalize(wardValue);
 const exactWard=VERIFIED_LOCALITIES.find(item=>(!item.atoll||normalize(item.atoll)===atoll)&&normalize(item.city)===city&&item.ward&&normalize(item.ward)===ward);
 if(exactWard)return exactWard.postalCode;
 const exactCity=VERIFIED_LOCALITIES.find(item=>(!item.atoll||normalize(item.atoll)===atoll)&&normalize(item.city)===city&&!item.ward);
 return exactCity?.postalCode||null;
}

export async function GET(request:NextRequest){
 const city=clean(request.nextUrl.searchParams.get('city'));
 const ward=clean(request.nextUrl.searchParams.get('ward'));
 const atoll=clean(request.nextUrl.searchParams.get('atoll'));
 if(!city||!atoll)return NextResponse.json({error:'Island / City and Atoll / Region are required.'},{status:400});

 const postalCode=resolvePostalCode(atoll,city,ward);
 const postalCodes:PostalOption[]=postalCode?[{postalCode,matchedAddress:[ward,city,atoll,'Maldives'].filter(Boolean).join(', ')}]:[];
 return NextResponse.json({
  postalCode,
  postalCodes,
  source:postalCode?'Verified locality lookup':'No verified postal code found',
  matchedAddress:postalCodes[0]?.matchedAddress||null,
  requiresSelection:false
 },{headers:{'Cache-Control':'private, max-age=3600'}});
}
