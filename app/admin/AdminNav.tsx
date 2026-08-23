'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav(){
 const path=usePathname();
 if(!(path.startsWith('/admin/users')||path.startsWith('/admin/providers')||path.startsWith('/admin/services')))return null;
 const items=[
  {href:'/admin/users',label:'Users'},
  {href:'/admin/providers',label:'Providers'},
  {href:'/admin/users/rights-privileges',label:'Rights & Privileges'},
 ];
 return <nav aria-label="User Management sections" style={{display:'flex',gap:10,flexWrap:'wrap',margin:'0 0 18px'}}>
  {items.map(item=>{const active=item.href==='/admin/users'?path==='/admin/users':path.startsWith(item.href);return <Link key={item.href} href={item.href} className={active?'primary compactButton':'secondary compactButton'}>{item.label}</Link>;})}
 </nav>;
}
