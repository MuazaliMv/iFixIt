'use client';

import { usePathname } from 'next/navigation';
import AppModeSwitch from './AppModeSwitch';

export default function GlobalModeSwitch(){
 const path=usePathname();
 if(path!=='/'&&path!=='/profile')return null;
 return <div className="globalModeSwitch"><AppModeSwitch mode="customer" compact/></div>;
}
