'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import AppModeSwitch from './AppModeSwitch';

type Mode='customer'|'provider';

function isHiddenRoute(path:string){
 return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');
}

function routeMode(path:string):Mode{
 if(path.startsWith('/provider')&&!path.startsWith('/provider/onboarding'))return 'provider';
 return 'customer';
}

export default function GlobalModeSwitch(){
 const path=usePathname();
 const[mode,setMode]=useState<Mode>(()=>routeMode(path));
 const[signedIn,setSignedIn]=useState(false);

 useEffect(()=>{
  setMode(routeMode(path));
  let active=true;
  void(async()=>{
   const{data}=await supabase.auth.getSession();
   if(active)setSignedIn(Boolean(data.session));
  })();
  const{data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active)setSignedIn(Boolean(session));
  });
  return()=>{
   active=false;
   listener.subscription.unsubscribe();
  };
 },[path]);

 if(isHiddenRoute(path)||!signedIn)return null;

 const isAdmin=path.startsWith('/admin');
 const profileHref=mode==='provider'?'/provider/profile':'/profile';

 return <>
  <div className="globalAccountDock" aria-label="Account controls">
   <Link className="globalProfileLink" href={profileHref} aria-label="Open profile" title="Profile">
    <span className="globalProfileAvatar" aria-hidden="true">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    </span>
    <span>Profile</span>
   </Link>
   {!isAdmin?<AppModeSwitch mode={mode} compact/>:null}
  </div>
  <style jsx global>{`
   .globalAccountDock{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:850;display:flex;align-items:center;gap:8px;padding:7px;border:1px solid #dbe3ef;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 12px 30px rgba(15,23,42,.14);backdrop-filter:blur(12px)}
   .globalProfileLink{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:5px 10px 5px 6px;border-radius:999px;color:#172033;text-decoration:none;font-size:13px;font-weight:750;white-space:nowrap}
   .globalProfileLink:hover{background:#f1f5f9}
   .globalProfileAvatar{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#eff6ff;color:#2563eb}
   .globalAccountDock .modeSwitch.compact{min-height:38px;border-radius:999px;white-space:nowrap}
   @media(max-width:520px){.globalAccountDock{left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));justify-content:space-between}.globalProfileLink{flex:0 0 auto}.globalAccountDock .modeSwitch.compact{flex:1;justify-content:center}}
  `}</style>
 </>;
}
