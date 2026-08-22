'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';

type NavRole='customer'|'provider';

function rememberedRole():NavRole|null{
 if(typeof window==='undefined')return null;
 try{const value=localStorage.getItem('fixit:app-mode')||localStorage.getItem('fixit:mobile-nav-role');return value==='customer'||value==='provider'?value:null;}catch{return null;}
}

export default function RouteMobileNav(){
 const path=usePathname();
 const[sharedRole,setSharedRole]=useState<NavRole|null>(rememberedRole);
 const customerRoute=path==='/'||path==='/requests'||path.startsWith('/requests/');
 const providerRoute=path.startsWith('/provider');
 const sharedRoute=path==='/messages'||path==='/profile';
 useEffect(()=>{
  const role:NavRole|null=providerRoute?'provider':customerRoute?'customer':sharedRoute?(rememberedRole()||'customer'):null;
  if(!role)return;
  setSharedRole(role);
  try{localStorage.setItem('fixit:mobile-nav-role',role);localStorage.setItem('fixit:app-mode',role);}catch{}
 },[customerRoute,providerRoute,sharedRoute,path]);
 if(path.startsWith('/requests/'))return <><DispatchLivePanel/><MobileNav role="customer"/></>;
 if(path==='/'||path==='/requests')return <MobileNav role="customer"/>;
 if(providerRoute)return <MobileNav role="provider"/>;
 if(sharedRoute&&sharedRole)return <MobileNav role={sharedRole}/>;
 return null;
}
