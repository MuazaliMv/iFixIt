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
 // Provider capability is additive and approval-gated. Admin status alone must
 // never grant provider access; an Admin can use the provider portal only after
 // the same provider approval applied to any other account.
 if(portal==='provider')return role==='PROVIDER'||providerApproved;
 return role==='ADMIN';
}
