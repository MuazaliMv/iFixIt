'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import DispatchLivePanel from './DispatchLivePanel';

type Role='customer'|'provider'|'admin';
type MenuItem={href:string;label:string};

type RoleMenu={
  label:string;
  secondary:{href:string;label:string};
  primary:{href:string;label:string};
  items:MenuItem[];
};

const menus:Record<Role,RoleMenu>={
  customer:{
    label:'Customer',
    secondary:{href:'/messages',label:'Messages'},
    primary:{href:'/#request',label:'New Request'},
    items:[
      {href:'/profile',label:'My Profile'},
      {href:'/provider/setup',label:'Become a Provider'},
      {href:'/requests',label:'Service Requests'},
      {href:'/messages',label:'Messages'},
    ],
  },
  provider:{
    label:'Provider',
    secondary:{href:'/provider/availability',label:'Availability'},
    primary:{href:'/provider/jobs',label:'View Jobs'},
    items:[
      {href:'/provider/profile',label:'My Profile'},
      {href:'/provider/jobs',label:'My Jobs'},
      {href:'/provider/calendar',label:'Schedule'},
      {href:'/provider/messages',label:'Messages'},
      {href:'/provider/setup',label:'Service Settings'},
    ],
  },
  admin:{
    label:'Admin',
    secondary:{href:'/admin/reports',label:'Reports'},
    primary:{href:'/admin',label:'Dashboard'},
    items:[
      {href:'/profile',label:'My Profile'},
      {href:'/admin',label:'Dashboard'},
      {href:'/admin/requests',label:'Request Management'},
      {href:'/admin/escalations',label:'Attention / Escalations'},
      {href:'/admin/users',label:'Users'},
      {href:'/admin/providers',label:'Providers'},
      {href:'/admin/services',label:'Services'},
      {href:'/admin/locations',label:'Locations'},
      {href:'/admin/reports',label:'Reports'},
      {href:'/admin/settings',label:'Settings'},
      {href:'/admin/audit-logs',label:'Audit Logs'},
    ],
  },
};

function routeRole(path:string):Role|null{
  if(path.startsWith('/admin'))return 'admin';
  if(path.startsWith('/provider'))return 'provider';
  if(path==='/'||path==='/requests'||path.startsWith('/requests/')||path==='/messages'||path.startsWith('/messages/')||path==='/profile')return null;
  return null;
}

function isPublicOrAuth(path:string){
  return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');
}

function itemIsActive(path:string,href:string){
  if(href==='/')return path==='/';
  if(href.includes('#'))return false;
  return path===href||path.startsWith(href+'/');
}

export default function GlobalRoleMenu(){
  const path=usePathname();
  const[role,setRole]=useState<Role|null>(routeRole(path));
  const[open,setOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    async function resolve(){
      const byRoute=routeRole(path);
      if(byRoute){if(active)setRole(byRoute);return;}
      if(isPublicOrAuth(path)){if(active)setRole(null);return;}
      try{
        const{data}=await supabase.auth.getSession();
        if(!data.session){if(active)setRole(null);return;}
        const r=await fetch('/api/user/profile',{headers:{Authorization:`Bearer ${data.session.access_token}`}});
        if(!r.ok){if(active)setRole(null);return;}
        const p=await r.json();
        const raw=String(p?.profile?.role||'CUSTOMER').toUpperCase();
        if(active)setRole(raw==='ADMIN'?'admin':raw==='PROVIDER'?'provider':'customer');
      }catch{if(active)setRole(null);}
    }
    void resolve();
    setOpen(false);
    return()=>{active=false;};
  },[path]);

  useEffect(()=>{
    if(!open)return;
    const old=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKey);
    return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',onKey);};
  },[open]);

  async function signOut(){
    setOpen(false);
    await supabase.auth.signOut();
    window.location.href='/login';
  }

  if(!role)return null;
  const menu=menus[role];

  return <>
    {role==='customer'&&path.startsWith('/requests/')?<DispatchLivePanel/>:null}
    <div className="globalMenuHeaderWrap">
      <header className="globalMenuHeader" aria-label={`${menu.label} navigation`}>
        <Link href={role==='admin'?'/admin':role==='provider'?'/provider/jobs':'/'} className="globalMenuBrand" onClick={()=>setOpen(false)}>
          <span className="globalMenuBrandMark">F</span><span>FixIt</span>
        </Link>
        <div className="globalMenuHeaderActions">
          <Link className="globalMenuSecondary" href={menu.secondary.href}>{menu.secondary.label}</Link>
          <Link className="globalMenuPrimary" href={menu.primary.href}>{menu.primary.label}</Link>
          <button className="globalMenuToggle" type="button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
            {open?<span className="globalMenuClose">×</span>:<span className="globalMenuBars"><i/><i/><i/></span>}
          </button>
        </div>
      </header>
    </div>

    {open?<div className="globalMenuBackdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false);}}>
      <section className="globalMenuSheet" role="dialog" aria-modal="true" aria-label={`${menu.label} menu`}>
        <div className="globalMenuSheetTop">
          <Link href={role==='admin'?'/admin':role==='provider'?'/provider/jobs':'/'} className="globalMenuBrand" onClick={()=>setOpen(false)}><span className="globalMenuBrandMark">F</span><span>FixIt</span></Link>
          <button className="globalMenuToggle" type="button" aria-label="Close menu" onClick={()=>setOpen(false)}><span className="globalMenuClose">×</span></button>
        </div>
        <div className="globalMenuDivider"/>
        <div className="globalMenuRoleLabel">{menu.label}</div>
        <nav className="globalMenuFlatList" aria-label={`${menu.label} sections`}>
          {menu.items.map(item=><Link key={item.href+item.label} href={item.href} onClick={()=>setOpen(false)} className={itemIsActive(path,item.href)?'active':undefined}>{item.label}<span>→</span></Link>)}
        </nav>
        <div className="globalMenuFooter">
          <button className="globalMenuSignOut" type="button" onClick={()=>void signOut()}>Sign Out</button>
        </div>
      </section>
    </div>:null}
  </>;
}