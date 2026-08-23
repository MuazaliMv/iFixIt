'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';

function destination(role:AccountRole){
  if(role==='ADMIN')return '/admin';
  if(role==='PROVIDER')return '/provider/jobs';
  return '/';
}

export default function RoleAccessGuard(){
  const path=usePathname();
  const router=useRouter();

  useEffect(()=>{
    let active=true;

    async function enforce(){
      const customerRoute=path==='/'||path==='/requests'||path.startsWith('/requests/')||path==='/messages'||path.startsWith('/messages/');
      const providerRoute=path==='/provider'||path.startsWith('/provider/');
      const adminRoute=path==='/admin'||path.startsWith('/admin/');
      const roleControlled=customerRoute||providerRoute||adminRoute;
      if(!roleControlled)return;

      try{
        const r=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'});
        if(!active)return;
        if(r.status===401){router.replace(`/login?next=${encodeURIComponent(path)}`);return;}
        if(!r.ok)return;
        const p=await r.json();
        const raw=String(p?.profile?.role||'CUSTOMER').toUpperCase();
        const role:AccountRole=raw==='ADMIN'?'ADMIN':raw==='PROVIDER'?'PROVIDER':'CUSTOMER';

        try{
          const navRole=role==='ADMIN'?'admin':providerRoute&&role==='PROVIDER'?'provider':'customer';
          localStorage.setItem('fixit:account-role',role.toLowerCase());
          localStorage.setItem('fixit:mobile-nav-role',navRole);
          if(role!=='ADMIN')localStorage.setItem('fixit:app-mode',navRole);
          else localStorage.removeItem('fixit:app-mode');
        }catch{}

        const wrongRoute=
          (role==='ADMIN'&&(customerRoute||providerRoute))||
          (role==='PROVIDER'&&adminRoute)||
          (role==='CUSTOMER'&&(providerRoute||adminRoute));

        if(wrongRoute&&active)router.replace(destination(role));
      }catch{}
    }

    void enforce();
    return()=>{active=false;};
  },[path,router]);

  return null;
}
