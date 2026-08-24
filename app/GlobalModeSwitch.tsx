'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/apiClient';
import { canAccessPortal, normalizeAccountRole, type AccountRole, type PortalRole } from '../lib/roleAccess';

type Mode=PortalRole;

function isHiddenRoute(path:string){
 return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');
}

function routeMode(path:string):Mode{
 if(path.startsWith('/admin'))return 'admin';
 if(path.startsWith('/provider')&&!path.startsWith('/provider/onboarding'))return 'provider';
 return 'customer';
}

function WorkspaceIcon({name}:{name:Mode}){
 const p={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
 if(name==='provider')return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>;
 if(name==='admin')return <svg {...p}><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></svg>;
 return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
}

export default function GlobalModeSwitch(){
 const path=usePathname();
 const[mode,setMode]=useState<Mode>(()=>routeMode(path));
 const[signedIn,setSignedIn]=useState(false);
 const[accountRole,setAccountRole]=useState<AccountRole>('CUSTOMER');
 const[open,setOpen]=useState(false);
 const[loggingOut,setLoggingOut]=useState(false);
 const wrapRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>{
  setMode(routeMode(path));
  setOpen(false);
  let active=true;

  // The secure server session/profile is authoritative. This avoids hiding the
  // menu simply because an older browser-only Supabase session is unavailable.
  void(async()=>{
   try{
    const response=await apiFetch('/api/user/profile',{cache:'no-store'});
    if(!active)return;
    if(response.status===401){setSignedIn(false);return;}
    if(!response.ok){setSignedIn(false);return;}
    const payload=await response.json().catch(()=>({}));
    setAccountRole(normalizeAccountRole(payload?.profile?.role));
    setSignedIn(true);
   }catch{
    if(active)setSignedIn(false);
   }
  })();

  const{data:listener}=supabase.auth.onAuthStateChange((event)=>{
   if(active&&event==='SIGNED_OUT')setSignedIn(false);
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
 const canUseProvider=canAccessPortal(accountRole,'provider');
 const canUseAdmin=canAccessPortal(accountRole,'admin');

 function rememberWorkspace(next:Mode,message?:string){
  if(!canAccessPortal(accountRole,next))return;
  try{
   localStorage.setItem('fixit:mobile-nav-role',next);
   localStorage.setItem('fixit:app-mode',next);
   if(message)sessionStorage.setItem('fixit:mode-toast',message);
  }catch{}
  setOpen(false);
 }

 async function signOut(){
  if(loggingOut)return;
  setLoggingOut(true);
  try{
   setOpen(false);
   try{
    localStorage.removeItem('fixit:mobile-nav-role');
    localStorage.removeItem('fixit:app-mode');
    localStorage.removeItem('fixit:account-role');
    sessionStorage.removeItem('fixit:mode-toast');
   }catch{}
   await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>null);
   await supabase.auth.signOut().catch(()=>null);
   window.location.assign('/login');
  }finally{
   setLoggingOut(false);
  }
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
    <span className="airMenuIcon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span>
    <span className="airAvatar" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>
   </button>

   {open?<div className="airAccountMenu" role="menu" aria-label="Account and workspace menu">
    <div className="airMenuStatusPill"><span aria-hidden="true"/>Secure account</div>
    <div className="airMenuIntro"><h2>Welcome</h2><p>Open a workspace available to your account.</p></div>

    <section className="airWorkspaceChooser" aria-label="Choose workspace">
     <div className="airWorkspaceHead"><span>Open workspace</span><small>Only portals allowed for your account role are shown</small></div>

     {canUseProvider?<Link
      className={`airWorkspaceOption provider${mode==='provider'?' selected':''}`}
      href="/provider/today"
      role="menuitem"
      onClick={()=>rememberWorkspace('provider',"You're now viewing as Service Provider.")}
     >
      <span className="airWorkspaceIcon"><WorkspaceIcon name="provider"/></span>
      <span className="airWorkspaceCopy"><strong>Service Provider Portal</strong><small>Manage jobs, services and availability</small></span>
      <span className="airWorkspaceAction">{mode==='provider'?'Current':'Open'}</span>
     </Link>:null}

     <Link
      className={`airWorkspaceOption customer${mode==='customer'?' selected':''}`}
      href="/home"
      role="menuitem"
      onClick={()=>rememberWorkspace('customer',"You're now viewing as Customer.")}
     >
      <span className="airWorkspaceIcon"><WorkspaceIcon name="customer"/></span>
      <span className="airWorkspaceCopy"><strong>Customer Portal</strong><small>Request services and track your requests</small></span>
      <span className="airWorkspaceAction">{mode==='customer'?'Current':'Open'}</span>
     </Link>

     {canUseAdmin?<Link
      className={`airWorkspaceOption admin${mode==='admin'?' selected':''}`}
      href="/admin"
      role="menuitem"
      onClick={()=>rememberWorkspace('admin',"You're now viewing as Admin.")}
     >
      <span className="airWorkspaceIcon"><WorkspaceIcon name="admin"/></span>
      <span className="airWorkspaceCopy"><strong>Admin Portal</strong><small>System administration and platform controls</small></span>
      <span className="airWorkspaceAction">{mode==='admin'?'Current':'Open'}</span>
     </Link>:null}
    </section>

    <div className="airAccountActions">
     <Link className="airProfileAction" href={profileHref} role="menuitem" onClick={()=>setOpen(false)}>
      <span className="airActionIcon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>
      <span className="airActionCopy"><strong>Profile & Account</strong><small>View and manage your account</small></span>
      <span className="airActionArrow" aria-hidden="true">›</span>
     </Link>

     <button type="button" className="airLogoutAction" role="menuitem" onClick={()=>void signOut()} disabled={loggingOut}>
      <span className="airActionIcon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg></span>
      <span className="airActionCopy"><strong>{loggingOut?'Logging out…':'Logout'}</strong><small>Sign out of this account</small></span>
     </button>
    </div>
   </div>:null}
  </div>

  <style jsx global>{`
   .airAccount{position:fixed;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));z-index:950}
   .airAccountTrigger{display:inline-flex;align-items:center;gap:10px;min-width:76px;min-height:46px;padding:5px 6px 5px 13px;border:1px solid #d8d8d8;border-radius:999px;background:#fff;color:#222;box-shadow:0 2px 5px rgba(0,0,0,.08);cursor:pointer;transition:box-shadow .16s ease,transform .16s ease}
   .airAccountTrigger:hover{box-shadow:0 3px 12px rgba(0,0,0,.16)}.airAccountTrigger:active{transform:scale(.98)}
   .airMenuIcon{display:grid;place-items:center;color:#222}.airAvatar{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#717171;color:#fff}
   .airAccountMenu{position:absolute;right:0;top:56px;width:min(430px,calc(100vw - 24px));padding:20px;border:1px solid rgba(226,232,240,.95);border-radius:28px;background:rgba(255,255,255,.98);box-shadow:0 24px 60px rgba(15,23,42,.14),0 2px 8px rgba(15,23,42,.05);backdrop-filter:blur(18px)}
   .airMenuStatusPill{width:max-content;max-width:100%;display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:10px;font-weight:850;letter-spacing:.9px;text-transform:uppercase}.airMenuStatusPill>span{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}
   .airMenuIntro{margin:17px 0 18px}.airMenuIntro h2{margin:0;color:#0f172a;font-size:30px;line-height:1.08;letter-spacing:-1px;font-weight:850}.airMenuIntro p{margin:8px 0 0;color:#64748b;font-size:14px;line-height:1.5}
   .airWorkspaceChooser{display:grid;gap:8px;padding:10px;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.04)}
   .airWorkspaceHead{padding:2px 4px 5px}.airWorkspaceHead span{display:block;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:.85px;text-transform:uppercase}.airWorkspaceHead small{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:600;line-height:1.35}
   .airWorkspaceOption{width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:62px;padding:10px;border:1px solid transparent;border-radius:16px;background:#fff;color:inherit;text-decoration:none;text-align:left;font:inherit;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}.airWorkspaceOption:hover{background:#f8fafc}.airWorkspaceOption:active{transform:scale(.995)}
   .airWorkspaceIcon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center}.airWorkspaceIcon svg{width:18px;height:18px}.airWorkspaceCopy{min-width:0}.airWorkspaceCopy strong{display:block;color:#1e293b;font-size:13px;font-weight:850}.airWorkspaceCopy small{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:550;line-height:1.3}.airWorkspaceAction{padding:5px 8px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;color:#64748b;font-size:10px;font-weight:850;white-space:nowrap}
   .airWorkspaceOption.provider .airWorkspaceIcon{background:#fffbeb;border:1px solid #fde68a;color:#d97706}.airWorkspaceOption.customer .airWorkspaceIcon{background:#faf5ff;border:1px solid #e9d5ff;color:#9333ea}.airWorkspaceOption.admin .airWorkspaceIcon{background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb}
   .airWorkspaceOption.provider.selected{border-color:#fcd34d;background:#fffdf5}.airWorkspaceOption.provider.selected .airWorkspaceAction{border-color:#fde68a;background:#fffbeb;color:#b45309}.airWorkspaceOption.customer.selected{border-color:#d8b4fe;background:#fdfaff}.airWorkspaceOption.customer.selected .airWorkspaceAction{border-color:#e9d5ff;background:#faf5ff;color:#7e22ce}.airWorkspaceOption.admin.selected{border-color:#93c5fd;background:#f7fbff}.airWorkspaceOption.admin.selected .airWorkspaceAction{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}
   .airAccountActions{display:grid;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0}.airProfileAction,.airLogoutAction{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:58px;padding:9px 10px;border:0;border-radius:16px;background:#fff;color:inherit;text-decoration:none;text-align:left;font:inherit;cursor:pointer}.airProfileAction:hover,.airLogoutAction:hover{background:#f8fafc}.airLogoutAction{grid-template-columns:38px minmax(0,1fr)}.airLogoutAction:disabled{opacity:.55;cursor:default}.airActionIcon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#f8fafc;border:1px solid #e2e8f0;color:#475569}.airActionIcon svg{width:18px;height:18px}.airActionCopy{min-width:0}.airActionCopy strong{display:block;color:#1e293b;font-size:13px;font-weight:850}.airActionCopy small{display:block;margin-top:3px;color:#64748b;font-size:11px;line-height:1.3}.airActionArrow{color:#94a3b8;font-size:22px}
   @media(max-width:520px){.airAccount{right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top))}.airAccountMenu{position:fixed;left:12px;right:12px;top:max(64px,calc(env(safe-area-inset-top) + 54px));bottom:auto;width:auto;max-height:calc(100dvh - 76px);overflow:auto;padding:17px;border-radius:24px}.airMenuIntro h2{font-size:28px}.airWorkspaceOption{grid-template-columns:38px minmax(0,1fr) auto;padding:9px 8px}.airWorkspaceCopy small{font-size:10.5px}}
   @media(max-width:380px){.airWorkspaceOption{grid-template-columns:38px minmax(0,1fr)}.airWorkspaceAction{grid-column:2;justify-self:start;margin-top:-2px}.airAccountMenu{left:8px;right:8px}}
  `}</style>
 </>;
}
