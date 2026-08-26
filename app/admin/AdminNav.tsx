'use client';

import { usePathname } from 'next/navigation';

const items=[{label:'Service Categories',href:'/admin/service-categories'}];

export default function AdminNav() {
  const path=usePathname()||'';

  return <nav aria-label="Admin navigation" style={{padding:'0 20px 20px'}}>
    <div style={{display:'flex',justifyContent:'center'}}>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        {items.map(item=>{
          const active=path.startsWith(item.href)||(item.href==='/admin/service-categories'&&path.startsWith('/admin/service-categories'));
          return <a key={item.href} href={item.href} style={{display:'inline-flex',alignItems:'center',minHeight:40,padding:'0 14px',borderRadius:999,border:'1px solid #dbe2ea',background:active?'#eff6ff':'#fff',color:active?'#1d4ed8':'#334155',fontWeight:800,textDecoration:'none'}} aria-current={active?'page':undefined}>{item.label}</a>;
        })}
      </div>
    </div>
  </nav>;
}
