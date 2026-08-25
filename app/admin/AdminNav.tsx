'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems=[
  {label:'Dashboard',href:'/admin'},
  {label:'Users',href:'/admin/users'},
  {label:'Providers',href:'/admin/providers'},
  {label:'Services',href:'/admin/services'},
  {label:'Service Categories',href:'/admin/service-categories'},
  {label:'Requests',href:'/admin/requests'},
  {label:'Reports',href:'/admin/reports'},
  {label:'Settings',href:'/admin/settings'},
];

export default function AdminNav(){
  const path=usePathname();
  return(
    <nav className="adminNav">
      {navItems.map(item=>(
        <Link
          key={item.href}
          href={item.href}
          className={path.startsWith('/admin/service-categories')&&item.href==='/admin/service-categories'?'active':path===item.href?'active':undefined}
        >{item.label}</Link>
      ))}
    </nav>
  );
}
