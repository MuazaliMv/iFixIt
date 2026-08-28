import type { PortalRole } from './roleAccess';

export const WORKSPACE_SELECTED_EVENT='fixit:workspace-selected';
export const WORKSPACE_STORAGE_KEY='fixit:selected-workspace';

const LEGACY_WORKSPACE_KEYS=[
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
    const selected=localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if(isPortalRole(selected))return selected;

    // One-time migration from the old keys. Once migrated, only the canonical
    // key is read so stale route-driven values cannot win later.
    for(const key of LEGACY_WORKSPACE_KEYS){
      const value=localStorage.getItem(key);
      if(isPortalRole(value)){
        localStorage.setItem(WORKSPACE_STORAGE_KEY,value);
        for(const legacyKey of LEGACY_WORKSPACE_KEYS)localStorage.removeItem(legacyKey);
        return value;
      }
    }
  }catch{}
  return null;
}

export function persistSelectedWorkspace(workspace:PortalRole){
  if(typeof window==='undefined')return;
  try{
    localStorage.setItem(WORKSPACE_STORAGE_KEY,workspace);
    for(const key of LEGACY_WORKSPACE_KEYS)localStorage.removeItem(key);
  }catch{}
  window.dispatchEvent(new CustomEvent<PortalRole>(WORKSPACE_SELECTED_EVENT,{detail:workspace}));
}

export function clearSelectedWorkspace(){
  if(typeof window==='undefined')return;
  try{
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    for(const key of LEGACY_WORKSPACE_KEYS)localStorage.removeItem(key);
  }catch{}
  window.dispatchEvent(new CustomEvent(WORKSPACE_SELECTED_EVENT));
}

export function subscribeToSelectedWorkspace(listener:()=>void){
  if(typeof window==='undefined')return()=>{};

  function onSelected(event:Event){
    const workspace=(event as CustomEvent<unknown>).detail;
    if(workspace===undefined||isPortalRole(workspace))listener();
  }

  function onStorage(event:StorageEvent){
    if(event.key!==WORKSPACE_STORAGE_KEY&&!LEGACY_WORKSPACE_KEYS.includes(event.key as typeof LEGACY_WORKSPACE_KEYS[number]))return;
    listener();
  }

  window.addEventListener(WORKSPACE_SELECTED_EVENT,onSelected);
  window.addEventListener('storage',onStorage);
  return()=>{
    window.removeEventListener(WORKSPACE_SELECTED_EVENT,onSelected);
    window.removeEventListener('storage',onStorage);
  };
}
