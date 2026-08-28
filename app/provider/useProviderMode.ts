'use client';

import { useCallback, useEffect, useState } from 'react';

const ONBOARDING_URL='/api/legacy-edge?service=provider-onboarding';
const SUBSCRIPTION_URL='/api/legacy-edge?service=provider-subscription';
export type SubscriptionState={status:'TRIAL'|'ACTIVE'|'EXPIRED';active:boolean;daysRemaining:number;current_period_ends_at:string;priceMvr:number;gateway:string};
export type ProviderModeState={loading:boolean;ready:boolean;approved:boolean;status:string;name:string;providerApproved:boolean;categories:{id:string;code:string;name:string}[];selectedCategoryIds:string[];hours:any[];serviceAreas:any[];profile:any|null;subscription:SubscriptionState|null};

async function post(url:string,body:Record<string,unknown>){
 const response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));
 if(response.status===401){
  const next=`${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`/login?next=${encodeURIComponent(next)}`);
  throw new Error('Authentication required.');
 }
 return{response,payload};
}

export function useProviderMode(redirectIncomplete=true){
 const[state,setState]=useState<ProviderModeState>({loading:true,ready:false,approved:false,status:'DRAFT',name:'Provider',providerApproved:false,categories:[],selectedCategoryIds:[],hours:[],serviceAreas:[],profile:null,subscription:null});
 const load=useCallback(async()=>{
  setState(s=>({...s,loading:true}));
  try{
   const[{response:r,payload:p},{response:sr,payload:sp},accountResponse]=await Promise.all([
    post(ONBOARDING_URL,{action:'get'}),
    post(SUBSCRIPTION_URL,{action:'status'}),
    fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'}),
   ]);

   if(accountResponse.status===401){
    const next=`${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    return;
   }
   const accountPayload=accountResponse.ok?await accountResponse.json().catch(()=>({})):{};
   const accountProfile=accountPayload?.profile||null;
   const subscription=(sr.ok?sp?.subscription:null) as SubscriptionState|null;

   if(!r.ok){
    if(redirectIncomplete&&subscription&&!subscription.active&&!window.location.pathname.startsWith('/provider/subscription')){window.location.href='/provider/subscription';return;}
    setState({loading:false,ready:true,approved:Boolean(accountProfile?.provider_approved),status:'SETUP_REQUIRED',name:accountProfile?.full_name||'Provider',providerApproved:Boolean(accountProfile?.provider_approved),categories:[],selectedCategoryIds:[],hours:[],serviceAreas:[],profile:null,subscription});
    return;
   }

   const status=String(p?.profile?.onboarding_status||'DRAFT').toUpperCase();
   const providerApproved=Boolean(accountProfile?.provider_approved===true||p?.authProfile?.provider_approved===true);
   const approved=providerApproved&&(status==='APPROVED'||Boolean(p?.profile?.approved_at));
   if(redirectIncomplete&&subscription&&!subscription.active&&!window.location.pathname.startsWith('/provider/subscription')){window.location.href='/provider/subscription';return;}
   setState({loading:false,ready:true,approved,status,name:p?.profile?.public_name||p?.authProfile?.full_name||accountProfile?.full_name||'Provider',providerApproved,categories:p?.categories||[],selectedCategoryIds:p?.selectedCategoryIds||[],hours:p?.hours||[],serviceAreas:p?.serviceAreas||[],profile:p?.profile||null,subscription});
  }catch(error){
   if(error instanceof Error&&error.message==='Authentication required.')return;
   setState(s=>({...s,loading:false,ready:true,status:'UNAVAILABLE'}));
  }
 },[redirectIncomplete]);
 useEffect(()=>{void load();},[load]);
 return{...state,reload:load};
}
