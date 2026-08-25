'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links=[
 {label:'Service Categories',href:'/admin/service-categories'},
];

export default function AdminNav(){
 const path=usePathname();
 return(
  <nav aria-label="Admin navigation">
   {links.map(({label,href})=>(
    <Link key={href} href={href} aria-current={path.startsWith('/admin/service-categories')&&href==='/admin/service-categories'?'page':undefined}>
     {label}
    </Link>
   ))}
  </nav>
 );
}
