'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';
import { canAccessPortal, normalizeAccountRole, type AccountRole, type PortalRole } from '../lib/roleAccess';

type WorkspaceRole=PortalRole;

function workspaceDestination(workspace:WorkspaceRole){
  if(workspace==='admin')return '/admin';
  if(workspace==='provider')return '/provider/today';
  return '/home';
}

function defaultWorkspace(role:AccountRole):WorkspaceRole{
  if(role==='ADMIN')return 'admin';
  if(role==='PROVIDER')return 'provider';
  return 'customer';
}

function readSelectedWorkspace(role:AccountRole):WorkspaceRole{
  try{
    const stored=String(localStorage.getItem('fixit:app-mode')||localStorage.getItem('fixit:mobile-nav-role')||'').toLowerCase();
    if(stored==='admin'||stored==='provider'||stored==='customer')return stored;
  }catch{}
  return defaultWorkspace(role);
}

function saveSelectedWorkspace(workspace:WorkspaceRole,role:AccountRole){
  try{
    localStorage.setItem('fixit:account-role',role.toLowerCase());
    localStorage.setItem('fixit:mobile-nav-role',workspace);
    localStorage.setItem('fixit:app-mode',workspace);
  }catch{}
}

function isProviderApplicationRoute(path:string){
  return path==='/provider/onboarding'||path.startsWith('/provider/onboarding/');
}

async function hasConfirmedSession(){
  try{
    const response=await apiFetch('/api/auth/session',{retryAuth:false});
    return response.ok;
  }catch{
    return false;
  }
}

export default function RoleAccessGuard(){
  const path=usePathname();
  const router=useRouter();

  useEffect(()=>{
    let active=true;

    async function enforce(){
      const providerApplicationRoute=isProviderApplicationRoute(path);
      const customerRoute=path==='/home'||path==='/requests'||path.startsWith('/requests/')||path==='/messages'||path.startsWith('/messages/');
      const providerRoute=!providerApplicationRoute&&(path==='/provider'||path.startsWith('/provider/'));
      const adminRoute=path==='/admin'||path.startsWith('/admin/');
      const roleControlled=customerRoute||providerRoute||adminRoute||providerApplicationRoute;
      if(!roleControlled)return;

      try{
        const response=await apiFetch('/api/user/profile');
        if(!active)return;

        if(response.status===401){
          // Never flash/redirect to Login on a single transient auth failure.
          // Confirm that the authoritative server session is really gone first.
          const sessionAlive=await hasConfirmedSession();
          if(!active)return;
          if(sessionAlive){
            router.refresh();
            return;
          }
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }

        // Network/server failures are not logout events. Keep the current shell/workspace.
        if(!response.ok)return;

        const payload=await response.json().catch(()=>({}));
        const role=normalizeAccountRole(payload?.profile?.role);
        const providerApproved=Boolean(payload?.profile?.provider_approved);

        let selected=readSelectedWorkspace(role);
        if(!canAccessPortal(role,selected,providerApproved))selected='customer';
        saveSelectedWorkspace(selected,role);

        if(providerApplicationRoute){
          if(canAccessPortal(role,'provider',providerApproved)){
            if(active)router.replace(workspaceDestination(selected==='customer'?'provider':selected));
            return;
          }
          if(selected!=='customer'){
            selected='customer';
            saveSelectedWorkspace(selected,role);
          }
          return;
        }

        if(adminRoute&&!canAccessPortal(role,'admin',providerApproved)){
          saveSelectedWorkspace('customer',role);
          if(active)router.replace('/home');
          return;
        }

        if(providerRoute&&!canAccessPortal(role,'provider',providerApproved)){
          saveSelectedWorkspace('customer',role);
          if(active)router.replace('/home');
          return;
        }

        const routeMatchesSelected=
          (selected==='customer'&&customerRoute)||
          (selected==='provider'&&providerRoute)||
          (selected==='admin'&&adminRoute);

        if(!routeMatchesSelected&&active){
          router.replace(workspaceDestination(selected));
        }
      }catch{}
    }

    void enforce();
    return()=>{active=false;};
  },[path,router]);

  return null;
}
