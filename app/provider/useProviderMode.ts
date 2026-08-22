'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
export type ProviderModeState={loading:boolean;ready:boolean;approved:boolean;status:string;name:string;providerApproved:boolean;categories:{id:string;code:string;name:string}[];selectedCategoryIds:string[];hours:any[];profile:any|null};

export function useProviderMode(redirectIncomplete=true){
 const[state,setState]=useState<ProviderModeState>({loading:true,ready:false,approved:false,status:'DRAFT',name:'Provider',providerApproved:false,categories:[],selectedCategoryIds:[],hours:[],profile:null});
 const load=useCallback(async()=>{
  setState(s=>({...s,loading:true}));
  try{
   const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}
   const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'get'})});
   if(!r.ok){if(redirectIncomplete)window.location.href='/provider/onboarding?from=provider-mode';setState(s=>({...s,loading:false}));return;}
   const p=await r.json();const status=String(p?.profile?.onboarding_status||'DRAFT');const approved=Boolean(p?.authProfile?.provider_approved&&status==='APPROVED');
   if(redirectIncomplete&&!approved){window.location.href='/provider/onboarding?from=provider-mode';return;}
   setState({loading:false,ready:true,approved,status,name:p?.profile?.public_name||p?.authProfile?.full_name||'Provider',providerApproved:Boolean(p?.authProfile?.provider_approved),categories:p?.categories||[],selectedCategoryIds:p?.selectedCategoryIds||[],hours:p?.hours||[],profile:p?.profile||null});
  }catch{if(redirectIncomplete)window.location.href='/provider/onboarding?from=provider-mode';else setState(s=>({...s,loading:false}));}
 },[redirectIncomplete]);
 useEffect(()=>{void load();},[load]);
 return{...state,reload:load};
}
