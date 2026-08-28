'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';
import {
  canProfileAccessPortal,
  isProviderApplicationRoute,
  portalForPath,
  resolvePostLoginDestination,
  type AuthProfileLike,
} from '../lib/authRouting';
import { normalizeAccountRole, type PortalRole } from '../lib/roleAccess';

function saveSelectedWorkspace(workspace:PortalRole,profile:AuthProfileLike){
  const role=normalizeAccountRole(profile.role);
  try{
    localStorage.setItem('fixit:account-role',role.toLowerCase());
    localStorage.setItem('fixit:mobile-nav-role',workspace);
    localStorage.setItem('fixit:app-mode',workspace);
    localStorage.setItem('ifixmv-login-workspace',workspace);
  }catch{}
}

export default function RoleAccessGuard(){
  const path=usePathname();
  const router=useRouter();

  useEffect(()=>{
    let active=true;

    async function enforce(){
      const providerApplicationRoute=isProviderApplicationRoute(path);
      const workspace=portalForPath(path);
      const roleControlled=workspace!==null||providerApplicationRoute;
      if(!roleControlled)return;

      try{
        // The secure session endpoint is the single client-side source of truth for
        // authentication and workspace permissions, including provider suspension.
        const response=await apiFetch('/api/auth/session',{retryAuth:false,cache:'no-store'});
        if(!active)return;

        if(response.status===401){
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }

        // Permission-service/network failures are not logout events. The server
        // proxy already fails protected provider/admin routes closed.
        if(!response.ok)return;

        const payload=await response.json().catch(()=>({}));
        if(payload?.authenticated!==true)return;
        const profile=(payload?.profile||{}) as AuthProfileLike;

        if(providerApplicationRoute)return;

        if(workspace&&!canProfileAccessPortal(profile,workspace)){
          const fallback=resolvePostLoginDestination(profile);
          saveSelectedWorkspace(fallback.workspace,profile);
          if(active&&fallback.destination!==path)router.replace(fallback.destination);
          return;
        }

        if(workspace&&canProfileAccessPortal(profile,workspace)){
          saveSelectedWorkspace(workspace,profile);
        }
      }catch{}
    }

    void enforce();
    return()=>{active=false;};
  },[path,router]);

  return null;
}
