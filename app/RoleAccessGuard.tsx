'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/apiClient';

type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';

function destination(role:AccountRole){
  if(role==='ADMIN')return '/admin';
  if(role==='PROVIDER')return '/provider/jobs';
  return '/home';
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
      const customerRoute=path==='/home'||path==='/requests'||path.startsWith('/requests/')||path==='/messages'||path.startsWith('/messages/')||providerApplicationRoute;
      const providerRoute=!providerApplicationRoute&&(path==='/provider'||path.startsWith('/provider/'));
      const adminRoute=path==='/admin'||path.startsWith('/admin/');
      const roleControlled=customerRoute||providerRoute||adminRoute;
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

        // Workspace access is separate from permanent account identity.
        // Admin includes all three workspaces by default. Provider accounts
        // and approved customer accounts can use Provider mode. Every signed-in
        // account can use Customer mode. Only Admin accounts can use Admin mode.
        const canUseCustomerWorkspace=true;
        const canUseProviderWorkspace=role==='ADMIN'||role==='PROVIDER'||providerApproved;
        const canUseAdminWorkspace=role==='ADMIN';

        try{
          const navRole=adminRoute&&canUseAdminWorkspace?'admin':providerRoute&&canUseProviderWorkspace?'provider':'customer';
          localStorage.setItem('fixit:account-role',role.toLowerCase());
          localStorage.setItem('fixit:mobile-nav-role',navRole);
          localStorage.setItem('fixit:app-mode',navRole);
        }catch{}

        const wrongRoute=
          (providerRoute&&!canUseProviderWorkspace)||
          (customerRoute&&!canUseCustomerWorkspace)||
          (adminRoute&&!canUseAdminWorkspace);

        if(wrongRoute&&active){
          if(providerRoute&&!canUseProviderWorkspace){
            router.replace('/provider/onboarding');
            return;
          }
          router.replace(destination(role));
        }
      }catch{}
    }

    void enforce();
    return()=>{active=false;};
  },[path,router]);

  return null;
}
