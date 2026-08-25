'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';
import { canAccessPortal, normalizeAccountRole, type AccountRole, type PortalRole } from '../lib/roleAccess';

const hiddenPrefixes=['/admin','/provider','/login','/register','/auth','/api'];

type IconName='home'|'requests'|'new'|'switch'|'profile'|'customer'|'provider'|'admin';
type CachedAccess={role:AccountRole;providerApproved:boolean};

function Icon({name}:{name:IconName}){
 const paths={
  home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></>,
  requests:<><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  new:<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
  switch:<><path d="M7 7h11"/><path d="m15 4 3 3-3 3"/><path d="M17 17H6"/><path d="m9 14-3 3 3 3"/></>,
  profile:<><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.9-4 3.5-6 7.5-6s6.6 2 7.5 6"/></>,
  customer:<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 20V10"/></>,
  provider:<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>,
  admin:<><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function IOSWebAppShell(){
 const pathname=usePathname()||'/';
 const router=useRouter();
 const [standalone,setStandalone]=useState(false);
 const [switchOpen,setSwitchOpen]=useState(false);
 const [accountRole,setAccountRole]=useState<AccountRole>('CUSTOMER');
 const [providerApproved,setProviderApproved]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const hidden=hiddenPrefixes.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));

 useEffect(()=>{
  const iosStandalone=(window.navigator as Navigator & {standalone?:boolean}).standalone===true;
  const media=window.matchMedia?.('(display-mode: standalone)').matches===true;
  setStandalone(iosStandalone||media);
  document.documentElement.classList.toggle('ifix-ios-standalone',iosStandalone||media);
  return()=>document.documentElement.classList.remove('ifix-ios-standalone');
 },[]);

 useEffect(()=>{
  document.documentElement.classList.toggle('ifix-customer-tabbar',!hidden);
  return()=>document.documentElement.classList.remove('ifix-customer-tabbar');
 },[hidden]);

 useEffect(()=>{setSwitchOpen(false);},[pathname]);

 useEffect(()=>{
  let active=true;
  try{
   const raw=sessionStorage.getItem('fixit:mobile-access');
   if(raw){
    const cached=JSON.parse(raw) as CachedAccess;
    if(cached?.role){
     setAccountRole(normalizeAccountRole(cached.role));
     setProviderApproved(Boolean(cached.providerApproved));
     setSignedIn(true);
    }
   }
  }catch{}

  void(async()=>{
   try{
    const response=await apiFetch('/api/user/profile',{cache:'no-store'});
    if(!active)return;
    if(!response.ok){setSignedIn(false);return;}
    const payload=await response.json().catch(()=>({}));
    const role=normalizeAccountRole(payload?.profile?.role);
    const approved=Boolean(payload?.profile?.provider_approved);
    setAccountRole(role);
    setProviderApproved(approved);
    setSignedIn(true);
    try{sessionStorage.setItem('fixit:mobile-access',JSON.stringify({role,providerApproved:approved} satisfies CachedAccess));}catch{}
   }catch{}
  })();
  return()=>{active=false;};
 },[]);

 useEffect(()=>{
  if(!switchOpen)return;
  function onKeyDown(event:KeyboardEvent){if(event.key==='Escape')setSwitchOpen(false);}
  document.addEventListener('keydown',onKeyDown);
  return()=>document.removeEventListener('keydown',onKeyDown);
 },[switchOpen]);

 if(hidden)return null;

 const active=(key:string)=>key==='home'?pathname==='/'||pathname==='/home':key==='requests'?pathname.startsWith('/requests'):key==='profile'?pathname.startsWith('/profile'):false;
 const canUseProvider=signedIn&&canAccessPortal(accountRole,'provider',providerApproved);
 const canUseAdmin=signedIn&&canAccessPortal(accountRole,'admin',providerApproved);
 const hasWorkspaceSwitch=canUseProvider||canUseAdmin;

 function openWorkspace(next:PortalRole){
  if(!canAccessPortal(accountRole,next,providerApproved))return;
  try{
   localStorage.setItem('fixit:mobile-nav-role',next);
   localStorage.setItem('fixit:app-mode',next);
   const label=next==='provider'?'Service Provider':next==='admin'?'Admin':'Customer';
   sessionStorage.setItem('fixit:mode-toast',`You're now viewing as ${label}.`);
  }catch{}
  setSwitchOpen(false);
  router.push(next==='provider'?'/provider/today':next==='admin'?'/admin':'/home');
 }

 return <>
  {switchOpen?<div className="iosWorkspaceOverlay" role="presentation" onClick={()=>setSwitchOpen(false)}>
   <section className="iosWorkspaceSheet" role="dialog" aria-modal="true" aria-label="Switch workspace" onClick={event=>event.stopPropagation()}>
    <div className="iosWorkspaceHandle" aria-hidden="true"/>
    <div className="iosWorkspaceHead"><div><small>Workspace</small><h2>Switch view</h2></div><button type="button" onClick={()=>setSwitchOpen(false)} aria-label="Close workspace switch">×</button></div>
    <div className="iosWorkspaceOptions">
     <button type="button" className="selected" onClick={()=>openWorkspace('customer')}><span className="iosWorkspaceIcon"><Icon name="customer"/></span><span><strong>Customer</strong><small>Request and track services</small></span><b>Current</b></button>
     {canUseProvider?<button type="button" onClick={()=>openWorkspace('provider')}><span className="iosWorkspaceIcon"><Icon name="provider"/></span><span><strong>Service Provider</strong><small>Jobs, services and availability</small></span><b>Open</b></button>:null}
     {canUseAdmin?<button type="button" onClick={()=>openWorkspace('admin')}><span className="iosWorkspaceIcon"><Icon name="admin"/></span><span><strong>Admin</strong><small>Platform administration</small></span><b>Open</b></button>:null}
    </div>
   </section>
  </div>:null}

  <nav className={`iosTabBar${hasWorkspaceSwitch?' hasWorkspaceSwitch':''}`} aria-label="Customer app navigation" data-standalone={standalone?'true':'false'}>
   <Link href="/" className={active('home')?'active':''}><Icon name="home"/><span>Home</span></Link>
   <Link href="/requests" className={active('requests')?'active':''}><Icon name="requests"/><span>Requests</span></Link>
   <Link href="/?new=1" className="iosTabNew"><Icon name="new"/><span>New</span></Link>
   {hasWorkspaceSwitch?<button type="button" className={`workspaceAvailable${switchOpen?' active':''}`} onClick={()=>setSwitchOpen(true)} aria-haspopup="dialog" aria-expanded={switchOpen} aria-label="Switch workspace"><Icon name="switch"/><span>Switch</span></button>:null}
   <Link href="/profile" className={active('profile')?'active':''}><Icon name="profile"/><span>Profile</span></Link>
  </nav>
 </>;
}
