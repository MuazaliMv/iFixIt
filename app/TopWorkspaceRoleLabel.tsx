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

  return <>
    <span className="topWorkspaceRoleLabel" aria-live="polite">{label}</span>
    <style jsx global>{`
      .topWorkspaceRoleLabel{
        position:fixed;
        left:50%;
        top:41px;
        transform:translate(-50%,-50%);
        z-index:2050;
        max-width:48vw;
        padding:2px 8px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        pointer-events:none;
        background:#fff;
        color:#0f172a;
        font:800 clamp(12px,3.8vw,15px)/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        letter-spacing:.01em;
        text-align:center;
        border-radius:8px;
      }
      @media(max-width:960px){
        .topWorkspaceRoleLabel{top:calc(env(safe-area-inset-top,0px) + 38px);}
      }
      body:has(>.globalMainWorkspace .landingPage)>.topWorkspaceRoleLabel{display:none!important;}
    `}</style>
  </>;
}
