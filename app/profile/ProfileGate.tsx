'use client';

import { useEffect, useState } from 'react';
import ProfileClient from './ProfileClient';

export default function ProfileGate(){
 const[ready,setReady]=useState(false);
 useEffect(()=>{
  let active=true;
  void(async()=>{
   try{
    const response=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'});
    if(response.status===401){window.location.replace('/login?next=%2Fprofile');return;}
    const payload=await response.json().catch(()=>({}));
    if(!active)return;
    const phone=String(payload?.profile?.phone_number||'').replace(/\D/g,'');
    const verified=Boolean(payload?.profile?.is_phone_verified||payload?.profile?.phone_verified_at);
    if(!phone||!verified){window.location.replace('/profile/verify-phone');return;}
    setReady(true);
   }catch{if(active)setReady(true);}
  })();
  return()=>{active=false;};
 },[]);
 if(!ready)return <main className="profileRedesignPage"><div className="profileRedesignShell"><p>Checking verified contact number…</p></div></main>;
 return <ProfileClient/>;
}
