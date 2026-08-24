'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
 const[open,setOpen]=useState(false);
 const wrapRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>{
  setMode(routeMode(path));
  setOpen(false);
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

 useEffect(()=>{
  function onPointerDown(event:PointerEvent){
   if(!wrapRef.current?.contains(event.target as Node))setOpen(false);
  }
  function onKeyDown(event:KeyboardEvent){
   if(event.key==='Escape')setOpen(false);
  }
  document.addEventListener('pointerdown',onPointerDown);
  document.addEventListener('keydown',onKeyDown);
  return()=>{
   document.removeEventListener('pointerdown',onPointerDown);
   document.removeEventListener('keydown',onKeyDown);
  };
 },[]);

 if(isHiddenRoute(path)||!signedIn)return null;

 const isAdmin=path.startsWith('/admin');
 const profileHref=mode==='provider'?'/provider/profile':'/profile';
 const workspaceLabel=mode==='provider'?'Service Provider':'Customer';

 return <>
  <div className="airAccount" ref={wrapRef}>
   <button
    type="button"
    className="airAccountTrigger"
    aria-label="Open account menu"
    aria-expanded={open}
    aria-haspopup="menu"
    onClick={()=>setOpen(v=>!v)}
   >
    <span className="airMenuIcon" aria-hidden="true">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </span>
    <span className="airAvatar" aria-hidden="true">
     <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    </span>
   </button>

   {open?<div className="airAccountMenu" role="menu" aria-label="Account menu">
    <div className="airMenuCurrent">
     <span className="airMenuCurrentLabel">Viewing as</span>
     <strong>{workspaceLabel}</strong>
    </div>
    <div className="airMenuDivider"/>
    <Link className="airMenuItem" href={profileHref} role="menuitem" onClick={()=>setOpen(false)}>
     <span>Profile</span><span aria-hidden="true">›</span>
    </Link>
    {!isAdmin?<div className="airModeRow" role="none">
     <AppModeSwitch mode={mode}/>
    </div>:null}
   </div>:null}
  </div>

  <style jsx global>{`
   .airAccount{position:fixed;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));z-index:950}
   .airAccountTrigger{display:inline-flex;align-items:center;gap:10px;min-width:76px;min-height:46px;padding:5px 6px 5px 13px;border:1px solid #d8d8d8;border-radius:999px;background:#fff;color:#222;box-shadow:0 2px 5px rgba(0,0,0,.08);cursor:pointer;transition:box-shadow .16s ease,transform .16s ease}
   .airAccountTrigger:hover{box-shadow:0 3px 12px rgba(0,0,0,.16)}
   .airAccountTrigger:active{transform:scale(.98)}
   .airMenuIcon{display:grid;place-items:center;color:#222}
   .airAvatar{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#717171;color:#fff}
   .airAccountMenu{position:absolute;right:0;top:56px;width:min(285px,calc(100vw - 24px));padding:8px 0;border:1px solid #e6e6e6;border-radius:14px;background:#fff;box-shadow:0 8px 28px rgba(0,0,0,.18);overflow:hidden}
   .airMenuCurrent{padding:12px 16px 10px;color:#222}
   .airMenuCurrentLabel{display:block;margin-bottom:2px;color:#717171;font-size:12px;font-weight:600}
   .airMenuCurrent strong{font-size:14px}
   .airMenuDivider{height:1px;background:#ededed;margin:4px 0}
   .airMenuItem{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:10px 16px;color:#222;text-decoration:none;font-size:14px;font-weight:600}
   .airMenuItem:hover{background:#f7f7f7}
   .airModeRow{padding:4px 8px 8px}
   .airModeRow .modeSwitch{width:100%;min-height:46px;justify-content:flex-start!important;padding:11px 12px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#222!important;box-shadow:none!important;font-size:14px!important;font-weight:650!important;text-align:left}
   .airModeRow .modeSwitch:hover{background:#f7f7f7!important}
   .airModeRow .modeDot{width:8px!important;height:8px!important;flex:0 0 8px}
   @media(max-width:520px){
    .airAccount{right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top))}
    .airAccountTrigger{min-width:70px;min-height:44px}
    .airAvatar{width:32px;height:32px}
    .airAccountMenu{top:52px;width:min(300px,calc(100vw - 24px))}
   }
  `}</style>
 </>;
}
