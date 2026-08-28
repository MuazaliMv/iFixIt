'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { readSelectedWorkspace, subscribeToSelectedWorkspace } from '../lib/workspaceSelection';

type Workspace='customer'|'provider'|null;
type Appearance='light'|'dark';

function getServerWorkspace(){return null;}

function preferredAppearance(workspace:Exclude<Workspace,null>):Appearance{
 try{
  const saved=localStorage.getItem(`ifixmv-${workspace}-theme`);
  if(saved==='light'||saved==='dark')return saved;
  if(window.matchMedia?.('(prefers-color-scheme: dark)').matches)return 'dark';
 }catch{}
 return 'light';
}

export default function WorkspaceThemeRuntime(){
 const selectedWorkspace=useSyncExternalStore(subscribeToSelectedWorkspace,readSelectedWorkspace,getServerWorkspace);
 const workspace:Workspace=selectedWorkspace==='customer'||selectedWorkspace==='provider'?selectedWorkspace:null;
 const[appearance,setAppearance]=useState<Appearance>('light');

 useEffect(()=>{
  const root=document.documentElement;
  if(!workspace){
   delete root.dataset.workspaceMode;
   delete root.dataset.workspaceAppearance;
   return;
  }
  const nextAppearance=preferredAppearance(workspace);
  setAppearance(nextAppearance);
  root.dataset.workspaceMode=workspace;
  root.dataset.workspaceAppearance=nextAppearance;
  return()=>{
   delete root.dataset.workspaceMode;
   delete root.dataset.workspaceAppearance;
  };
 },[workspace]);

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
