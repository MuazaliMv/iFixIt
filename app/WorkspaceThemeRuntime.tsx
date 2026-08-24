'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Workspace='customer'|'provider'|null;
type Appearance='light'|'dark';

function workspaceFor(path:string):Workspace{
 if(path.startsWith('/provider'))return 'provider';
 if(path==='/home'||path.startsWith('/requests')||path.startsWith('/messages')||path.startsWith('/profile')||path.startsWith('/notifications')||path.startsWith('/change-password'))return 'customer';
 return null;
}

function preferredAppearance(workspace:Exclude<Workspace,null>):Appearance{
 try{
  const saved=localStorage.getItem(`ifixmv-${workspace}-theme`);
  if(saved==='light'||saved==='dark')return saved;
  if(window.matchMedia?.('(prefers-color-scheme: dark)').matches)return 'dark';
 }catch{}
 return 'light';
}

export default function WorkspaceThemeRuntime(){
 const path=usePathname();
 const[workspace,setWorkspace]=useState<Workspace>(null);
 const[appearance,setAppearance]=useState<Appearance>('light');

 useEffect(()=>{
  const root=document.documentElement;
  const nextWorkspace=workspaceFor(path);
  setWorkspace(nextWorkspace);
  if(!nextWorkspace){
   delete root.dataset.workspaceMode;
   delete root.dataset.workspaceAppearance;
   return;
  }
  const nextAppearance=preferredAppearance(nextWorkspace);
  setAppearance(nextAppearance);
  root.dataset.workspaceMode=nextWorkspace;
  root.dataset.workspaceAppearance=nextAppearance;
  return()=>{
   delete root.dataset.workspaceMode;
   delete root.dataset.workspaceAppearance;
  };
 },[path]);

 function toggleAppearance(){
  if(!workspace)return;
  const next:Appearance=appearance==='dark'?'light':'dark';
  setAppearance(next);
  document.documentElement.dataset.workspaceAppearance=next;
  try{localStorage.setItem(`ifixmv-${workspace}-theme`,next);}catch{}
 }

 if(!workspace)return null;
 return <button type="button" className="workspaceThemeToggle" onClick={toggleAppearance} aria-label={`Switch ${workspace} workspace to ${appearance==='dark'?'light':'dark'} mode`} title={`Switch to ${appearance==='dark'?'light':'dark'} mode`}>
  {appearance==='dark'?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>}
 </button>;
}
