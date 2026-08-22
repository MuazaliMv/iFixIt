'use client';

import { usePathname } from 'next/navigation';
import './admin-nav.css';

const items=[
 {href:'/admin',label:'Dashboard',icon:'⌂'},
 {href:'/admin/requests',label:'Service Requests',icon:'▣'},
 {href:'/admin/providers',label:'Providers',icon:'♙'},
 {href:'/admin/users',label:'Users',icon:'◎'},
 {href:'/admin/services',label:'Services',icon:'◇'},
 {href:'/admin/locations',label:'Locations',icon:'⌖'},
 {href:'/admin/reports',label:'Reports',icon:'▤'},
 {href:'/admin/settings',label:'Settings',icon:'⚙'},
];

export default function AdminNav(){
 const pathname=usePathname();
 const active=(href:string)=>href==='/admin'?pathname===href:pathname.startsWith(href);
 return <nav className="adminCommandNav" aria-label="Admin controls">
  <div className="adminCommandGrid">{items.map(item=><a key={item.href} href={item.href} className={active(item.href)?'adminCommand active':'adminCommand'} aria-current={active(item.href)?'page':undefined}><span className="adminCommandIcon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></a>)}</div>
 </nav>;
}
