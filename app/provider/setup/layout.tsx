'use client';

import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';

export default function ProviderSetupLayout({children}:{children:ReactNode}){
 const[allow,setAllow]=useState(false);
 useEffect(()=>{void(async()=>{try{const{data}=await supabase.auth.getSession();if(!data.session){window.location.replace('/login');return;}const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'get'})});if(!r.ok){setAllow(true);return;}const p=await r.json();const approved=Boolean(p?.authProfile?.provider_approved&&p?.profile?.onboarding_status==='APPROVED');if(approved){window.location.replace('/provider/listings');return;}setAllow(true);}catch{setAllow(true);}})();},[]);
 if(!allow)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Checking provider status…</div></div></main>;
 return <>{children}</>;
}
