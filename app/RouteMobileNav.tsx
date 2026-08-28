'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';
import { readSelectedWorkspace, subscribeToSelectedWorkspace } from '../lib/workspaceSelection';

type NavRole='customer'|'provider'|'admin';

export default function RouteMobileNav(){
 const path=usePathname();
 const[selectedRole,setSelectedRole]=useState<NavRole|null>(()=>readSelectedWorkspace());
 const providerApplicationRoute=path==='/provider/onboarding'||path.startsWith('/provider/onboarding/');
 const customerRoute=path==='/'||path==='/home'||path.startsWith('/home/')||path==='/requests'||path.startsWith('/requests/');
 const providerRoute=path.startsWith('/provider')&&!providerApplicationRoute;
 const adminRoute=path.startsWith('/admin');
 const sharedRoute=path==='/messages'||path==='/profile';

 useEffect(()=>subscribeToSelectedWorkspace(()=>setSelectedRole(readSelectedWorkspace())),[]);

 const role:NavRole|null=selectedRole||adminRoute?'admin':selectedRole||providerRoute?'provider':selectedRole||customerRoute||providerApplicationRoute?'customer':selectedRole;

 if(path.startsWith('/requests/'))return <><DispatchLivePanel/>{role?<MobileNav role={role}/>:null}</>;
 if((customerRoute||providerApplicationRoute||providerRoute||adminRoute||sharedRoute)&&role)return <MobileNav role={role}/>;
 return null;
}
