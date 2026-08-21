'use client';

import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';

export default function RouteMobileNav(){
 const path=usePathname();
 if(path==='/'||path==='/requests'||path.startsWith('/requests/'))return <MobileNav role="customer"/>;
 if(path.startsWith('/provider')&&path!=='/provider/earnings')return <MobileNav role="provider"/>;
 return null;
}
