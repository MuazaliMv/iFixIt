export type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';
export type PortalRole='customer'|'provider'|'admin';

export function normalizeAccountRole(value:unknown):AccountRole{
 const raw=String(value??'CUSTOMER').toUpperCase();
 if(raw==='ADMIN')return 'ADMIN';
 if(raw==='PROVIDER')return 'PROVIDER';
 return 'CUSTOMER';
}

export function canAccessPortal(
 role:AccountRole,
 portal:PortalRole,
 providerApproved=false,
 providerSuspended=false,
):boolean{
 if(portal==='customer')return true;
 // Provider access is an additive capability, but it is always approval-gated.
 // The historical PROVIDER role alone must not bypass approval or suspension.
 if(portal==='provider')return providerApproved&&!providerSuspended;
 return role==='ADMIN';
}
