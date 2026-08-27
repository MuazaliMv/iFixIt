'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
export type SubscriptionState={status:'TRIAL'|'ACTIVE'|'EXPIRED';active:boolean;daysRemaining:number;current_period_ends_at:string;priceMvr:number;gateway:string};
export type ProviderModeState={loading:boolean;ready:boolean;approved:boolean;status:string;name:string;providerApproved:boolean;categories:{id:string;code:string;name:string}[];selectedCategoryIds:string[];hours:any[];serviceAreas:any[];profile:any|null;subscription:SubscriptionState|null};

export function useProviderMode(redirectIncomplete=true){
 const[state,setState]=useState<ProviderModeState>({loading:true,ready:false,approved:false,status:'DRAFT',name:'Provider',providerApproved:false,categories:[],selectedCategoryIds:[],hours:[],serviceAreas:[],profile:null,subscription:null});
 const load=useCallback(async()=>{
  setState(s=>({...s,loading:true}));
  try{
   const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}
   const headers={'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`};
   const[r,accountResponse]=await Promise.all([
    fetch(ONBOARDING_URL,{method:'POST',headers,body:JSON.stringify({action:'get'}),cache:'no-store'}),
    fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'})
   ]);

   const accountPayload=accountResponse.ok?await accountResponse.json().catch(()=>({})):{};
   const accountProfile=accountPayload?.profile||null;

   // Provider Portal access is determined by the authenticated account role in
   // proxy.ts/lib/roleAccess.ts. Subscription/paywall state is retired and must
   // not gate or redirect any provider workspace route.
   if(!r.ok){
    setState({
     loading:false,
     ready:true,
     approved:Boolean(accountProfile?.provider_approved),
     status:'SETUP_REQUIRED',
     name:accountProfile?.full_name||'Provider',
     providerApproved:Boolean(accountProfile?.provider_approved),
     categories:[],
     selectedCategoryIds:[],
     hours:[],
     serviceAreas:[],
     profile:null,
     subscription:null,
    });
    return;
   }

   const p=await r.json();
   const status=String(p?.profile?.onboarding_status||'DRAFT').toUpperCase();
   const providerApproved=Boolean(accountProfile?.provider_approved===true||p?.authProfile?.provider_approved===true);
   const approved=providerApproved&&(status==='APPROVED'||Boolean(p?.profile?.approved_at));

   setState({loading:false,ready:true,approved,status,name:p?.profile?.public_name||p?.authProfile?.full_name||accountProfile?.full_name||'Provider',providerApproved,categories:p?.categories||[],selectedCategoryIds:p?.selectedCategoryIds||[],hours:p?.hours||[],serviceAreas:p?.serviceAreas||[],profile:p?.profile||null,subscription:null});
  }catch{
   // Stay inside the Provider workspace on transient provider-data failures.
   // The server-side role gate remains authoritative for access control.
   setState(s=>({...s,loading:false,ready:true,status:'UNAVAILABLE'}));
  }
 },[redirectIncomplete]);
 useEffect(()=>{void load();},[load]);
 return{...state,reload:load};
}
