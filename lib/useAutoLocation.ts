'use client';

import { useCallback, useState } from 'react';
import { supabase } from './supabaseClient';

const RESOLVE_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/resolve-location';

export type ResolvedLocation={
  atoll:{id:string;code:string;display_name:string};
  island:{id:string;atoll_id:string;display_name:string};
  locationUnit?:{id:string;display_name:string;unit_type:string}|null;
  confidence?:number;
  source?:string;
  providerLabel?:string|null;
};

export function useAutoLocation(){
 const[resolving,setResolving]=useState(false);
 const[resolved,setResolved]=useState<ResolvedLocation|null>(null);
 const[error,setError]=useState('');

 const resolveCurrentLocation=useCallback(async()=>{
  setError('');
  if(typeof navigator==='undefined'||!navigator.geolocation){setError('Automatic location is not supported on this device.');return null;}
  setResolving(true);
  try{
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000,maximumAge:300000}));
   const{data}=await supabase.auth.getSession();const jwt=data.session?.access_token;if(!jwt)throw new Error('Sign in required for automatic location.');
   const response=await fetch(RESOLVE_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy})});
   const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Unable to resolve your location.');
   if(!payload?.ok||!payload?.island){setResolved(null);setError('Your current GPS position could not be matched to an active FixIt service location.');return null;}
   const value:ResolvedLocation={atoll:payload.atoll,island:payload.island,locationUnit:payload.locationUnit||null,confidence:payload.confidence,source:payload.source,providerLabel:payload.providerLabel||payload.label||null};
   setResolved(value);return value;
  }catch(e){
   const ge=(e as GeolocationPositionError)?.code;
   if(ge===1)setError('Location permission is off. You can still select your location manually.');
   else setError(e instanceof Error?e.message:'Unable to detect your location.');
   return null;
  }finally{setResolving(false);}
 },[]);
 return{resolving,resolved,error,resolveCurrentLocation};
}
