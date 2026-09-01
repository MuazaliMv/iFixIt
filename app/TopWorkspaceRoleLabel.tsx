'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { readSelectedWorkspace, subscribeToSelectedWorkspace } from '../lib/workspaceSelection';
import { useI18n } from './i18n/I18nProvider';

function hiddenRoute(path:string){
  return path.startsWith('/login')||path.startsWith('/register')||path.startsWith('/auth')||path.startsWith('/api/')||path.startsWith('/onboarding');
}

function getServerWorkspace(){return null;}

export default function TopWorkspaceRoleLabel(){
  const path=usePathname()||'/';
  const workspace=useSyncExternalStore(subscribeToSelectedWorkspace,readSelectedWorkspace,getServerWorkspace);
  const{t}=useI18n();
  if(hiddenRoute(path))return null;
  const label=path==='/provider/onboarding'||path.startsWith('/provider/onboarding/')
    ?t('provider_application')
    :workspace==='admin'?t('workspace_admin'):workspace==='provider'?t('workspace_provider'):t('workspace_customer');

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
      html[lang="dv"] .topWorkspaceRoleLabel{font-family:"Faruma","MV Waheed","Noto Sans Thaana",system-ui,sans-serif;line-height:1.6;}
      @media(max-width:960px){
        .topWorkspaceRoleLabel{top:calc(env(safe-area-inset-top,0px) + 38px);}
      }
      body:has(>.globalMainWorkspace .landingPage)>.topWorkspaceRoleLabel{display:none!important;}
    `}</style>
  </>;
}
