'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';

type NavRole='customer'|'provider';

export default function RouteMobileNav(){
 const path=usePathname();
 const[sharedRole,setSharedRole]=useState<NavRole|null>(null);
 const customerRoute=path==='/'||path==='/requests'||path.startsWith('/requests/');
 const providerRoute=path.startsWith('/provider');
 const sharedRoute=path==='/messages'||path==='/profile';

 useEffect(()=>{
  if(customerRoute){setSharedRole('customer');return;}
  if(providerRoute){setSharedRole('provider');return;}
  if(!sharedRoute)return;
  let cancelled=false;
  void supabase.auth.getSession().then(async({data})=>{
   if(cancelled||!data.session)return;
   const{data:profile}=await supabase.from('auth_profiles').select('role').eq('user_id',data.session.user.id).maybeSingle();
   if(cancelled)return;
   if(profile?.role==='PROVIDER')setSharedRole('provider');
   else if(profile?.role==='CUSTOMER')setSharedRole('customer');
   else setSharedRole(null);
  });
  return()=>{cancelled=true;};
 },[customerRoute,providerRoute,sharedRoute,path]);

 if(path.startsWith('/requests/'))return <><DispatchLivePanel/><MobileNav role="customer"/></>;
 if(path==='/'||path==='/requests')return <MobileNav role="customer"/>;
 if(providerRoute)return <MobileNav role="provider"/>;
 if(sharedRoute&&sharedRole)return <MobileNav role={sharedRole}/>;
 return null;
}
