'use client';

import { usePathname, useRouter } from 'next/navigation';
import './adminManagement.css';

export default function AdminNav(){
 const path=usePathname();
 const router=useRouter();
 if(!(path.startsWith('/admin/users')||path.startsWith('/admin/providers')||path.startsWith('/admin/services')||path.startsWith('/admin/request-form')))return null;
 const items=[
  {href:'/admin/users',label:'Users'},
  {href:'/admin/providers',label:'Providers'},
  {href:'/admin/services',label:'Services'},
  {href:'/admin/request-form',label:'Request Form'},
  {href:'/admin/users/rights-privileges',label:'Rights & Privileges'},
  {href:'/admin/users/reset-password',label:'Reset Password'},
 ];
 const current=items.find(item=>item.href==='/admin/users'?path==='/admin/users':path.startsWith(item.href))?.href||'/admin/users';
 return <>
  <div className="adminManagementMobileNav">
   <label htmlFor="admin-management-section">Admin section</label>
   <select
    id="admin-management-section"
    value={current}
    onChange={(event)=>router.push(event.target.value)}
    aria-label="Admin management section"
   >
    {items.map(item=><option key={item.href} value={item.href}>{item.label}</option>)}
   </select>
  </div>
  <nav className="adminManagementNav" aria-label="Admin management sections">
   {items.map(item=>{const active=item.href==='/admin/users'?path==='/admin/users':path.startsWith(item.href);return <a key={item.href} href={item.href} className={active?'primary compactButton':'secondary compactButton'}>{item.label}</a>;})}
  </nav>
 </>;
}
