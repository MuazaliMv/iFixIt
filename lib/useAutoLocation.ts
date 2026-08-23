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

  // iOS/Safari is much more reliable when geolocation is requested from a
  // direct user gesture. CustomerPortal also performs a best-effort automatic
  // attempt on mount; skip that silent attempt so it cannot consume/poison the
  // browser permission flow. Pressing "Use my location" has active user input
  // and will continue normally.
  if(typeof navigator.userActivation!=='undefined'&&!navigator.userActivation.isActive){
   return null;
  }

  setResolving(true);
  try{
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
   });
   const{data}=await supabase.auth.getSession();const jwt=data.session?.access_token;if(!jwt)throw new Error('Sign in required for automatic location.');
   const response=await fetch(RESOLVE_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy})});
   const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Unable to resolve your location.');
   if(!payload?.ok||!payload?.island){setResolved(null);setError('Your current GPS position could not be matched to an active iFixMV service location. You can still select the island or city manually.');return null;}
   const value:ResolvedLocation={atoll:payload.atoll,island:payload.island,locationUnit:payload.locationUnit||null,confidence:payload.confidence,source:payload.source,providerLabel:payload.providerLabel||payload.label||null};
   setResolved(value);setError('');return value;
  }catch(e){
   const ge=e as GeolocationPositionError;
   if(ge?.code===1){
    setError('Location access is blocked. On iPhone, open Settings → Privacy & Security → Location Services → Safari Websites (or your browser) → While Using the App, enable Precise Location, then tap Use my location again.');
   }else if(ge?.code===2){
    setError('Your location is temporarily unavailable. Check Location Services and your network, then try again.');
   }else if(ge?.code===3){
    setError('Location request timed out. Move to an area with a clearer GPS signal and try again.');
   }else{
    setError(e instanceof Error?e.message:'Unable to detect your location.');
   }
   return null;
  }finally{setResolving(false);}
 },[]);
 return{resolving,resolved,error,resolveCurrentLocation};
}
