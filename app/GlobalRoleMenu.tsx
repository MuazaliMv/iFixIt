'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import DispatchLivePanel from './DispatchLivePanel';

type Role='customer'|'provider'|'admin';
type MenuItem={href:string;label:string;group?:string};

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
      {href:'/',label:'Home',group:'Main'},
      {href:'/requests',label:'My Requests',group:'Main'},
      {href:'/#request',label:'New Request',group:'Main'},
      {href:'/messages',label:'Messages',group:'Communication'},
      {href:'/profile',label:'Profile',group:'Account'},
    ],
  },
  provider:{
    label:'Provider',
    secondary:{href:'/provider/availability',label:'Availability'},
    primary:{href:'/provider/jobs',label:'View Jobs'},
    items:[
      {href:'/provider/today',label:'Today',group:'Work'},
      {href:'/provider/jobs',label:'Jobs',group:'Work'},
      {href:'/provider/calendar',label:'Calendar',group:'Work'},
      {href:'/provider/messages',label:'Messages',group:'Communication'},
      {href:'/provider/setup',label:'Provider Setup',group:'Business'},
      {href:'/provider/earnings',label:'Earnings',group:'Business'},
      {href:'/profile',label:'Profile',group:'Account'},
    ],
  },
  admin:{
    label:'Admin',
    secondary:{href:'/admin/reports',label:'Reports'},
    primary:{href:'/admin',label:'Dashboard'},
    items:[
      {href:'/admin',label:'Dashboard',group:'Operations'},
      {href:'/admin/requests',label:'Request Management',group:'Operations'},
      {href:'/admin/escalations',label:'Attention / Escalations',group:'Operations'},
      {href:'/admin/users',label:'Users',group:'People'},
      {href:'/admin/providers',label:'Providers',group:'People'},
      {href:'/admin/services',label:'Services',group:'Marketplace'},
      {href:'/admin/locations',label:'Locations',group:'Marketplace'},
      {href:'/admin/reports',label:'Reports',group:'Insights'},
      {href:'/admin/settings',label:'Settings',group:'System'},
      {href:'/admin/audit-logs',label:'Audit Logs',group:'System'},
      {href:'/profile',label:'Profile',group:'Account'},
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
  const[openGroup,setOpenGroup]=useState<string|null>(null);

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

  const grouped=useMemo(()=>{
    if(!role)return [] as Array<[string,MenuItem[]]>;
    const map=new Map<string,MenuItem[]>();
    for(const item of menus[role].items){const key=item.group||'Menu';map.set(key,[...(map.get(key)||[]),item]);}
    return [...map.entries()];
  },[role]);

  useEffect(()=>{
    if(!role||!open)return;
    const activeGroup=grouped.find(([,items])=>items.some(item=>itemIsActive(path,item.href)))?.[0];
    if(activeGroup){
      setOpenGroup(activeGroup);
      try{localStorage.setItem(`fixit-menu-group-${role}`,activeGroup);}catch{}
      return;
    }
    try{
      const remembered=localStorage.getItem(`fixit-menu-group-${role}`);
      const valid=remembered&&grouped.some(([group])=>group===remembered);
      setOpenGroup(valid?remembered:grouped[0]?.[0]||null);
    }catch{setOpenGroup(grouped[0]?.[0]||null);}
  },[grouped,open,path,role]);

  if(!role)return null;
  const menu=menus[role];

  const toggleGroup=(group:string)=>{
    const next=openGroup===group?null:group;
    setOpenGroup(next);
    try{
      if(next)localStorage.setItem(`fixit-menu-group-${role}`,next);
      else localStorage.removeItem(`fixit-menu-group-${role}`);
    }catch{}
  };

  return <>
    {role==='customer'&&path.startsWith('/requests/')?<DispatchLivePanel/>:null}
    <div className="globalMenuHeaderWrap">
      <header className="globalMenuHeader" aria-label={`${menu.label} navigation`}>
        <Link href={role==='admin'?'/admin':role==='provider'?'/provider/today':'/'} className="globalMenuBrand" onClick={()=>setOpen(false)}>
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
          <Link href={role==='admin'?'/admin':role==='provider'?'/provider/today':'/'} className="globalMenuBrand" onClick={()=>setOpen(false)}><span className="globalMenuBrandMark">F</span><span>FixIt</span></Link>
          <div className="globalMenuHeaderActions">
            <Link className="globalMenuSecondary" href={menu.secondary.href} onClick={()=>setOpen(false)}>{menu.secondary.label}</Link>
            <Link className="globalMenuPrimary" href={menu.primary.href} onClick={()=>setOpen(false)}>{menu.primary.label}</Link>
            <button className="globalMenuToggle" type="button" aria-label="Close menu" onClick={()=>setOpen(false)}><span className="globalMenuClose">×</span></button>
          </div>
        </div>
        <div className="globalMenuDivider"/>
        <div className="globalMenuRoleLabel">{menu.label}</div>
        <nav className="globalMenuLinks" aria-label={`${menu.label} sections`}>
          {grouped.map(([group,items])=>{
            const expanded=openGroup===group;
            const hasActive=items.some(item=>itemIsActive(path,item.href));
            const panelId=`fixit-menu-${role}-${group.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
            return <div className={`globalMenuGroup${expanded?' expanded':''}${hasActive?' hasActive':''}`} key={group}>
              <button className="globalMenuGroupToggle" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={()=>toggleGroup(group)}>
                <span>{group}</span><span className="globalMenuGroupChevron" aria-hidden="true">⌄</span>
              </button>
              <div id={panelId} className="globalMenuSubmenu" hidden={!expanded}>
                {items.map(item=><Link key={item.href+item.label} href={item.href} onClick={()=>setOpen(false)} className={itemIsActive(path,item.href)?'active':''}>{item.label}<span>→</span></Link>)}
              </div>
            </div>;
          })}
        </nav>
      </section>
    </div>:null}
  </>;
}
