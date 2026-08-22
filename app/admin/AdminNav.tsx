'use client';

import { usePathname } from 'next/navigation';
import './admin-nav.css';

const primary=[
 {href:'/admin',label:'Dashboard',icon:'⌂'},
 {href:'/admin/requests',label:'Requests',icon:'▣'},
 {href:'/admin/escalations',label:'Attention',icon:'!'},
 {href:'/admin/users',label:'Users',icon:'♙'},
];
const more=[
 {href:'/admin/providers',label:'Providers'},
 {href:'/admin/services',label:'Services'},
 {href:'/admin/locations',label:'Locations'},
 {href:'/admin/reports',label:'Reports'},
 {href:'/admin/required-fields',label:'Profile Fields'},
 {href:'/admin/settings',label:'Settings'},
 {href:'/admin/audit-logs',label:'Audit Logs'},
];

export default function AdminNav(){
 const pathname=usePathname();
 return <nav className="adminCommandNav" aria-label="Admin controls">
  <div className="adminCommandGrid">{primary.map(item=><a key={item.href} href={item.href} className={pathname===item.href?'adminCommand active':'adminCommand'}><span className="adminCommandIcon">{item.icon}</span><span>{item.label}</span></a>)}</div>
  <details className="adminMore"><summary>More admin tools</summary><div className="adminMoreGrid">{more.map(item=><a key={item.href} href={item.href} className={pathname===item.href?'adminMoreLink active':'adminMoreLink'}>{item.label}</a>)}</div></details>
 </nav>;
}
