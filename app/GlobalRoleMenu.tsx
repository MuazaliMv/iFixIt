'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import DispatchLivePanel from './DispatchLivePanel';

type Role='customer'|'provider'|'admin';
type IconName='profile'|'key'|'bell'|'settings'|'requests'|'alert'|'location'|'users'|'reports'|'audit'|'jobs'|'calendar'|'services'|'messages';
type MenuItem={href:string;label:string;icon:IconName;badge?:number};
type MenuSection={title:string;items:MenuItem[]};
type RoleMenu={label:string;roleLabel:string;home:string;secondary:{href:string;label:string};sections:MenuSection[]};

const menus:Record<Role,RoleMenu>={
  admin:{
    label:'Admin',roleLabel:'System Administrator',home:'/admin',secondary:{href:'/admin/reports',label:'Reports'},
    sections:[
      {title:'ACCOUNT & SETTINGS',items:[
        {href:'/profile',label:'My Profile',icon:'profile'},
        {href:'/change-password',label:'Change Password',icon:'key'},
        {href:'/notifications',label:'Notifications',icon:'bell'},
        {href:'/admin/settings',label:'Settings',icon:'settings'},
      ]},
      {title:'MANAGEMENT & OPERATIONS',items:[
        {href:'/admin/requests',label:'Request Management',icon:'requests'},
        {href:'/admin/escalations',label:'Attention / Escalations',icon:'alert',badge:3},
        {href:'/admin/locations',label:'Locations',icon:'location'},
        {href:'/admin/users',label:'User Management',icon:'users'},
      ]},
      {title:'SYSTEM & ANALYTICS',items:[
        {href:'/admin/reports',label:'Reports',icon:'reports'},
        {href:'/admin/audit-logs',label:'Audit Logs',icon:'audit'},
      ]},
    ],
  },
  provider:{
    label:'Provider',roleLabel:'Service Provider',home:'/provider/jobs',secondary:{href:'/provider/availability',label:'Location'},
    sections:[
      {title:'ACCOUNT & SETTINGS',items:[
        {href:'/provider/profile',label:'My Profile',icon:'profile'},
        {href:'/change-password',label:'Change Password',icon:'key'},
        {href:'/notifications',label:'Notifications',icon:'bell'},
      ]},
      {title:'WORK & FIELD OPERATIONS',items:[
        {href:'/provider/jobs',label:'My Jobs',icon:'jobs'},
        {href:'/provider/calendar',label:'Schedule',icon:'calendar'},
        {href:'/provider/services',label:'Services Provided',icon:'services'},
      ]},
      {title:'COMMUNICATION & LOCATION',items:[
        {href:'/provider/messages',label:'Messages',icon:'messages'},
        {href:'/provider/availability',label:'Location',icon:'location'},
      ]},
    ],
  },
  customer:{
    label:'Customer',roleLabel:'Customer',home:'/',secondary:{href:'/messages',label:'Messages'},
    sections:[
      {title:'ACCOUNT & SETTINGS',items:[
        {href:'/profile',label:'My Profile',icon:'profile'},
        {href:'/change-password',label:'Change Password',icon:'key'},
        {href:'/notifications',label:'Notifications',icon:'bell'},
      ]},
      {title:'MY ACTIVITY',items:[
        {href:'/requests',label:'Service Requests',icon:'requests'},
        {href:'/messages',label:'Messages',icon:'messages'},
      ]},
    ],
  },
};

function routeRole(path:string):Role|null{if(path.startsWith('/admin'))return 'admin';if(path.startsWith('/provider'))return 'provider';return null;}
function isPublicOrAuth(path:string){return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');}
function itemIsActive(path:string,href:string){if(href==='/')return path==='/';if(href==='/admin/users')return path.startsWith('/admin/users')||path.startsWith('/admin/providers')||path.startsWith('/admin/services');return path===href||path.startsWith(href+'/');}

function MenuIcon({name}:{name:IconName}){
  const p={width:21,height:21,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
  if(name==='profile')return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  if(name==='key')return <svg {...p}><circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 9-9m-2 2 2 2m-5 1 2 2"/></svg>;
  if(name==='bell')return <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if(name==='settings')return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.08-1l2-1.55-2-3.46-2.46 1a7 7 0 0 0-1.72-1L14.4 3h-4.8l-.34 2.99a7 7 0 0 0-1.72 1L5.08 6l-2 3.46L5.08 11a7 7 0 0 0 0 2l-2 1.55 2 3.46 2.46-1a7 7 0 0 0 1.72 1L9.6 21h4.8l.34-2.99a7 7 0 0 0 1.72-1l2.46 1 2-3.46-2-1.55c.05-.33.08-.66.08-1Z"/></svg>;
  if(name==='requests'||name==='jobs')return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if(name==='alert')return <svg {...p}><path d="M10.3 3.2 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>;
  if(name==='location')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if(name==='users')return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if(name==='reports')return <svg {...p}><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></svg>;
  if(name==='audit')return <svg {...p}><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if(name==='calendar')return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>;
  if(name==='services')return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-3 3-3-3 3-3Z"/></svg>;
  return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>;
}
function Chevron(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>}
function LogoutIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>}

export default function GlobalRoleMenu(){
  const path=usePathname();
  const[role,setRole]=useState<Role|null>(routeRole(path));
  const[open,setOpen]=useState(false);
  const[userName,setUserName]=useState('User');

  useEffect(()=>{let active=true;async function resolve(){const byRoute=routeRole(path);if(isPublicOrAuth(path)){if(active)setRole(null);return;}try{const{data}=await supabase.auth.getSession();if(!data.session){if(active)setRole(byRoute);return;}const r=await fetch('/api/user/profile',{headers:{Authorization:`Bearer ${data.session.access_token}`}});if(!r.ok){if(active)setRole(byRoute);return;}const p=await r.json();const raw=String(p?.profile?.role||'CUSTOMER').toUpperCase();const resolved:Role=byRoute||(raw==='ADMIN'?'admin':raw==='PROVIDER'?'provider':'customer');if(raw==='PROVIDER'&&path==='/profile'){window.location.replace('/provider/profile');return;}if(active){setRole(resolved);setUserName(String(p?.profile?.full_name||data.session.user.user_metadata?.full_name||data.session.user.email?.split('@')[0]||'User'));}}catch{if(active)setRole(byRoute);}}void resolve();setOpen(false);return()=>{active=false;};},[path]);
  useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',key);};},[open]);

  async function signOut(){setOpen(false);await supabase.auth.signOut();window.location.href='/login';}
  if(!role)return null;
  const menu=menus[role];

  return <>
    {role==='customer'&&path.startsWith('/requests/')?<DispatchLivePanel/>:null}
    <div className="globalMenuHeaderWrap"><header className="globalMenuHeader" aria-label={`${menu.label} navigation`}><Link href={menu.home} className="globalMenuBrand" onClick={()=>setOpen(false)}><span className="globalMenuBrandMark">F</span><span>FixIt</span></Link><div className="globalMenuHeaderActions"><Link className="globalMenuSecondary" href={menu.secondary.href}>{menu.secondary.label}</Link><button className="globalMenuToggle" type="button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<span className="globalMenuClose">×</span>:<span className="globalMenuBars"><i/><i/><i/></span>}</button></div></header></div>

    {open?<div className="globalMenuBackdrop fixitRoleBackdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false);}}>
      <section className="fixitRoleMenu" role="dialog" aria-modal="true" aria-label={`${menu.label} menu`}>
        <header className="fixitRoleMenuHead">
          <Link href={menu.home} className="fixitRoleLogo" onClick={()=>setOpen(false)}>F</Link>
          <div className="fixitRoleIdentity"><strong>{userName}</strong><span>{menu.roleLabel}</span></div>
          <button className="fixitRoleClose" type="button" aria-label="Close menu" onClick={()=>setOpen(false)}>×</button>
        </header>

        <div className="fixitRoleGroups">
          {menu.sections.map(section=><section key={section.title} className="fixitRoleSection">
            <h2>{section.title}</h2>
            <div className="fixitRoleCard">
              {section.items.map(item=><Link key={item.href+item.label} href={item.href} onClick={()=>setOpen(false)} className={`fixitRoleRow${itemIsActive(path,item.href)?' active':''}`}>
                <span className="fixitRoleIcon"><MenuIcon name={item.icon}/></span>
                <span className="fixitRoleLabel">{item.label}</span>
                {item.badge?<span className="fixitRoleBadge">{item.badge}</span>:null}
                <span className="fixitRoleChevron"><Chevron/></span>
              </Link>)}
            </div>
          </section>)}
        </div>

        <div className="fixitRoleSignOutCard"><button type="button" className="fixitRoleSignOut" onClick={()=>void signOut()}><LogoutIcon/>Sign Out</button></div>
      </section>
    </div>:null}

    <style jsx global>{`
      .fixitRoleBackdrop{padding:0;background:rgba(15,23,42,.26);backdrop-filter:blur(3px)}
      .fixitRoleMenu{position:fixed;inset:0 0 0 auto;width:min(100%,440px);height:100dvh;overflow-y:auto;background:#f8fafc;padding:22px 18px max(26px,env(safe-area-inset-bottom));box-shadow:-20px 0 54px rgba(15,23,42,.16);animation:fixitRoleIn .2s ease-out}
      @keyframes fixitRoleIn{from{transform:translateX(24px);opacity:.65}to{transform:translateX(0);opacity:1}}
      .fixitRoleMenuHead{display:grid;grid-template-columns:58px minmax(0,1fr) 42px;align-items:center;gap:13px;padding:4px 2px 24px}
      .fixitRoleLogo{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:#2563eb;color:#fff;font-size:27px;font-weight:950;box-shadow:0 12px 28px rgba(37,99,235,.26)}
      .fixitRoleIdentity{min-width:0}.fixitRoleIdentity strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0f172a;font-size:16px;font-weight:900;letter-spacing:-.2px}.fixitRoleIdentity span{display:block;margin-top:4px;color:#64748b;font-size:12px;font-weight:700}
      .fixitRoleClose{width:42px;height:42px;border:1px solid #e2e8f0;border-radius:13px;background:#fff;color:#64748b;font-size:27px;line-height:1;display:grid;place-items:center;box-shadow:0 4px 14px rgba(15,23,42,.04);transition:.15s ease}.fixitRoleClose:hover{color:#0f172a;background:#f1f5f9}
      .fixitRoleGroups{display:grid;gap:22px}.fixitRoleSection h2{margin:0 0 8px 4px;color:#94a3b8;font-size:10.5px;font-weight:900;letter-spacing:.13em}.fixitRoleCard{overflow:hidden;background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 8px 24px rgba(15,23,42,.045)}
      .fixitRoleRow{min-height:67px;display:grid;grid-template-columns:42px minmax(0,1fr) auto 18px;align-items:center;gap:12px;padding:11px 15px;border-bottom:1px solid #f1f5f9;color:#0f172a;transition:background .15s ease,color .15s ease}.fixitRoleRow:last-child{border-bottom:0}.fixitRoleRow:hover,.fixitRoleRow.active{background:#f8fbff}.fixitRoleRow.active .fixitRoleIcon{background:#dbeafe;color:#2563eb}.fixitRoleRow.active .fixitRoleLabel{color:#1d4ed8}
      .fixitRoleIcon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#f1f5f9;color:#64748b;transition:.15s ease}.fixitRoleRow:hover .fixitRoleIcon{background:#eff6ff;color:#2563eb}.fixitRoleLabel{font-size:14px;font-weight:850;letter-spacing:-.1px}.fixitRoleChevron{display:grid;place-items:center;color:#cbd5e1;transition:.15s ease}.fixitRoleRow:hover .fixitRoleChevron{color:#64748b;transform:translateX(1px)}
      .fixitRoleBadge{min-width:22px;height:22px;padding:0 7px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;font-size:11px;font-weight:900;box-shadow:0 3px 8px rgba(239,68,68,.2)}
      .fixitRoleSignOutCard{margin-top:24px;padding:11px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 8px 24px rgba(15,23,42,.045)}.fixitRoleSignOut{width:100%;min-height:52px;border:0;border-radius:13px;background:#dc2626;color:#fff;display:flex;align-items:center;justify-content:center;gap:9px;font-size:14px;font-weight:900;box-shadow:0 7px 16px rgba(220,38,38,.18);transition:.15s ease}.fixitRoleSignOut:hover{background:#b91c1c;transform:translateY(-1px)}
      @media(max-width:520px){.fixitRoleMenu{width:100%;padding:18px 14px max(22px,env(safe-area-inset-bottom))}.fixitRoleMenuHead{grid-template-columns:54px minmax(0,1fr) 40px;padding-bottom:20px}.fixitRoleLogo{width:54px;height:54px;border-radius:17px}.fixitRoleGroups{gap:19px}.fixitRoleRow{min-height:65px;padding:10px 13px}.fixitRoleCard,.fixitRoleSignOutCard{border-radius:17px}}
      @media(prefers-reduced-motion:reduce){.fixitRoleMenu{animation:none}.fixitRoleRow,.fixitRoleIcon,.fixitRoleChevron,.fixitRoleSignOut{transition:none}}
    `}</style>
  </>;
}
