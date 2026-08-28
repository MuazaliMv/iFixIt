import type { PortalRole } from './roleAccess';

export const WORKSPACE_SELECTED_EVENT='fixit:workspace-selected';

const workspaceKeys=[
  'fixit:mobile-nav-role',
  'ifixmv-login-workspace',
  'fixit:app-mode',
] as const;

function isPortalRole(value:unknown):value is PortalRole{
  return value==='customer'||value==='provider'||value==='admin';
}

export function readSelectedWorkspace():PortalRole|null{
  if(typeof window==='undefined')return null;
  try{
    for(const key of workspaceKeys){
      const value=localStorage.getItem(key);
      if(isPortalRole(value))return value;
    }
  }catch{}
  return null;
}

export function persistSelectedWorkspace(workspace:PortalRole){
  if(typeof window==='undefined')return;
  try{
    for(const key of workspaceKeys)localStorage.setItem(key,workspace);
  }catch{}
  window.dispatchEvent(new CustomEvent<PortalRole>(WORKSPACE_SELECTED_EVENT,{detail:workspace}));
}

export function subscribeToSelectedWorkspace(listener:()=>void){
  if(typeof window==='undefined')return()=>{};

  function onSelected(event:Event){
    const workspace=(event as CustomEvent<unknown>).detail;
    if(isPortalRole(workspace))listener();
  }

  function onStorage(event:StorageEvent){
    if(event.key&&!workspaceKeys.includes(event.key as typeof workspaceKeys[number]))return;
    listener();
  }

  window.addEventListener(WORKSPACE_SELECTED_EVENT,onSelected);
  window.addEventListener('storage',onStorage);
  return()=>{
    window.removeEventListener(WORKSPACE_SELECTED_EVENT,onSelected);
    window.removeEventListener('storage',onStorage);
  };
}
