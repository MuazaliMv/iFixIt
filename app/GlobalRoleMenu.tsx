'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import DispatchLivePanel from './DispatchLivePanel';

type Role='customer'|'provider'|'admin';
type MenuItem={href:string;label:string};
type RoleMenu={label:string;secondary:{href:string;label:string};items:MenuItem[]};
type AdminIcon='key'|'bell'|'requests'|'alert'|'location'|'users'|'reports'|'settings'|'audit';
type AdminItem={href:string;label:string;icon:AdminIcon;badge?:number};
type AdminSection={title:string;items:AdminItem[]};

const menus:Record<Role,RoleMenu>={
  customer:{label:'Customer',secondary:{href:'/messages',label:'Messages'},items:[{href:'/profile',label:'My Profile'},{href:'/change-password',label:'Change Password'},{href:'/notifications',label:'Notifications'},{href:'/requests',label:'Service Requests'},{href:'/messages',label:'Messages'}]},
  provider:{label:'Provider',secondary:{href:'/provider/availability',label:'Availability'},items:[{href:'/provider/profile',label:'My Profile'},{href:'/change-password',label:'Change Password'},{href:'/notifications',label:'Notifications'},{href:'/provider/jobs',label:'My Jobs'},{href:'/provider/calendar',label:'Schedule'},{href:'/provider/messages',label:'Messages'},{href:'/provider/availability',label:'Location'},{href:'/provider/services',label:'Services Provided'}]},
  admin:{label:'Admin',secondary:{href:'/admin/reports',label:'Reports'},items:[{href:'/profile',label:'My Profile'},{href:'/change-password',label:'Change Password'},{href:'/notifications',label:'Notifications'},{href:'/admin/requests',label:'Request Management'},{href:'/admin/escalations',label:'Attention / Escalations'},{href:'/admin/users',label:'User Management'},{href:'/admin/locations',label:'Locations'},{href:'/admin/reports',label:'Reports'},{href:'/admin/settings',label:'Settings'},{href:'/admin/audit-logs',label:'Audit Logs'}]},
};

const adminSections:AdminSection[]=[
  {title:'ACCOUNT & PREFERENCES',items:[
    {href:'/change-password',label:'Change Password',icon:'key'},
    {href:'/notifications',label:'Notifications',icon:'bell'},
  ]},
  {title:'OPERATIONS',items:[
    {href:'/admin/requests',label:'Request Management',icon:'requests'},
    {href:'/admin/escalations',label:'Attention / Escalations',icon:'alert',badge:3},
    {href:'/admin/locations',label:'Locations',icon:'location'},
  ]},
  {title:'ADMINISTRATION & SYSTEM',items:[
    {href:'/admin/users',label:'User Management',icon:'users'},
    {href:'/admin/reports',label:'Reports',icon:'reports'},
    {href:'/admin/settings',label:'Settings',icon:'settings'},
    {href:'/admin/audit-logs',label:'Audit Logs',icon:'audit'},
  ]},
];

function routeRole(path:string):Role|null{if(path.startsWith('/admin'))return 'admin';if(path.startsWith('/provider'))return 'provider';return null;}
function isPublicOrAuth(path:string){return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');}
function itemIsActive(path:string,href:string){if(href==='/')return path==='/';if(href==='/admin/users')return path.startsWith('/admin/users')||path.startsWith('/admin/providers')||path.startsWith('/admin/services');if(href.includes('#'))return false;return path===href||path.startsWith(href+'/');}

function AdminMenuIcon({name}:{name:AdminIcon}){
  const common={width:21,height:21,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
  if(name==='key')return <svg {...common}><circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 9-9m-2 2 2 2m-5 1 2 2"/></svg>;
  if(name==='bell')return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if(name==='requests')return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if(name==='alert')return <svg {...common}><path d="M10.3 3.2 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>;
  if(name==='location')return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if(name==='users')return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if(name==='reports')return <svg {...common}><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></svg>;
  if(name==='settings')return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.03-1.56V3h4v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.03H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>;
  return <svg {...common}><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
}

function LogoutIcon(){return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>}
function Chevron(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>}

export default function GlobalRoleMenu(){
  const path=usePathname();
  const[role,setRole]=useState<Role|null>(routeRole(path));
  const[open,setOpen]=useState(false);
  const[userName,setUserName]=useState('John Doe');
  const[userRoleLabel,setUserRoleLabel]=useState('System Administrator');

  useEffect(()=>{let active=true;async function resolve(){const byRoute=routeRole(path);if(isPublicOrAuth(path)){if(active)setRole(null);return;}try{const{data}=await supabase.auth.getSession();if(!data.session){if(active)setRole(byRoute);return;}const r=await fetch('/api/user/profile',{headers:{Authorization:`Bearer ${data.session.access_token}`}});if(!r.ok){if(active)setRole(byRoute);return;}const p=await r.json();const raw=String(p?.profile?.role||'CUSTOMER').toUpperCase();const resolved:Role=byRoute|| (raw==='ADMIN'?'admin':raw==='PROVIDER'?'provider':'customer');if(raw==='PROVIDER'&&path==='/profile'){window.location.replace('/provider/profile');return;}if(active){setRole(resolved);setUserName(String(p?.profile?.full_name||data.session.user.user_metadata?.full_name||data.session.user.email?.split('@')[0]||'User'));setUserRoleLabel(raw==='ADMIN'?'System Administrator':raw==='PROVIDER'?'Service Provider':'Customer');}}catch{if(active)setRole(byRoute);}}void resolve();setOpen(false);return()=>{active=false;};},[path]);
  useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',onKey);};},[open]);
  async function signOut(){setOpen(false);await supabase.auth.signOut();window.location.href='/login';}
  if(!role)return null;const menu=menus[role];

  const adminSheet=role==='admin'&&open?<div className="globalMenuBackdrop fixitMenuBackdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false);}}>
    <section className="fixitAdminMenu" role="dialog" aria-modal="true" aria-label="Admin menu">
      <button className="fixitMenuLogoutIcon" type="button" aria-label="Sign out" onClick={()=>void signOut()}><LogoutIcon/></button>
      <div className="fixitMenuIdentity">
        <Link href="/admin" className="fixitMenuLogo" onClick={()=>setOpen(false)}>F</Link>
        <strong>{userName}</strong>
        <span>{userRoleLabel}</span>
      </div>
      <div className="fixitMenuGroups">
        {adminSections.map(section=><section key={section.title} className="fixitMenuSection">
          <h2>{section.title}</h2>
          <div className="fixitMenuCard">
            {section.items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className={`fixitMenuRow${itemIsActive(path,item.href)?' active':''}`}>
              <span className="fixitMenuRowIcon"><AdminMenuIcon name={item.icon}/></span>
              <span className="fixitMenuRowLabel">{item.label}</span>
              {item.badge?<span className="fixitMenuBadge">{item.badge}</span>:null}
              <span className="fixitMenuChevron"><Chevron/></span>
            </Link>)}
          </div>
        </section>)}
      </div>
      <div className="fixitSignOutCard"><button className="fixitSignOutButton" type="button" onClick={()=>void signOut()}><LogoutIcon/>Sign Out</button></div>
    </section>
  </div>:null;

  const standardSheet=role!=='admin'&&open?<div className="globalMenuBackdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false);}}><section className="globalMenuSheet" role="dialog" aria-modal="true" aria-label={`${menu.label} menu`}><div className="globalMenuSheetTop"><Link href={role==='provider'?'/provider/jobs':'/'} className="globalMenuBrand" onClick={()=>setOpen(false)}><span className="globalMenuBrandMark">F</span><span>FixIt</span></Link><button className="globalMenuToggle" type="button" aria-label="Close menu" onClick={()=>setOpen(false)}><span className="globalMenuClose">×</span></button></div><div className="globalMenuDivider"/><div className="globalMenuRoleLabel">{menu.label}</div><nav className="globalMenuFlatList" aria-label={`${menu.label} sections`}>{menu.items.map(item=><Link key={item.href+item.label} href={item.href} onClick={()=>setOpen(false)} className={itemIsActive(path,item.href)?'active':undefined}>{item.label}<span>→</span></Link>)}</nav><div className="globalMenuFooter"><button className="globalMenuSignOut" type="button" onClick={()=>void signOut()}>Sign Out</button></div></section></div>:null;

  return <>
    {role==='customer'&&path.startsWith('/requests/')?<DispatchLivePanel/>:null}
    <div className="globalMenuHeaderWrap"><header className="globalMenuHeader" aria-label={`${menu.label} navigation`}><Link href={role==='admin'?'/admin':role==='provider'?'/provider/jobs':'/'} className="globalMenuBrand" onClick={()=>setOpen(false)}><span className="globalMenuBrandMark">F</span><span>FixIt</span></Link><div className="globalMenuHeaderActions"><Link className="globalMenuSecondary" href={menu.secondary.href}>{menu.secondary.label}</Link><button className="globalMenuToggle" type="button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<span className="globalMenuClose">×</span>:<span className="globalMenuBars"><i/><i/><i/></span>}</button></div></header></div>
    {adminSheet}{standardSheet}
    <style jsx global>{`
      .fixitMenuBackdrop{padding:0;background:rgba(15,23,42,.24);backdrop-filter:blur(3px)}
      .fixitAdminMenu{position:fixed;inset:0 0 0 auto;width:min(100%,430px);height:100dvh;overflow-y:auto;background:#f8fafc;padding:30px 18px max(24px,env(safe-area-inset-bottom));box-shadow:-20px 0 50px rgba(15,23,42,.14);animation:fixitMenuIn .2s ease-out}
      @keyframes fixitMenuIn{from{transform:translateX(22px);opacity:.6}to{transform:translateX(0);opacity:1}}
      .fixitMenuLogoutIcon{position:absolute;top:20px;right:18px;width:42px;height:42px;border:0;border-radius:13px;background:transparent;color:#64748b;display:grid;place-items:center;transition:.16s ease}
      .fixitMenuLogoutIcon:hover{background:#fff;color:#dc2626;box-shadow:0 5px 16px rgba(15,23,42,.08)}
      .fixitMenuIdentity{display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 54px 23px}
      .fixitMenuLogo{width:68px;height:68px;border-radius:20px;background:#2563eb;color:white;display:grid;place-items:center;font-size:31px;font-weight:900;box-shadow:0 12px 28px rgba(37,99,235,.28)}
      .fixitMenuIdentity strong{margin-top:14px;color:#111827;font-size:18px;line-height:1.25;font-weight:850;letter-spacing:-.2px}
      .fixitMenuIdentity span{margin-top:4px;color:#6b7280;font-size:13px;font-weight:650}
      .fixitMenuGroups{display:grid;gap:22px}
      .fixitMenuSection h2{margin:0 0 8px 4px;color:#9ca3af;font-size:10px;line-height:1.2;font-weight:900;letter-spacing:.13em}
      .fixitMenuCard{overflow:hidden;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 4px 15px rgba(15,23,42,.04)}
      .fixitMenuRow{min-height:64px;padding:10px 13px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #f0f2f5;color:#111827;transition:background .15s ease,transform .15s ease}
      .fixitMenuRow:last-child{border-bottom:0}.fixitMenuRow:hover{background:#f8fafc}.fixitMenuRow:active{background:#f1f5f9}.fixitMenuRow.active{background:#eff6ff}
      .fixitMenuRowIcon{width:38px;height:38px;flex:0 0 38px;border-radius:11px;background:#f3f4f6;color:#64748b;display:grid;place-items:center;transition:.15s ease}
      .fixitMenuRow:hover .fixitMenuRowIcon,.fixitMenuRow.active .fixitMenuRowIcon{background:#eff6ff;color:#2563eb}
      .fixitMenuRowLabel{min-width:0;flex:1;font-size:14px;font-weight:780;letter-spacing:-.1px}
      .fixitMenuChevron{width:20px;display:grid;place-items:center;color:#c4c9d1;transition:transform .15s ease,color .15s ease}.fixitMenuRow:hover .fixitMenuChevron{transform:translateX(2px);color:#6b7280}
      .fixitMenuBadge{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#ef4444;color:white;display:inline-grid;place-items:center;font-size:11px;line-height:1;font-weight:900}
      .fixitSignOutCard{margin-top:22px;padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 4px 15px rgba(15,23,42,.04)}
      .fixitSignOutButton{width:100%;min-height:50px;border:0;border-radius:13px;background:#dc2626;color:#fff;display:flex;align-items:center;justify-content:center;gap:9px;font-weight:850;font-size:14px;box-shadow:0 6px 16px rgba(220,38,38,.18);transition:.16s ease}
      .fixitSignOutButton:hover{background:#b91c1c;transform:translateY(-1px)}.fixitSignOutButton:active{transform:translateY(0)}
      .fixitMenuLogoutIcon:focus-visible,.fixitMenuRow:focus-visible,.fixitSignOutButton:focus-visible{outline:3px solid rgba(37,99,235,.25);outline-offset:2px}
      @media(max-width:520px){.fixitAdminMenu{width:100%;padding:24px 14px max(20px,env(safe-area-inset-bottom))}.fixitMenuLogoutIcon{top:16px;right:14px}.fixitMenuIdentity{padding-top:7px}.fixitMenuGroups{gap:20px}.fixitMenuRow{min-height:62px}}
    `}</style>
  </>;
}
