'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const SUBSCRIPTION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-subscription';
export type SubscriptionState={status:'TRIAL'|'ACTIVE'|'EXPIRED';active:boolean;daysRemaining:number;current_period_ends_at:string;priceMvr:number;gateway:string};
export type ProviderModeState={loading:boolean;ready:boolean;approved:boolean;status:string;name:string;providerApproved:boolean;categories:{id:string;code:string;name:string}[];selectedCategoryIds:string[];hours:any[];serviceAreas:any[];profile:any|null;subscription:SubscriptionState|null};

export function useProviderMode(redirectIncomplete=true){
 const[state,setState]=useState<ProviderModeState>({loading:true,ready:false,approved:false,status:'DRAFT',name:'Provider',providerApproved:false,categories:[],selectedCategoryIds:[],hours:[],serviceAreas:[],profile:null,subscription:null});
 const load=useCallback(async()=>{
  setState(s=>({...s,loading:true}));
  try{
   const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}
   const headers={'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`};
   const[r,sr]=await Promise.all([fetch(ONBOARDING_URL,{method:'POST',headers,body:JSON.stringify({action:'get'})}),fetch(SUBSCRIPTION_URL,{method:'POST',headers,body:JSON.stringify({action:'status'})})]);
   if(!r.ok){if(redirectIncomplete)window.location.href='/';setState(s=>({...s,loading:false}));return;}
   const p=await r.json();const sp=sr.ok?await sr.json():null;const subscription=(sp?.subscription||null) as SubscriptionState|null;
   const status=String(p?.profile?.onboarding_status||'DRAFT');const approved=Boolean(p?.authProfile?.provider_approved&&status==='APPROVED');
   if(redirectIncomplete&&!approved){window.location.href='/';return;}
   if(redirectIncomplete&&subscription&&!subscription.active&&!window.location.pathname.startsWith('/provider/subscription')){window.location.href='/provider/subscription';return;}
   setState({loading:false,ready:true,approved,status,name:p?.profile?.public_name||p?.authProfile?.full_name||'Provider',providerApproved:Boolean(p?.authProfile?.provider_approved),categories:p?.categories||[],selectedCategoryIds:p?.selectedCategoryIds||[],hours:p?.hours||[],serviceAreas:p?.serviceAreas||[],profile:p?.profile||null,subscription});
  }catch{if(redirectIncomplete)window.location.href='/';else setState(s=>({...s,loading:false}));}
 },[redirectIncomplete]);
 useEffect(()=>{void load();},[load]);
 return{...state,reload:load};
}
