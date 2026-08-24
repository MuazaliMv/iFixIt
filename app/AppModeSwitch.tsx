'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const SETUP_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-setup-data';
type Mode='customer'|'provider';
type Props={mode:Mode;compact?:boolean;className?:string};

function remember(mode:Mode,message:string){
 try{
  localStorage.setItem('fixit:mobile-nav-role',mode);
  localStorage.setItem('fixit:app-mode',mode);
  sessionStorage.setItem('fixit:mode-toast',message);
 }catch{}
}

export default function AppModeSwitch({mode,compact=false,className=''}:Props){
 const[busy,setBusy]=useState(false);
 const[providerReady,setProviderReady]=useState<boolean|null>(mode==='provider'?true:null);

 useEffect(()=>{
  if(mode!=='customer'){
   setProviderReady(true);
   return;
  }
  let active=true;
  void(async()=>{
   try{
    const{data}=await supabase.auth.getSession();
    if(!data.session){if(active)setProviderReady(false);return;}

    // Any account whose permanent role is PROVIDER, or whose provider approval
    // flag is active, must retain access to both Customer and Service Provider
    // workspaces. This is the global dual-mode rule for service providers.
    const profileResponse=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'});
    if(profileResponse.ok){
     const payload=await profileResponse.json().catch(()=>({}));
     const role=String(payload?.profile?.role||'').toUpperCase();
     if(role==='PROVIDER'||payload?.profile?.provider_approved===true){
      if(active)setProviderReady(true);
      return;
     }
    }

    // Fallback to onboarding status for older sessions / transitional records.
    const r=await fetch(ONBOARDING_URL,{
     method:'POST',
     headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},
     body:JSON.stringify({action:'get'}),
     cache:'no-store'
    });
    if(!r.ok){if(active)setProviderReady(false);return;}
    const p=await r.json();
    const fallbackRole=String(p?.authProfile?.role||'').toUpperCase();
    if(active)setProviderReady(Boolean(
     fallbackRole==='PROVIDER'||
     p?.authProfile?.provider_approved===true||
     p?.profile?.onboarding_status==='APPROVED'
    ));
   }catch{
    if(active)setProviderReady(false);
   }
  })();
  return()=>{active=false;};
 },[mode]);

 async function logMode(jwt:string,next:Mode){
  try{
   await fetch(SETUP_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},
    body:JSON.stringify({action:'mode_event',mode:next})
   });
  }catch{}
 }

 async function switchMode(){
  if(busy)return;
  setBusy(true);
  try{
   const{data}=await supabase.auth.getSession();
   if(mode==='provider'){
    if(data.session)await logMode(data.session.access_token,'customer');
    remember('customer',"You're now viewing as Customer.");
    window.location.assign('/home');
    return;
   }
   if(!data.session){window.location.assign('/login');return;}
   if(providerReady!==true){
    remember('customer','Complete your Service Provider application to request approval.');
    window.location.assign('/provider/onboarding');
    return;
   }
   await logMode(data.session.access_token,'provider');
   remember('provider',"You're now viewing as Service Provider.");
   window.location.assign('/provider/today');
  }finally{
   setBusy(false);
  }
 }

 const isChecking=mode==='customer'&&providerReady===null;
 const text=mode==='provider'
  ?'Switch to Customer'
  :providerReady===true
   ?'Switch to Service Provider'
   :'Become a Service Provider';
 const compactText=mode==='provider'
  ?'Customer'
  :providerReady===true
   ?'Service Provider'
   :'Become a Provider';

 return <button
  type="button"
  className={`modeSwitch ${compact?'compact':''} ${className}`.trim()}
  onClick={()=>void switchMode()}
  disabled={busy||isChecking}
  aria-label={isChecking?'Checking Service Provider approval':text}
  title={isChecking?'Checking Service Provider approval':text}
 >
  <span className={`modeDot ${mode}`}/>
  {busy?'Switching…':isChecking?'Checking…':compact?compactText:text}
 </button>;
}
