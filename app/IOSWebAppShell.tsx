'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';
import { canAccessPortal, normalizeAccountRole, type AccountRole, type PortalRole } from '../lib/roleAccess';

const hiddenPrefixes=['/api'];

type IconName='home'|'requests'|'new'|'switch'|'profile'|'customer'|'provider'|'admin'|'jobs'|'services'|'users';
type CachedAccess={role:AccountRole;providerApproved:boolean};
type WorkspaceRole='customer'|'provider'|'admin';
type Tab={href:string;label:string;icon:IconName;match:(path:string)=>boolean;accent?:boolean};

function Icon({name}:{name:IconName}){
 const paths={
  home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></>,
  requests:<><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  new:<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
  switch:<><path d="M7 7h11"/><path d="m15 4 3 3-3 3"/><path d="M17 17H6"/><path d="m9 14-3 3 3 3"/></>,
  profile:<><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.9-4 3.5-6 7.5-6s6.6 2 7.5 6"/></>,
  customer:<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 20V10"/></>,
  provider:<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>,
  admin:<><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
  jobs:<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M9 5V3h6v2M4 10h16M9 14h6"/></>,
  services:<><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-3 3-3-3 3-3Z"/></>,
  users:<><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-1.5a4 4 0 0 0-3-3.87M16 3.2a4 4 0 0 1 0 7.6"/></>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function workspaceForPath(path:string):WorkspaceRole{
 if(path==='/provider/onboarding'||path.startsWith('/provider/onboarding/'))return 'customer';
 if(path.startsWith('/admin'))return 'admin';
 if(path.startsWith('/provider'))return 'provider';
 return 'customer';
}

function tabsFor(role:WorkspaceRole):Tab[]{
 if(role==='provider')return [
  {href:'/provider/today',label:'Today',icon:'home',match:p=>p==='/provider'||p.startsWith('/provider/today')},
  {href:'/provider/jobs',label:'Jobs',icon:'jobs',match:p=>p.startsWith('/provider/jobs')},
  {href:'/provider/services',label:'Services',icon:'services',match:p=>p.startsWith('/provider/services')},
  {href:'/provider/profile',label:'Profile',icon:'profile',match:p=>p.startsWith('/provider/profile')},
 ];
 if(role==='admin')return [
  {href:'/admin',label:'Overview',icon:'admin',match:p=>p==='/admin'},
  {href:'/admin/requests',label:'Requests',icon:'requests',match:p=>p.startsWith('/admin/requests')},
  {href:'/admin/users',label:'Users',icon:'users',match:p=>p.startsWith('/admin/users')||p.startsWith('/admin/providers')},
  {href:'/profile',label:'Profile',icon:'profile',match:p=>p==='/profile'||p.startsWith('/profile/')},
 ];
 return [
  {href:'/home',label:'Home',icon:'home',match:p=>p==='/'||p==='/home'},
  {href:'/requests',label:'Requests',icon:'requests',match:p=>p.startsWith('/requests')},
  {href:'/home?new=1',label:'New',icon:'new',match:()=>false,accent:true},
  {href:'/profile',label:'Profile',icon:'profile',match:p=>p.startsWith('/profile')},
 ];
}

export default function IOSWebAppShell(){
 const pathname=usePathname()||'/';
 const router=useRouter();
 const [standalone,setStandalone]=useState(false);
 const [switchOpen,setSwitchOpen]=useState(false);
 const [accountRole,setAccountRole]=useState<AccountRole>('CUSTOMER');
 const [providerApproved,setProviderApproved]=useState(false);
 const [signedIn,setSignedIn]=useState(true);
 const hidden=hiddenPrefixes.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));
 const workspace=workspaceForPath(pathname);

 useEffect(()=>{
  const iosStandalone=(window.navigator as Navigator & {standalone?:boolean}).standalone===true;
  const media=window.matchMedia?.('(display-mode: standalone)').matches===true;
  setStandalone(iosStandalone||media);
  document.documentElement.classList.toggle('ifix-ios-standalone',iosStandalone||media);
  return()=>document.documentElement.classList.remove('ifix-ios-standalone');
 },[]);

 useEffect(()=>{
  document.documentElement.classList.toggle('ifix-customer-tabbar',!hidden&&workspace==='customer');
  return()=>document.documentElement.classList.remove('ifix-customer-tabbar');
 },[hidden,workspace]);

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
    if(!response.ok){
     if(response.status===401)setSignedIn(false);
     return;
    }
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

 const canUseProvider=signedIn&&canAccessPortal(accountRole,'provider',providerApproved);
 const canUseAdmin=signedIn&&canAccessPortal(accountRole,'admin',providerApproved);
 const hasWorkspaceSwitch=canUseProvider||canUseAdmin;
 const tabs=tabsFor(workspace);

 function openWorkspace(next:PortalRole){
  if(!signedIn||!canAccessPortal(accountRole,next,providerApproved))return;
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
     <button type="button" className={workspace==='customer'?'selected':''} onClick={()=>openWorkspace('customer')}><span className="iosWorkspaceIcon"><Icon name="customer"/></span><span><strong>Customer</strong><small>Request and track services</small></span><b>{workspace==='customer'?'Current':'Open'}</b></button>
     {canUseProvider?<button type="button" className={workspace==='provider'?'selected':''} onClick={()=>openWorkspace('provider')}><span className="iosWorkspaceIcon"><Icon name="provider"/></span><span><strong>Service Provider</strong><small>Jobs, services and availability</small></span><b>{workspace==='provider'?'Current':'Open'}</b></button>:null}
     {canUseAdmin?<button type="button" className={workspace==='admin'?'selected':''} onClick={()=>openWorkspace('admin')}><span className="iosWorkspaceIcon"><Icon name="admin"/></span><span><strong>Admin</strong><small>Platform administration</small></span><b>{workspace==='admin'?'Current':'Open'}</b></button>:null}
    </div>
   </section>
  </div>:null}

  <nav className={`iosTabBar${hasWorkspaceSwitch?' hasWorkspaceSwitch':''}`} aria-label={`${workspace} app navigation`} data-standalone={standalone?'true':'false'} data-workspace={workspace}>
   {tabs.map(tab=><Link key={tab.href+tab.label} href={tab.href} className={`${tab.match(pathname)?'active ':''}${tab.accent?'iosTabNew':''}`.trim()}><Icon name={tab.icon}/><span>{tab.label}</span></Link>)}
   {hasWorkspaceSwitch?<button type="button" className={`workspaceAvailable${switchOpen?' active':''}`} onClick={()=>setSwitchOpen(true)} aria-haspopup="dialog" aria-expanded={switchOpen} aria-label="Switch workspace"><Icon name="switch"/><span>Switch</span></button>:null}
  </nav>
 </>;
}
