'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS=[
  {label:'Service Categories',href:'/admin/service-categories'},
];

export default function AdminNav(){
  const path=usePathname();
  return(
    <nav aria-label="Admin navigation">
      {NAV_ITEMS.map(item=>(
        <Link key={item.href} href={item.href} aria-current={path.startsWith('/admin/service-categories')?'page':undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
