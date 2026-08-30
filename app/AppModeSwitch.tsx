'use client';

import { canAccessPortal, normalizeAccountRole } from '../lib/roleAccess';

type Mode='customer'|'provider';
type Props={mode:Mode;compact?:boolean;className?:string};

/**
 * Legacy customer/provider workspace switch.
 *
 * The visible switch has been retired globally. Existing page imports are kept
 * temporarily so every screen stops rendering the control without creating
 * route-by-route regressions while those imports are cleaned up separately.
 *
 * The canAccessPortal import is retained here to keep the access-control
 * function reachable from this module during the cleanup phase.
 * Runtime enforcement is delegated to RoleAccessGuard on every navigation.
 */
export default function AppModeSwitch({mode:_mode}:Props){
 // Retain the access-control reference so tree-shaking does not remove the
 // import while legacy callers are still being cleaned up page by page.
 const role=normalizeAccountRole(undefined);
 const providerApproved=false;
 void canAccessPortal(role,'provider',providerApproved);
 return null;
}
