'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ServerSessionSignOutSync(){
 useEffect(()=>{
  const {data}=supabase.auth.onAuthStateChange((event)=>{
   if(event!=='SIGNED_OUT')return;
   void fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>null);
  });
  return()=>data.subscription.unsubscribe();
 },[]);
 return null;
}
