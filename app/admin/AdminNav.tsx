'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type AdminIcon='dashboard'|'requests'|'users'|'services'|'system';
type AdminSubmenu={label:string;href:string;match?:(path:string,query:URLSearchParams)=>boolean};
type AdminMenuGroup={label:string;href:string;icon:AdminIcon;matches:(path:string)=>boolean;submenus:AdminSubmenu[]};
type Theme='light'|'dark';

const groups:AdminMenuGroup[]=[
 {
  label:'Dashboard',href:'/admin',icon:'dashboard',
  matches:path=>path==='/admin',
  submenus:[
   {label:'Overview',href:'/admin',match:(path)=>path==='/admin'},
   {label:'Action Required',href:'/admin/escalations'},
   {label:'Marketplace Activity',href:'/admin/reports?view=marketplace'},
  ],
 },
 {
  label:'Requests',href:'/admin/requests',icon:'requests',
  matches:path=>path.startsWith('/admin/requests')||path.startsWith('/admin/escalations'),
  submenus:[
   {label:'All Requests',href:'/admin/requests',match:(path,q)=>path.startsWith('/admin/requests')&&!q.get('status')},
   {label:'Active Requests',href:'/admin/requests?status=active',match:(path,q)=>path.startsWith('/admin/requests')&&q.get('status')==='active'},
   {label:'Completed',href:'/admin/requests?status=COMPLETED',match:(path,q)=>path.startsWith('/admin/requests')&&q.get('status')==='COMPLETED'},
   {label:'Cancelled / Failed',href:'/admin/requests?status=CANCELLED',match:(path,q)=>path.startsWith('/admin/requests')&&q.get('status')==='CANCELLED'},
   {label:'Escalations',href:'/admin/escalations',match:path=>path.startsWith('/admin/escalations')},
  ],
 },
 {
  label:'Users & Providers',href:'/admin/users',icon:'users',
  matches:path=>path.startsWith('/admin/users')||path.startsWith('/admin/providers'),
  submenus:[
   {label:'Customers',href:'/admin/users?type=customer',match:(path,q)=>path==='/admin/users'&&q.get('type')==='customer'},
   {label:'Service Providers',href:'/admin/providers',match:(path,q)=>path==='/admin/providers'&&!q.get('view')},
   {label:'Provider Applications',href:'/admin/providers?view=applications',match:(path,q)=>path.startsWith('/admin/providers')&&q.get('view')==='applications'},
   {label:'User Accounts',href:'/admin/users',match:(path,q)=>path==='/admin/users'&&!q.get('type')},
   {label:'Rights & Privileges',href:'/admin/users/rights-privileges',match:path=>path.startsWith('/admin/users/rights-privileges')},
  ],
 },
 {
  label:'Services & Locations',href:'/admin/services',icon:'services',
  matches:path=>path.startsWith('/admin/services')||path.startsWith('/admin/service-categories')||path.startsWith('/admin/request-form')||path.startsWith('/admin/required-fields')||path.startsWith('/admin/locations'),
  submenus:[
   {label:'Services',href:'/admin/services',match:(path,q)=>path==='/admin/services'&&!q.get('view')},
   {label:'Service Categories',href:'/admin/service-categories',match:path=>path.startsWith('/admin/service-categories')},
   {label:'Categories / Subcategories',href:'/admin/services?view=categories',match:(path,q)=>path.startsWith('/admin/services')&&q.get('view')==='categories'},
   {label:'Request Form',href:'/admin/request-form',match:path=>path.startsWith('/admin/request-form')||path.startsWith('/admin/required-fields')},
   {label:'Locations',href:'/admin/locations',match:(path,q)=>path==='/admin/locations'&&!q.get('view')},
   {label:'Provider Coverage',href:'/admin/locations?view=coverage',match:(path,q)=>path.startsWith('/admin/locations')&&q.get('view')==='coverage'},
  ],
 },
 {
  label:'Reports & System',href:'/admin/reports',icon:'system',
  matches:path=>path.startsWith('/admin/reports')||path.startsWith('/admin/audit-logs')||path.startsWith('/admin/settings'),
  submenus:[
   {label:'Reports',href:'/admin/reports',match:(path,q)=>path.startsWith('/admin/reports')&&q.get('view')!=='marketplace'},
   {label:'Audit Logs',href:'/admin/audit-logs',match:path=>path.startsWith('/admin/audit-logs')},
   {label:'Notifications',href:'/notifications'},
   {label:'Settings',href:'/admin/settings',match:path=>path.startsWith('/admin/settings')},
   {label:'Password & Security',href:'/change-password'},
  ],
 },
];

function MenuIcon({name}:{name:AdminIcon}){
 const props={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
 if(name==='dashboard')return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
 if(name==='requests')return <svg {...props}><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
 if(name==='users')return <svg {...props}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 16.5a4.5 4.5 0 0 1 6.5 3.5"/></svg>;
 if(name==='services')return <svg {...props}><path d="M4 7h10M4 17h16M14 7l2-2 4 4-2 2M8 17l-2-2-2 2 2 2Z"/><circle cx="9" cy="7" r="2"/><circle cx="14" cy="17" r="2"/></svg>;
 return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></svg>;
}

function ThemeIcon({theme}:{theme:Theme}){
 if(theme==='dark')return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>;
}

function AdminNavInner(){
 const path=usePathname();
 const searchParams=useSearchParams();
 const query=new URLSearchParams(searchParams.toString());
 const[theme,setTheme]=useState<Theme>('light');

 useEffect(()=>{
  const root=document.documentElement;
  root.classList.add('adminSimpleNavActive');
  let next:Theme='light';
  try{
   const saved=localStorage.getItem('ifixmv-admin-theme');
   if(saved==='light'||saved==='dark')next=saved;
   else if(window.matchMedia?.('(prefers-color-scheme: dark)').matches)next='dark';
  }catch{}
  root.dataset.adminTheme=next;
  setTheme(next);
  return()=>root.classList.remove('adminSimpleNavActive');
 },[]);

 function toggleTheme(){
  const next:Theme=theme==='dark'?'light':'dark';
  setTheme(next);
  document.documentElement.dataset.adminTheme=next;
  try{localStorage.setItem('ifixmv-admin-theme',next);}catch{}
 }

 if(!path.startsWith('/admin'))return null;
 const activeGroup=groups.find(group=>group.matches(path))||groups[0];

 return <nav className="adminSimpleNav" aria-label="Admin navigation">
  <div className="adminNavHeader">
   <Link className="adminNavIdentity" href="/admin" aria-label="iFix Maldives Admin dashboard">
    <span className="adminNavMark">iF</span>
    <span className="adminNavIdentityCopy"><strong>iFix Admin</strong><small>Operations Console</small></span>
   </Link>
   <div className="adminNavTools">
    <span className="adminSecurePill"><i aria-hidden="true"/>Secure admin access</span>
    <button type="button" className="adminThemeToggle" onClick={toggleTheme} aria-label={`Switch to ${theme==='dark'?'light':'dark'} mode`} title={`Switch to ${theme==='dark'?'light':'dark'} mode`}><ThemeIcon theme={theme}/></button>
   </div>
  </div>

  <div className="adminSimplePrimary" role="list" aria-label="Admin sections">
   {groups.map(group=>{
    const active=group.label===activeGroup.label;
    return <Link key={group.label} href={group.href} className={`adminSimplePrimaryItem${active?' active':''}`} aria-current={active?'page':undefined}>
     <MenuIcon name={group.icon}/><span>{group.label}</span>
    </Link>;
   })}
  </div>

  <div className="adminSimpleSubmenus" aria-label={`${activeGroup.label} sections`}>
   {activeGroup.submenus.map(item=>{
    const active=item.match?item.match(path,query):false;
    return <a key={`${activeGroup.label}-${item.label}`} href={item.href} className={`adminSimpleSubmenuItem${active?' active':''}`} aria-current={active?'page':undefined}>{item.label}</a>;
   })}
  </div>
 </nav>;
}

function AdminNavFallback(){
 return <nav className="adminSimpleNav" aria-label="Admin navigation" aria-busy="true"><div className="adminNavHeader"><span className="adminNavIdentity"><span className="adminNavMark">iF</span><span className="adminNavIdentityCopy"><strong>iFix Admin</strong><small>Operations Console</small></span></span></div></nav>;
}

export default function AdminNav(){
 return <Suspense fallback={<AdminNavFallback/>}><AdminNavInner/></Suspense>;
}
