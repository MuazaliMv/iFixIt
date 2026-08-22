'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const SETUP_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-setup-data';
type Mode='customer'|'provider';type Props={mode:Mode;compact?:boolean;className?:string};
function remember(mode:Mode,message:string){try{localStorage.setItem('fixit:mobile-nav-role',mode);localStorage.setItem('fixit:app-mode',mode);sessionStorage.setItem('fixit:mode-toast',message);}catch{}}
export default function AppModeSwitch({mode,compact=false,className=''}:Props){
 const[busy,setBusy]=useState(false);const[providerReady,setProviderReady]=useState<boolean|null>(null);
 useEffect(()=>{if(mode!=='customer')return;void(async()=>{try{const{data}=await supabase.auth.getSession();if(!data.session)return;const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'get'})});if(!r.ok){setProviderReady(false);return;}const p=await r.json();setProviderReady(Boolean(p?.authProfile?.provider_approved&&p?.profile?.onboarding_status==='APPROVED'));}catch{setProviderReady(false);}})();},[mode]);
 async function logMode(jwt:string,next:Mode){try{await fetch(SETUP_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},body:JSON.stringify({action:'mode_event',mode:next})});}catch{}}
 async function switchMode(){if(busy)return;setBusy(true);try{const{data}=await supabase.auth.getSession();if(mode==='provider'){if(data.session)await logMode(data.session.access_token,'customer');remember('customer',"You're now viewing as Customer. Providers won't see this view.");window.location.href='/';return;}if(!data.session){window.location.href='/login';return;}await logMode(data.session.access_token,'provider');if(providerReady===true){remember('provider',"You're now viewing as Provider. Customers won't see this view.");window.location.href='/provider/today';return;}remember('provider',"Provider setup is required before customers can book you.");window.location.href='/provider/setup?from=mode-switch';}finally{setBusy(false);}}
 const text=mode==='provider'?'Switch to Customer Mode':'Switch to Provider Mode';return <button type="button" className={`modeSwitch ${compact?'compact':''} ${className}`.trim()} onClick={()=>void switchMode()} disabled={busy} aria-label={text}><span className={`modeDot ${mode}`}/>{compact?(mode==='provider'?'Customer':'Provider'):text}</button>;
}
