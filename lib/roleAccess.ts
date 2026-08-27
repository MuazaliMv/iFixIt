export type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';
export type PortalRole='customer'|'provider'|'admin';

export function normalizeAccountRole(value:unknown):AccountRole{
 const raw=String(value??'CUSTOMER').toUpperCase();
 if(raw==='ADMIN')return 'ADMIN';
 if(raw==='PROVIDER')return 'PROVIDER';
 return 'CUSTOMER';
}

export function canAccessPortal(role:AccountRole,portal:PortalRole,providerApproved=false):boolean{
 if(portal==='customer')return true;
 if(portal==='provider')return role==='ADMIN'||providerApproved;
 return role==='ADMIN';
}
