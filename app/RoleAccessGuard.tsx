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
      const workspace=portalForPath(path);
      const roleControlled=workspace!==null||providerApplicationRoute;
      if(!roleControlled)return;

      try{
        const response=await apiFetch('/api/user/profile');
        if(!active)return;

        if(response.status===401){
          // Only the authoritative secure session is allowed to send the user
          // back to Login. Profile/API failures alone are never logout signals.
          const sessionAlive=await hasConfirmedSession();
          if(!active)return;
          if(sessionAlive){
            router.refresh();
            return;
          }
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }

        // 404/5xx/profile-service failures are data errors, not authentication
        // transitions. Keep the current route and let its error UI offer retry.
        if(!response.ok)return;

        const payload=await response.json().catch(()=>({}));
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
