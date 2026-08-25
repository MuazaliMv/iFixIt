'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';
import { canAccessPortal, normalizeAccountRole, type AccountRole, type PortalRole } from '../lib/roleAccess';

type WorkspaceRole=PortalRole;

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

function routeWorkspace(path:string):WorkspaceRole|null{
  if(path==='/admin'||path.startsWith('/admin/'))return 'admin';
  if(path==='/provider'||path.startsWith('/provider/')){
    if(isProviderApplicationRoute(path))return null;
    return 'provider';
  }
  if(
    path==='/home'||path.startsWith('/home/')||
    path==='/requests'||path.startsWith('/requests/')||
    path==='/messages'||path.startsWith('/messages/')
  )return 'customer';
  return null;
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
      const workspace=routeWorkspace(path);
      const roleControlled=workspace!==null||providerApplicationRoute;
      if(!roleControlled)return;

      try{
        const response=await apiFetch('/api/user/profile');
        if(!active)return;

        if(response.status===401){
          // A single profile 401 can be transient while secure auth state settles.
          // Only redirect to Login after the authoritative session endpoint agrees.
          const sessionAlive=await hasConfirmedSession();
          if(!active)return;
          if(sessionAlive){
            router.refresh();
            return;
          }
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }

        // Network/server/permission-service failures are not navigation events.
        // Keep the current shell and workspace instead of redirecting elsewhere.
        if(!response.ok)return;

        const payload=await response.json().catch(()=>({}));
        const role=normalizeAccountRole(payload?.profile?.role);
        const providerApproved=Boolean(payload?.profile?.provider_approved);

        if(providerApplicationRoute){
          // Approved providers may still view the application route without being
          // forced into another workspace. This avoids non-user-driven redirects.
          return;
        }

        if(workspace==='admin'&&!canAccessPortal(role,'admin',providerApproved)){
          saveSelectedWorkspace('customer',role);
          if(active)router.replace('/home');
          return;
        }

        if(workspace==='provider'&&!canAccessPortal(role,'provider',providerApproved)){
          saveSelectedWorkspace('customer',role);
          if(active)router.replace('/home');
          return;
        }

        // The URL is authoritative after navigation succeeds. Persist it only so
        // the global switcher reflects the workspace the user is actually viewing.
        if(workspace&&canAccessPortal(role,workspace,providerApproved)){
          saveSelectedWorkspace(workspace,role);
        }
      }catch{}
    }

    void enforce();
    return()=>{active=false;};
  },[path,router]);

  return null;
}
