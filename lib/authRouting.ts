import { canAccessPortal, normalizeAccountRole, type AccountRole, type PortalRole } from './roleAccess';

export type AuthProfileLike={
 role?:unknown;
 provider_approved?:unknown;
 provider_suspended?:unknown;
 is_suspended?:unknown;
 account_status?:unknown;
};

export type RouteDecision={
 destination:string;
 workspace:PortalRole;
 role:AccountRole;
};

export function isSafeInternalPath(value:string):boolean{
 if(!value||!value.startsWith('/')||value.startsWith('//'))return false;
 try{
  const url=new URL(value,'https://ifixmv.com');
  return url.origin==='https://ifixmv.com';
 }catch{return false;}
}

export function isProviderApplicationRoute(path:string):boolean{
 return path==='/provider/onboarding'||path.startsWith('/provider/onboarding/');
}

export function portalForPath(path:string):PortalRole|null{
 if(path==='/admin'||path.startsWith('/admin/'))return 'admin';
 if(path==='/provider'||path.startsWith('/provider/')){
  if(isProviderApplicationRoute(path))return null;
  return 'provider';
 }
 if(
  path==='/home'||path.startsWith('/home/')||
  path==='/requests'||path.startsWith('/requests/')||
  path==='/messages'||path.startsWith('/messages/')||
  path==='/profile'||path.startsWith('/profile/')||
  path==='/notifications'||path.startsWith('/notifications/')
 )return 'customer';
 return null;
}

export function workspaceDestination(workspace:PortalRole):string{
 if(workspace==='admin')return '/admin';
 if(workspace==='provider')return '/provider/today';
 return '/home';
}

function providerApproved(profile:AuthProfileLike):boolean{
 return profile.provider_approved===true;
}

function providerSuspended(profile:AuthProfileLike):boolean{
 return profile.provider_suspended===true;
}

export function canProfileAccessPortal(profile:AuthProfileLike,portal:PortalRole):boolean{
 const role=normalizeAccountRole(profile.role);
 return canAccessPortal(role,portal,providerApproved(profile),providerSuspended(profile));
}

export function defaultWorkspaceForProfile(profile:AuthProfileLike):PortalRole{
 const role=normalizeAccountRole(profile.role);
 if(canProfileAccessPortal(profile,'admin'))return 'admin';
 if(canProfileAccessPortal(profile,'provider'))return 'provider';
 return 'customer';
}

export function canProfileAccessPath(profile:AuthProfileLike,path:string):boolean{
 if(!isSafeInternalPath(path))return false;
 if(isProviderApplicationRoute(path))return true;
 const portal=portalForPath(path);
 if(!portal)return true;
 return canProfileAccessPortal(profile,portal);
}

export function resolvePostLoginDestination(
 profile:AuthProfileLike,
 requestedPath='',
 rememberedWorkspace:PortalRole|null=null,
):RouteDecision{
 const role=normalizeAccountRole(profile.role);
 if(requestedPath&&canProfileAccessPath(profile,requestedPath)){
  const workspace=portalForPath(requestedPath)??defaultWorkspaceForProfile(profile);
  return{destination:requestedPath,workspace,role};
 }
 if(rememberedWorkspace&&canProfileAccessPortal(profile,rememberedWorkspace)){
  return{destination:workspaceDestination(rememberedWorkspace),workspace:rememberedWorkspace,role};
 }
 const workspace=defaultWorkspaceForProfile(profile);
 return{destination:workspaceDestination(workspace),workspace,role};
}
