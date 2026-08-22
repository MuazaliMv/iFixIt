'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';

type NavRole='customer'|'provider';

function rememberedRole():NavRole|null{
 if(typeof window==='undefined')return null;
 try{const value=localStorage.getItem('fixit:mobile-nav-role');return value==='customer'||value==='provider'?value:null;}catch{return null;}
}

export default function RouteMobileNav(){
 const path=usePathname();
 const[sharedRole,setSharedRole]=useState<NavRole|null>(rememberedRole);
 const customerRoute=path==='/'||path==='/requests'||path.startsWith('/requests/');
 const providerRoute=path.startsWith('/provider');
 const sharedRoute=path==='/messages'||path==='/profile';

 useEffect(()=>{
  if(customerRoute){setSharedRole('customer');try{localStorage.setItem('fixit:mobile-nav-role','customer');}catch{}return;}
  if(providerRoute){setSharedRole('provider');try{localStorage.setItem('fixit:mobile-nav-role','provider');}catch{}return;}
  if(!sharedRoute)return;
  const cached=rememberedRole();
  if(cached)setSharedRole(cached);
  let cancelled=false;
  void supabase.auth.getSession().then(async({data})=>{
   if(cancelled||!data.session)return;
   const{data:profile}=await supabase.from('auth_profiles').select('role').eq('user_id',data.session.user.id).maybeSingle();
   if(cancelled)return;
   const role:NavRole|null=profile?.role==='PROVIDER'?'provider':profile?.role==='CUSTOMER'?'customer':cached;
   if(role){setSharedRole(role);try{localStorage.setItem('fixit:mobile-nav-role',role);}catch{}}
  });
  return()=>{cancelled=true;};
 },[customerRoute,providerRoute,sharedRoute,path]);

 if(path.startsWith('/requests/'))return <><DispatchLivePanel/><MobileNav role="customer"/></>;
 if(path==='/'||path==='/requests')return <MobileNav role="customer"/>;
 if(providerRoute)return <MobileNav role="provider"/>;
 if(sharedRoute&&sharedRole)return <MobileNav role={sharedRole}/>;
 return null;
}
