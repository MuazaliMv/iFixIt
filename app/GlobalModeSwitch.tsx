'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import AppModeSwitch from './AppModeSwitch';

type Mode='customer'|'provider'|'admin';
type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';

function isHiddenRoute(path:string){
 return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');
}

function routeMode(path:string):Mode{
 if(path.startsWith('/admin'))return 'admin';
 if(path.startsWith('/provider')&&!path.startsWith('/provider/onboarding'))return 'provider';
 return 'customer';
}

export default function GlobalModeSwitch(){
 const path=usePathname();
 const[mode,setMode]=useState<Mode>(()=>routeMode(path));
 const[signedIn,setSignedIn]=useState(false);
 const[accountRole,setAccountRole]=useState<AccountRole>('CUSTOMER');
 const[providerApproved,setProviderApproved]=useState(false);
 const[open,setOpen]=useState(false);
 const wrapRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>{
  setMode(routeMode(path));
  setOpen(false);
  let active=true;
  void(async()=>{
   const{data}=await supabase.auth.getSession();
   if(!active)return;
   const hasSession=Boolean(data.session);
   setSignedIn(hasSession);
   if(!hasSession)return;
   try{
    const r=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok||!active)return;
    const p=await r.json().catch(()=>({}));
    const raw=String(p?.profile?.role||'CUSTOMER').toUpperCase();
    const role:AccountRole=raw==='ADMIN'?'ADMIN':raw==='PROVIDER'?'PROVIDER':'CUSTOMER';
    setAccountRole(role);
    // Admin inherently has all three workspaces. Provider approval is only
    // relevant to non-admin customer/provider accounts.
    setProviderApproved(role==='ADMIN'||role==='PROVIDER'||p?.profile?.provider_approved===true);
   }catch{}
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

 const profileHref=mode==='provider'?'/provider/profile':'/profile';
 const workspaceLabel=mode==='admin'?'Admin':mode==='provider'?'Service Provider':'Customer';
 const isAdminAccount=accountRole==='ADMIN';

 function rememberWorkspace(next:Mode){
  try{
   localStorage.setItem('fixit:mobile-nav-role',next);
   localStorage.setItem('fixit:app-mode',next);
  }catch{}
  setOpen(false);
 }

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
     <span className="airMenuItemMain"><span className="airMenuItemTitle">Profile</span><small>View and manage your account</small></span>
     <span aria-hidden="true">›</span>
    </Link>

    {isAdminAccount?<>
     <div className="airMenuDivider"/>
     {mode!=='admin'?<Link className="airWorkspaceItem" href="/admin" role="menuitem" onClick={()=>rememberWorkspace('admin')}>
      <span className="airWorkspaceText"><strong>Switch to Admin</strong><small>Manage users, requests and system settings</small></span><span aria-hidden="true">›</span>
     </Link>:null}
     {mode!=='provider'?<Link className="airWorkspaceItem" href="/provider/today" role="menuitem" onClick={()=>rememberWorkspace('provider')}>
      <span className="airWorkspaceText"><strong>Switch to Service Provider</strong><small>Open the provider workspace</small></span><span aria-hidden="true">›</span>
     </Link>:null}
     {mode!=='customer'?<Link className="airWorkspaceItem" href="/home" role="menuitem" onClick={()=>rememberWorkspace('customer')}>
      <span className="airWorkspaceText"><strong>Switch to Customer</strong><small>Request and manage services as a customer</small></span><span aria-hidden="true">›</span>
     </Link>:null}
    </>:mode!=='admin'?<div className="airModeRow" role="none">
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
   .airAccountMenu{position:absolute;right:0;top:56px;width:min(380px,calc(100vw - 24px));padding:10px 0;border:1px solid #e6e6e6;border-radius:16px;background:#fff;box-shadow:0 10px 32px rgba(0,0,0,.18);overflow:hidden}
   .airMenuCurrent{padding:16px 20px 14px;color:#222}
   .airMenuCurrentLabel{display:block;margin-bottom:4px;color:#717171;font-size:13px;font-weight:600}
   .airMenuCurrent strong{display:block;font-size:18px;line-height:1.25}
   .airMenuDivider{height:1px;background:#ededed;margin:4px 0}
   .airMenuItem,.airWorkspaceItem{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:12px 20px;color:#222;text-decoration:none;font-size:15px;font-weight:650}
   .airMenuItem:hover,.airWorkspaceItem:hover{background:#f7f7f7}
   .airMenuItemMain,.airWorkspaceText{display:flex;min-width:0;flex-direction:column;gap:2px}
   .airMenuItemTitle,.airWorkspaceText strong{font-size:16px;font-weight:700;line-height:1.2}
   .airMenuItemMain small,.airWorkspaceText small{color:#717171;font-size:13px;font-weight:500;line-height:1.35;white-space:normal}
   .airModeRow{padding:6px 10px 10px}
   .airModeRow .modeSwitch{width:100%;min-height:56px;justify-content:flex-start!important;padding:13px 14px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#222!important;box-shadow:none!important;font-size:15px!important;font-weight:700!important;text-align:left;white-space:normal!important;line-height:1.3!important}
   .airModeRow .modeSwitch:hover{background:#f7f7f7!important}
   .airModeRow .modeDot{width:9px!important;height:9px!important;flex:0 0 9px}
   @media(max-width:520px){
    .airAccount{right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top))}
    .airAccountTrigger{min-width:72px;min-height:46px}
    .airAvatar{width:32px;height:32px}
    .airAccountMenu{position:fixed;left:12px;right:12px;top:max(64px,calc(env(safe-area-inset-top) + 54px));width:auto;max-width:none;border-radius:18px}
    .airMenuCurrent{padding:18px 20px 16px}
    .airMenuCurrentLabel{font-size:13px}
    .airMenuCurrent strong{font-size:20px}
    .airMenuItem,.airWorkspaceItem{min-height:64px;padding:14px 20px}
    .airMenuItemTitle,.airWorkspaceText strong{font-size:17px}
    .airMenuItemMain small,.airWorkspaceText small{font-size:14px}
    .airModeRow{padding:8px 10px 12px}
    .airModeRow .modeSwitch{min-height:60px;font-size:16px!important;padding:14px 16px!important}
   }
  `}</style>
 </>;
}
