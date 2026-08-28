'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { apiFetch, invalidateProfileCache } from '../lib/apiClient';
import { clearSelectedWorkspace, readSelectedWorkspace, subscribeToSelectedWorkspace } from '../lib/workspaceSelection';
import type { PortalRole } from '../lib/roleAccess';

type MenuItem={href:string;label:string};
type MenuSection={title:string;items:MenuItem[]};
type RoleMenu={label:string;roleLabel:string;home:string;secondary?:MenuItem;sections:MenuSection[]};

const menus:Record<PortalRole,RoleMenu>={
 admin:{label:'Admin',roleLabel:'System Administrator',home:'/admin',secondary:{href:'/admin/reports',label:'Reports'},sections:[
  {title:'Account & Settings',items:[{href:'/profile',label:'My Profile'},{href:'/notifications',label:'Notifications'},{href:'/admin/settings',label:'Settings'}]},
  {title:'Management & Operations',items:[{href:'/admin/requests',label:'Request Management'},{href:'/admin/escalations',label:'Attention / Escalations'},{href:'/admin/service-categories',label:'Service Categories'},{href:'/admin/locations',label:'Locations'},{href:'/admin/users',label:'User Management'}]},
  {title:'System & Analytics',items:[{href:'/admin/reports',label:'Reports'},{href:'/admin/audit-logs',label:'Audit Logs'}]},
 ]},
 provider:{label:'Provider',roleLabel:'Service Provider',home:'/provider/today',secondary:{href:'/provider/availability',label:'Location'},sections:[
  {title:'Account & Settings',items:[{href:'/profile',label:'My Profile'},{href:'/notifications',label:'Notifications'}]},
  {title:'Work & Field Operations',items:[{href:'/provider/jobs',label:'My Jobs'},{href:'/provider/calendar',label:'Schedule'},{href:'/provider/services',label:'Services Provided'}]},
  {title:'Communication & Location',items:[{href:'/provider/messages',label:'Messages'},{href:'/provider/availability',label:'Location'}]},
 ]},
 customer:{label:'Customer',roleLabel:'Customer',home:'/home',secondary:{href:'/messages',label:'Messages'},sections:[
  {title:'Account & Settings',items:[{href:'/profile',label:'My Profile'},{href:'/notifications',label:'Notifications'}]},
  {title:'My Activity',items:[{href:'/requests',label:'Service Requests'},{href:'/messages',label:'Messages'}]},
  {title:'Provider',items:[{href:'/provider/onboarding',label:'Become a Provider'}]},
 ]},
};

function getServerWorkspace(){return null;}
function isPublicOrAuth(path:string){return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');}
function itemIsActive(path:string,href:string){if(href==='/admin/users')return path.startsWith('/admin/users')||path.startsWith('/admin/providers');return path===href||path.startsWith(`${href}/`);}

export default function GlobalRoleMenuSSOT(){
 const path=usePathname()||'/';
 const workspace=useSyncExternalStore(subscribeToSelectedWorkspace,readSelectedWorkspace,getServerWorkspace)??'customer';
 const[open,setOpen]=useState(false);
 const[userName,setUserName]=useState('User');
 const[loggingOut,setLoggingOut]=useState(false);

 useEffect(()=>{
  if(isPublicOrAuth(path)){setOpen(false);return;}
  let active=true;
  void(async()=>{
   try{
    const response=await apiFetch('/api/user/profile',{cache:'no-store'});
    if(!active||!response.ok)return;
    const payload=await response.json().catch(()=>({}));
    const profile=payload?.profile||{};
    setUserName(String(profile?.full_name||profile?.name||profile?.phone||'User'));
   }catch{}
  })();
  setOpen(false);
  return()=>{active=false;};
 },[path]);

 useEffect(()=>{
  if(!open)return;
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',onKey);};
 },[open]);

 async function signOut(){
  if(loggingOut)return;
  setLoggingOut(true);
  setOpen(false);
  invalidateProfileCache();
  try{
   await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>null);
   await supabase.auth.signOut().catch(()=>null);
   clearSelectedWorkspace();
   try{localStorage.removeItem('fixit:account-role');sessionStorage.removeItem('fixit:mobile-access');sessionStorage.removeItem('fixit:mode-toast');}catch{}
  }finally{
   window.location.replace('/login');
  }
 }

 if(isPublicOrAuth(path))return null;
 const menu=menus[workspace];

 return <>
  <div className="ssotMenuHeader">
   <Link href={menu.home} className="ssotBrand" onClick={()=>setOpen(false)}><b>F</b><span>FixIt</span></Link>
   <div className="ssotHeaderActions">
    {menu.secondary?<Link href={menu.secondary.href} className="ssotSecondary">{menu.secondary.label}</Link>:null}
    <button type="button" className="ssotMenuButton" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-haspopup="dialog" aria-label={open?'Close menu':'Open menu'}>{open?'×':'☰'}</button>
   </div>
  </div>
  {open?<div className="ssotBackdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)setOpen(false);}}>
   <section className="ssotMenu" role="dialog" aria-modal="true" aria-label={`${menu.label} menu`}>
    <header className="ssotMenuHead"><div><small>{menu.roleLabel}</small><h2>{userName}</h2></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close menu">×</button></header>
    <div className="ssotMenuScroll">
     {menu.sections.map(section=><section key={section.title} className="ssotSection"><h3>{section.title}</h3>{section.items.map(item=><Link key={item.href} href={item.href} className={itemIsActive(path,item.href)?'active':''} onClick={()=>setOpen(false)}>{item.label}<span aria-hidden="true">›</span></Link>)}</section>)}
    </div>
    <footer className="ssotMenuFooter"><button type="button" disabled={loggingOut} onClick={()=>void signOut()}>{loggingOut?'Signing out…':'Sign Out'}</button></footer>
   </section>
  </div>:null}
  <style jsx global>{`
   .ssotMenuHeader{position:fixed;left:0;right:0;top:0;z-index:1900;min-height:64px;padding:max(10px,env(safe-area-inset-top)) 16px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.96);border-bottom:1px solid #e5e7eb;backdrop-filter:blur(18px)}
   .ssotBrand{display:inline-flex;align-items:center;gap:9px;color:#111827;text-decoration:none;font-weight:900}.ssotBrand b{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:#2563eb;color:#fff}.ssotHeaderActions{display:flex;align-items:center;gap:8px}.ssotSecondary{padding:9px 11px;border-radius:10px;color:#2563eb;text-decoration:none;font-size:13px;font-weight:800}.ssotMenuButton{width:42px;height:42px;border:1px solid #d1d5db;border-radius:13px;background:#fff;color:#111827;font-size:23px;line-height:1}
   .ssotBackdrop{position:fixed;inset:0;z-index:2100;display:flex;justify-content:center;align-items:center;padding:16px;background:rgba(15,23,42,.3);backdrop-filter:blur(4px)}.ssotMenu{width:min(448px,100%);max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;background:#f8fafc;box-shadow:0 30px 80px rgba(15,23,42,.24)}
   .ssotMenuHead{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px;background:#fff;border-bottom:1px solid #eef2f7}.ssotMenuHead small{display:block;color:#64748b;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.ssotMenuHead h2{margin:4px 0 0;color:#0f172a;font-size:20px}.ssotMenuHead button{width:38px;height:38px;border:0;border-radius:12px;background:#f1f5f9;font-size:25px;color:#475569}.ssotMenuScroll{overflow:auto;padding:14px;display:grid;gap:12px}.ssotSection{overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#fff}.ssotSection h3{margin:0;padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.ssotSection a{min-height:48px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#334155;text-decoration:none;font-size:14px;font-weight:750}.ssotSection a+a{border-top:1px solid #f1f5f9}.ssotSection a.active{background:#eff6ff;color:#1d4ed8}.ssotSection a span{font-size:22px;color:#94a3b8}.ssotMenuFooter{padding:0 14px max(14px,env(safe-area-inset-bottom));background:#f8fafc}.ssotMenuFooter button{width:100%;min-height:50px;border:0;border-radius:15px;background:#dc2626;color:#fff;font-size:14px;font-weight:900}.ssotMenuFooter button:disabled{opacity:.6}
   @media(max-width:520px){.ssotBackdrop{align-items:flex-end;padding:0}.ssotMenu{width:100%;max-height:94dvh;border-radius:24px 24px 0 0}.ssotMenuHeader{padding-left:14px;padding-right:14px}}
  `}</style>
 </>;
}
