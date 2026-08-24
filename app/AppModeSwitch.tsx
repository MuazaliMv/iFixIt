'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import { canAccessPortal, normalizeAccountRole } from '../lib/roleAccess';

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
 const[canUseProvider,setCanUseProvider]=useState<boolean|null>(mode==='provider'?true:null);

 useEffect(()=>{
  if(mode==='provider'){
   setCanUseProvider(true);
   return;
  }

  let active=true;
  void(async()=>{
   try{
    const response=await apiFetch('/api/user/profile');
    if(!active)return;
    if(!response.ok){setCanUseProvider(false);return;}
    const payload=await response.json().catch(()=>({}));
    const role=normalizeAccountRole(payload?.profile?.role);
    const providerApproved=Boolean(payload?.profile?.provider_approved);
    setCanUseProvider(canAccessPortal(role,'provider',providerApproved));
   }catch{
    if(active)setCanUseProvider(false);
   }
  })();
  return()=>{active=false;};
 },[mode]);

 async function switchMode(){
  if(busy)return;
  setBusy(true);
  try{
   if(mode==='provider'){
    remember('customer',"You're now viewing as Customer.");
    window.location.assign('/home');
    return;
   }

   if(canUseProvider!==true)return;
   remember('provider',"You're now viewing as Service Provider.");
   window.location.assign('/provider/today');
  }finally{
   setBusy(false);
  }
 }

 if(mode==='customer'&&canUseProvider!==true)return null;

 const text=mode==='provider'?'Switch to Customer':'Switch to Service Provider';
 const compactText=mode==='provider'?'Customer':'Service Provider';

 return <button
  type="button"
  className={`modeSwitch ${compact?'compact':''} ${className}`.trim()}
  onClick={()=>void switchMode()}
  disabled={busy}
  aria-label={text}
  title={text}
 >
  <span className={`modeDot ${mode}`}/>
  {busy?'Switching…':compact?compactText:text}
 </button>;
}
