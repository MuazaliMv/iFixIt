'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links=[
  {label:'Dashboard',href:'/admin',match:(path:string)=>path==='/admin'},
  {label:'Request Management',href:'/admin/requests',match:(path:string)=>path.startsWith('/admin/requests')},
  {label:'Service Categories',href:'/admin/service-categories',match:(path:string)=>path.startsWith('/admin/service-categories')},
  {label:'Locations',href:'/admin/locations',match:(path:string)=>path.startsWith('/admin/locations')},
  {label:'User Management',href:'/admin/users',match:(path:string)=>path.startsWith('/admin/users')},
  {label:'Reports',href:'/admin/reports',match:(path:string)=>path.startsWith('/admin/reports')},
];

export default function AdminNav() {
  const path=usePathname();
  return (
    <nav aria-label="Admin navigation">
      {links.map(link=>(
        <Link key={link.href} href={link.href} aria-current={link.match(path)?'page':undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
