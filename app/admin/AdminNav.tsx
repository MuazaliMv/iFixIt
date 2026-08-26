'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const path=usePathname()??'';
  const links=[
    {label:'Dashboard',href:'/admin',active:path==='/admin'},
    {label:'Users',href:'/admin/users',active:path.startsWith('/admin/users')},
    {label:'Service Categories',href:'/admin/service-categories',active:path.startsWith('/admin/service-categories')},
    {label:'Providers',href:'/admin/providers',active:path.startsWith('/admin/providers')},
  ];
  return (
    <nav className="adminNav">
      <ul>
        {links.map(item=>(
          <li key={item.href} className={item.active?'active':''}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
