'use client';

import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import DispatchLivePanel from './DispatchLivePanel';

export default function RouteMobileNav(){
 const path=usePathname();
 if(path.startsWith('/requests/'))return <><DispatchLivePanel/><MobileNav role="customer"/></>;
 if(path==='/'||path==='/requests')return <MobileNav role="customer"/>;
 if(path.startsWith('/provider')&&path!=='/provider/earnings')return <MobileNav role="provider"/>;
 return null;
}
