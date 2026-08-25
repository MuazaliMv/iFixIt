'use client';

import { usePathname } from 'next/navigation';

function labelForPath(path:string){
  if(path.startsWith('/admin'))return 'Admin';
  if(path.startsWith('/provider')&&!path.startsWith('/provider/onboarding'))return 'Service Provider';
  return 'Customer';
}

function hiddenRoute(path:string){
  return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');
}

export default function TopWorkspaceRoleLabel(){
  const path=usePathname()||'/';
  if(hiddenRoute(path))return null;
  const label=labelForPath(path);

  return <span className="topWorkspaceRoleLabel" aria-live="polite">{label}</span>;
}
