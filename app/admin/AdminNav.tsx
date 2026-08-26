'use client';

import { usePathname } from 'next/navigation';
import './admin-nav.css';

const NAV_ITEMS=[
 {label:'Dashboard',href:'/admin',icon:'🏠'},
 {label:'Users',href:'/admin/users',icon:'👥'},
 {label:'Providers',href:'/admin/providers',icon:'🔧'},
 {label:'Requests',href:'/admin/requests',icon:'📋'},
 {label:'Service Categories',href:'/admin/service-categories',icon:'🗂️'},
 {label:'Services',href:'/admin/services',icon:'⚙️'},
 {label:'Locations',href:'/admin/locations',icon:'📍'},
 {label:'Reports',href:'/admin/reports',icon:'📊'},
];

export default function AdminNav(){
 const path=usePathname()??'';
 return(
  <nav className="adminCommandNav">
   <div className="adminCommandGrid">
    {NAV_ITEMS.map(item=>{
     const active=item.href==='/admin'?path==='/admin':item.href==='/admin/service-categories'?path.startsWith('/admin/service-categories'):path.startsWith(item.href);
     return <a key={item.href} href={item.href} className={`adminCommand${active?' active':''}`} aria-current={active?'page':undefined}><span className="adminCommandIcon">{item.icon}</span>{item.label}</a>;
    })}
   </div>
  </nav>
 );
}
