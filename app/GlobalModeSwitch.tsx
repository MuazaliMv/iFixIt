'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AppModeSwitch from './AppModeSwitch';

type Mode='customer'|'provider';
export default function GlobalModeSwitch(){
 const path=usePathname();const[mode,setMode]=useState<Mode>('customer');
 useEffect(()=>{if(path==='/'){setMode('customer');return;}try{setMode(localStorage.getItem('fixit:app-mode')==='provider'?'provider':'customer');}catch{setMode('customer');}},[path]);
 if(path!=='/'&&path!=='/profile')return null;
 return <div className="globalModeSwitch"><AppModeSwitch mode={mode} compact/></div>;
}
