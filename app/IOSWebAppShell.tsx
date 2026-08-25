'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const hiddenPrefixes=['/admin','/provider','/login','/register','/auth','/api'];

function Icon({name}:{name:'home'|'requests'|'new'|'profile'}){
 const paths={
  home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></>,
  requests:<><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  new:<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
  profile:<><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.9-4 3.5-6 7.5-6s6.6 2 7.5 6"/></>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function IOSWebAppShell(){
 const pathname=usePathname()||'/';
 const [standalone,setStandalone]=useState(false);
 const hidden=hiddenPrefixes.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));
 useEffect(()=>{
  const iosStandalone=(window.navigator as Navigator & {standalone?:boolean}).standalone===true;
  const media=window.matchMedia?.('(display-mode: standalone)').matches===true;
  setStandalone(iosStandalone||media);
  document.documentElement.classList.toggle('ifix-ios-standalone',iosStandalone||media);
  return()=>document.documentElement.classList.remove('ifix-ios-standalone');
 },[]);
 if(hidden)return null;
 const active=(key:string)=>key==='home'?pathname==='/'||pathname==='/home':key==='requests'?pathname.startsWith('/requests'):key==='profile'?pathname.startsWith('/profile'):false;
 return <nav className="iosTabBar" aria-label="Customer app navigation" data-standalone={standalone?'true':'false'}>
  <a href="/" className={active('home')?'active':''}><Icon name="home"/><span>Home</span></a>
  <a href="/requests" className={active('requests')?'active':''}><Icon name="requests"/><span>Requests</span></a>
  <a href="/?new=1" className="iosTabNew"><Icon name="new"/><span>New</span></a>
  <a href="/profile" className={active('profile')?'active':''}><Icon name="profile"/><span>Profile</span></a>
 </nav>;
}
