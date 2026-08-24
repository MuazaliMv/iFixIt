'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type AdminSubmenu={label:string;href:string;match?:(path:string,query:URLSearchParams)=>boolean};
type AdminMenuGroup={label:string;href:string;matches:(path:string)=>boolean;submenus:AdminSubmenu[]};

const groups:AdminMenuGroup[]=[
 {
  label:'Dashboard',href:'/admin',
  matches:path=>path==='/admin'||path.startsWith('/admin/escalations'),
  submenus:[
   {label:'Overview',href:'/admin',match:(path)=>path==='/admin'},
   {label:'Action Required',href:'/admin/escalations',match:path=>path.startsWith('/admin/escalations')},
   {label:'Marketplace Activity',href:'/admin/reports?view=marketplace',match:(path,q)=>path.startsWith('/admin/reports')&&q.get('view')==='marketplace'},
  ],
 },
 {
  label:'Requests',href:'/admin/requests',
  matches:path=>path.startsWith('/admin/requests'),
  submenus:[
   {label:'All Requests',href:'/admin/requests',match:(path,q)=>path.startsWith('/admin/requests')&&!q.get('status')},
   {label:'Active Requests',href:'/admin/requests?status=active',match:(path,q)=>path.startsWith('/admin/requests')&&q.get('status')==='active'},
   {label:'Completed',href:'/admin/requests?status=COMPLETED',match:(path,q)=>path.startsWith('/admin/requests')&&q.get('status')==='COMPLETED'},
   {label:'Cancelled / Failed',href:'/admin/requests?status=CANCELLED',match:(path,q)=>path.startsWith('/admin/requests')&&q.get('status')==='CANCELLED'},
   {label:'Escalations',href:'/admin/escalations'},
  ],
 },
 {
  label:'Users & Providers',href:'/admin/users',
  matches:path=>path.startsWith('/admin/users')||path.startsWith('/admin/providers'),
  submenus:[
   {label:'Customers',href:'/admin/users?type=customer',match:(path,q)=>path==='/admin/users'&&q.get('type')==='customer'},
   {label:'Service Providers',href:'/admin/providers',match:path=>path==='/admin/providers'},
   {label:'Provider Applications',href:'/admin/providers?view=applications',match:(path,q)=>path.startsWith('/admin/providers')&&q.get('view')==='applications'},
   {label:'User Accounts',href:'/admin/users',match:(path,q)=>path==='/admin/users'&&!q.get('type')},
   {label:'Rights & Privileges',href:'/admin/users/rights-privileges',match:path=>path.startsWith('/admin/users/rights-privileges')},
  ],
 },
 {
  label:'Services & Locations',href:'/admin/services',
  matches:path=>path.startsWith('/admin/services')||path.startsWith('/admin/request-form')||path.startsWith('/admin/required-fields')||path.startsWith('/admin/locations'),
  submenus:[
   {label:'Services',href:'/admin/services',match:(path,q)=>path==='/admin/services'&&!q.get('view')},
   {label:'Categories / Subcategories',href:'/admin/services?view=categories',match:(path,q)=>path.startsWith('/admin/services')&&q.get('view')==='categories'},
   {label:'Request Form',href:'/admin/request-form',match:path=>path.startsWith('/admin/request-form')||path.startsWith('/admin/required-fields')},
   {label:'Locations',href:'/admin/locations',match:(path,q)=>path==='/admin/locations'&&!q.get('view')},
   {label:'Provider Coverage',href:'/admin/locations?view=coverage',match:(path,q)=>path.startsWith('/admin/locations')&&q.get('view')==='coverage'},
  ],
 },
 {
  label:'Reports & System',href:'/admin/reports',
  matches:path=>path.startsWith('/admin/reports')||path.startsWith('/admin/audit-logs')||path.startsWith('/admin/settings')||path.startsWith('/notifications')||path.startsWith('/change-password'),
  submenus:[
   {label:'Reports',href:'/admin/reports',match:(path,q)=>path.startsWith('/admin/reports')&&q.get('view')!=='marketplace'},
   {label:'Audit Logs',href:'/admin/audit-logs',match:path=>path.startsWith('/admin/audit-logs')},
   {label:'Notifications',href:'/notifications',match:path=>path.startsWith('/notifications')},
   {label:'Settings',href:'/admin/settings',match:path=>path.startsWith('/admin/settings')},
   {label:'Password & Security',href:'/change-password',match:path=>path.startsWith('/change-password')},
  ],
 },
];

export default function AdminNav(){
 const path=usePathname();
 const searchParams=useSearchParams();
 const query=new URLSearchParams(searchParams.toString());

 useEffect(()=>{
  const root=document.documentElement;
  root.classList.add('adminSimpleNavActive');
  return()=>root.classList.remove('adminSimpleNavActive');
 },[]);

 if(!path.startsWith('/admin'))return null;
 const activeGroup=groups.find(group=>group.matches(path))||groups[0];

 return <nav className="adminSimpleNav" aria-label="Admin navigation">
  <div className="adminSimplePrimary" role="list">
   {groups.map(group=>{
    const active=group.label===activeGroup.label;
    return <Link key={group.label} href={group.href} className={`adminSimplePrimaryItem${active?' active':''}`} aria-current={active?'page':undefined}>
     <span>{group.label}</span>
    </Link>;
   })}
  </div>

  <div className="adminSimpleSubmenus" aria-label={`${activeGroup.label} sections`}>
   {activeGroup.submenus.map(item=>{
    const active=item.match?item.match(path,query):false;
    return <Link key={`${activeGroup.label}-${item.label}`} href={item.href} className={`adminSimpleSubmenuItem${active?' active':''}`} aria-current={active?'page':undefined}>{item.label}</Link>;
   })}
  </div>

  <style jsx global>{`
   .adminSimpleNavActive .globalMenuHeaderWrap{display:none!important}
   .adminSimpleNavActive .fixitModalBackdrop{display:none!important}
   .adminSimpleNav{width:100%;display:grid;gap:9px;margin:12px 0 18px;padding:10px;border:1px solid #e2e8f0;border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(15,23,42,.05);overflow:hidden}
   .adminSimplePrimary,.adminSimpleSubmenus{display:flex;align-items:center;gap:7px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
   .adminSimplePrimary::-webkit-scrollbar,.adminSimpleSubmenus::-webkit-scrollbar{display:none}
   .adminSimplePrimaryItem{min-height:48px;display:inline-flex;align-items:center;justify-content:center;flex:1 0 auto;padding:0 14px;border:1px solid transparent;border-radius:13px;color:#475569;background:#f8fafc;text-decoration:none;font-size:13px;font-weight:800;white-space:nowrap;transition:.15s ease}
   .adminSimplePrimaryItem:hover{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}
   .adminSimplePrimaryItem.active{border-color:#2563eb;background:#2563eb;color:#fff;box-shadow:0 6px 16px rgba(37,99,235,.18)}
   .adminSimpleSubmenus{padding-top:1px}
   .adminSimpleSubmenuItem{min-height:44px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:0 13px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#64748b;text-decoration:none;font-size:12px;font-weight:750;white-space:nowrap;transition:.15s ease}
   .adminSimpleSubmenuItem:hover{border-color:#93c5fd;color:#1d4ed8;background:#f8fbff}
   .adminSimpleSubmenuItem.active{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:850}
   @media(max-width:640px){.adminSimpleNav{margin:9px 0 14px;padding:8px;border-radius:16px}.adminSimplePrimary{gap:6px}.adminSimplePrimaryItem{min-height:48px;padding:0 13px;font-size:12px}.adminSimpleSubmenus{gap:6px}.adminSimpleSubmenuItem{min-height:44px;padding:0 12px;font-size:11.5px}}
  `}</style>
 </nav>;
}
