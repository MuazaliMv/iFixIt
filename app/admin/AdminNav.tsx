'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  {label:'Dashboard',href:'/admin',match:(path:string)=>path==='/admin'},
  {label:'Request Management',href:'/admin/requests',match:(path:string)=>path.startsWith('/admin/requests')},
  {label:'Service Categories',href:'/admin/service-categories',match:(path:string)=>path.startsWith('/admin/service-categories')},
  {label:'Locations',href:'/admin/locations',match:(path:string)=>path.startsWith('/admin/locations')},
  {label:'User Management',href:'/admin/users',match:(path:string)=>path.startsWith('/admin/users')},
  {label:'Reports',href:'/admin/reports',match:(path:string)=>path.startsWith('/admin/reports')},
  {label:'Audit Logs',href:'/admin/audit-logs',match:(path:string)=>path.startsWith('/admin/audit-logs')},
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin navigation">
      {navItems.map(item => (
        <Link key={item.href} href={item.href} aria-current={item.match(path) ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
