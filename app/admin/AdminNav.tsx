'use client';

import { usePathname } from 'next/navigation';

const items=[
 {href:'/admin',label:'Dashboard'},
 {href:'/admin/users',label:'Users'},
 {href:'/admin/providers',label:'Providers'},
 {href:'/admin/requests',label:'Requests'},
 {href:'/admin/services',label:'Services'},
 {href:'/admin/locations',label:'Locations'},
 {href:'/admin/reports',label:'Reports'},
 {href:'/admin/reports/no-provider-on-time',label:'SLA Exceptions'},
 {href:'/admin/required-fields',label:'Profile Fields'},
 {href:'/admin/settings',label:'Settings'},
 {href:'/admin/audit-logs',label:'Audit Logs'},
];

export default function AdminNav(){
 const pathname=usePathname();
 return <nav className="panel" aria-label="Admin controls"><div className="actions">{items.map(item=><a key={item.href} href={item.href} className={pathname===item.href?'primary':'secondary'}>{item.label}</a>)}</div></nav>;
}
