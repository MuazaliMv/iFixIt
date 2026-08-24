'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';

type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';
type WorkspaceRole='customer'|'provider'|'admin';

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
        const r=await apiFetch('/api/user/profile');
        if(!active)return;
        if(r.status===401){router.replace(`/login?next=${encodeURIComponent(path)}`);return;}
        if(!r.ok)return;
        const p=await r.json();
        const raw=String(p?.profile?.role||'CUSTOMER').toUpperCase();
        const role:AccountRole=raw==='ADMIN'?'ADMIN':raw==='PROVIDER'?'PROVIDER':'CUSTOMER';
        const providerApproved=p?.profile?.provider_approved===true;

        // Permanent account role controls which workspaces may be selected.
        // The selected workspace controls which guard rules are active.
        const canUseProviderWorkspace=role==='ADMIN'||role==='PROVIDER'||providerApproved;
        const canUseAdminWorkspace=role==='ADMIN';

        let selected=readSelectedWorkspace(role);
        if(selected==='admin'&&!canUseAdminWorkspace)selected='customer';
        if(selected==='provider'&&!canUseProviderWorkspace)selected='customer';
        saveSelectedWorkspace(selected,role);

        // Provider onboarding is a Customer-mode application flow for accounts
        // that do not yet have Provider workspace access.
        if(providerApplicationRoute){
          if(canUseProviderWorkspace){
            if(active)router.replace(workspaceDestination(selected));
            return;
          }
          if(selected!=='customer'){
            selected='customer';
            saveSelectedWorkspace(selected,role);
          }
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
