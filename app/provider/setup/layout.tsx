'use client';

import { ReactNode, useEffect, useState } from 'react';

const ONBOARDING_URL='/api/legacy-edge?service=provider-onboarding';
type ApplicationStatus='LOADING'|'DRAFT'|'SUBMITTED'|'REJECTED'|'SUSPENDED'|'APPROVED';

export default function ProviderSetupLayout({children}:{children:ReactNode}){
 const[allow,setAllow]=useState(false);const[status,setStatus]=useState<ApplicationStatus>('LOADING');
 useEffect(()=>{void(async()=>{try{const r=await fetch(ONBOARDING_URL,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get'})});if(r.status===401){window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);return;}if(!r.ok){setStatus('DRAFT');setAllow(true);return;}const p=await r.json().catch(()=>({}));const next=String(p?.profile?.onboarding_status||'DRAFT').toUpperCase() as ApplicationStatus;const approved=Boolean(p?.authProfile?.provider_approved&&next==='APPROVED');if(approved){window.location.replace('/provider/jobs');return;}setStatus(next);setAllow(true);}catch{setStatus('DRAFT');setAllow(true);}})();},[]);
 if(!allow)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Checking provider application…</div></div></main>;
 if(status==='SUBMITTED')return <main className="providerModePage"><div className="providerModeShell"><section className="providerModeCard providerSetupSuccess"><div className="providerSetupIcon success">✓</div><h1>Provider application submitted</h1><p>Your application is pending Admin review. Your customer account remains fully active while you wait.</p><span className="modeBadge provider">Pending review</span><div className="providerSetupActions"><a className="primary" href="/home">Return to Customer Mode</a></div></section></div></main>;
 if(status==='SUSPENDED')return <main className="providerModePage"><div className="providerModeShell"><section className="providerModeCard"><h1>Provider access suspended</h1><p>Your customer account remains active. Contact Admin if you need your provider access reviewed.</p><div className="providerSetupActions"><a className="primary" href="/home">Return to Customer Mode</a></div></section></div></main>;
 return <>{children}</>;
}
