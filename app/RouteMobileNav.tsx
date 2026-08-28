'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';
import { readSelectedWorkspace, subscribeToSelectedWorkspace } from '../lib/workspaceSelection';

type NavRole='customer'|'provider'|'admin';

function getServerWorkspace():NavRole|null{return null;}

export default function RouteMobileNav(){
 const path=usePathname()||'/';
 const router=useRouter();
 const selectedWorkspace=useSyncExternalStore(
  subscribeToSelectedWorkspace,
  readSelectedWorkspace,
  getServerWorkspace,
 );
 const role:NavRole=selectedWorkspace??'customer';
 const providerApplicationRoute=path==='/provider/onboarding'||path.startsWith('/provider/onboarding/');
 const customerRoute=path==='/'||path==='/home'||path.startsWith('/home/')||path==='/requests'||path.startsWith('/requests/');
 const sharedRoute=path==='/messages'||path.startsWith('/messages/')||path==='/profile'||path.startsWith('/profile/');

 // The saved workspace is the single source of truth. Routes may guard access,
 // but must never derive or persist a different workspace from the pathname.
 useEffect(()=>{
  if(providerApplicationRoute||!customerRoute||role==='customer')return;
  if(role==='admin'){
   router.replace(path.startsWith('/requests')?'/admin/requests':'/admin');
   return;
  }
  router.replace(path.startsWith('/requests')?'/provider/jobs':'/provider/today');
 },[customerRoute,path,providerApplicationRoute,role,router]);

 if(providerApplicationRoute)return <MobileNav role="customer"/>;
 if(customerRoute&&role!=='customer')return null;
 if(path.startsWith('/requests/')&&role==='customer')return <><DispatchLivePanel/><MobileNav role="customer"/></>;
 if(customerRoute)return <MobileNav role="customer"/>;
 if(path.startsWith('/provider'))return role==='provider'?<MobileNav role="provider"/>:null;
 if(path.startsWith('/admin'))return role==='admin'?<MobileNav role="admin"/>:null;
 if(sharedRoute)return <MobileNav role={role}/>;
 return null;
}
