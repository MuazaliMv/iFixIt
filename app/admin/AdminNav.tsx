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
     const active=item.href==='/admin'?path==='/admin':path.startsWith(item.href);
     const activeClass=active?' active':'';
     if(item.label==='Service Categories'){
      return <a key={item.href} href={item.href} className={`adminCommand${activeClass}`} aria-current={path.startsWith('/admin/service-categories')?'page':undefined}><span className="adminCommandIcon">{item.icon}</span>{item.label}</a>;
     }
     return <a key={item.href} href={item.href} className={`adminCommand${activeClass}`}><span className="adminCommandIcon">{item.icon}</span>{item.label}</a>;
    })}
   </div>
  </nav>
 );
}
