'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';

type NavRole='customer'|'provider'|'admin';

function rememberedRole():NavRole|null{
 if(typeof window==='undefined')return null;
 try{const value=localStorage.getItem('fixit:mobile-nav-role')||localStorage.getItem('fixit:app-mode');return value==='customer'||value==='provider'||value==='admin'?value:null;}catch{return null;}
}

export default function RouteMobileNav(){
 const path=usePathname();
 const[sharedRole,setSharedRole]=useState<NavRole|null>(rememberedRole);
 const customerRoute=path==='/'||path==='/requests'||path.startsWith('/requests/');
 const providerRoute=path.startsWith('/provider');
 const adminRoute=path.startsWith('/admin');
 const sharedRoute=path==='/messages'||path==='/profile';
 useEffect(()=>{
  let active=true;
  async function resolveRole(){
   let role:NavRole|null=adminRoute?'admin':providerRoute?'provider':customerRoute?'customer':null;
   if(sharedRoute){
    try{
     const controller=new AbortController();
     const timer=setTimeout(()=>controller.abort(),7000);
     const r=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
     clearTimeout(timer);
     if(r.ok){const p=await r.json();const accountRole=String(p?.profile?.role||'').toUpperCase();role=accountRole==='ADMIN'?'admin':accountRole==='PROVIDER'?'provider':'customer';}
     else if(r.status===401){role=null;}
    }catch{}
    role=role||rememberedRole()||'customer';
   }
   if(!role||!active)return;
   setSharedRole(role);
   try{localStorage.setItem('fixit:mobile-nav-role',role);if(role!=='admin')localStorage.setItem('fixit:app-mode',role);}catch{}
  }
  void resolveRole();return()=>{active=false;};
 },[customerRoute,providerRoute,adminRoute,sharedRoute,path]);
 if(path.startsWith('/requests/'))return <><DispatchLivePanel/><MobileNav role="customer"/></>;
 if(path==='/'||path==='/requests')return <MobileNav role="customer"/>;
 if(providerRoute)return <MobileNav role="provider"/>;
 if(adminRoute)return <MobileNav role="admin"/>;
 if(sharedRoute&&sharedRole)return <MobileNav role={sharedRole}/>;
 return null;
}
