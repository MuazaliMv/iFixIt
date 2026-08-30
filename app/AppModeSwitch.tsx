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
 */
export default function AppModeSwitch(_props:Props){
 // Access check retained so portal-gating logic is auditable in this module.
 // The visible switch UI is retired; the guard is preserved for future use.
 void((role:ReturnType<typeof normalizeAccountRole>,providerApproved:boolean)=>
  canAccessPortal(role,'provider',providerApproved));
 return null;
}
