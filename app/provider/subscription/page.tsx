'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';

type Subscription={status:'TRIAL'|'ACTIVE'|'EXPIRED';active:boolean;daysRemaining:number;trial_started_at:string;current_period_ends_at:string;priceMvr:number;gateway:string};
const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-subscription';

export default function ProviderSubscriptionPage(){
 const[sub,setSub]=useState<Subscription|null>(null);const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[notice,setNotice]=useState('');
 useEffect(()=>{void load();},[]);
 async function session(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return null;}return data.session;}
 async function post(action:string){const s=await session();if(!s)return null;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({action})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load subscription');return p;}
 async function load(){setLoading(true);try{const p=await post('status');setSub(p?.subscription||null);setNotice('');}catch(e){setNotice(e instanceof Error?e.message:'Unable to load subscription.');}finally{setLoading(false);}}
 async function subscribe(){setBusy(true);setNotice('');try{const p=await post('start_payment');if(p?.checkoutUrl)window.location.href=p.checkoutUrl;else setNotice('Payment gateway is not ready yet.');}catch(e){setNotice(e instanceof Error?e.message:'Unable to start payment.');}finally{setBusy(false);}}
 const expiry=sub?.current_period_ends_at?new Date(sub.current_period_ends_at).toLocaleDateString(undefined,{day:'2-digit',month:'long',year:'numeric'}):'Not set';
 if(loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading subscription…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Subscription</h1><p>Keep provider access active and continue receiving customer requests.</p></div><div className="providerHeaderActions"><AppModeSwitch mode="provider" compact/></div></header>
  {sub?<section className={`providerModeCard ${sub.status==='EXPIRED'?'providerSubscriptionExpired':''}`}><div className="providerModeHero"><div><span className={`modeBadge ${sub.active?'provider':'customer'}`}>{sub.status==='TRIAL'?'FREE TRIAL':sub.status}</span><h2>{sub.status==='EXPIRED'?'Your subscription has expired.':sub.status==='TRIAL'?`${sub.daysRemaining} day${sub.daysRemaining===1?'':'s'} of free access remaining`:'Subscription active'}</h2><p>{sub.status==='EXPIRED'?'Please renew to continue using the provider dashboard and service listings.':`Access is available until ${expiry}.`}</p></div>{sub.active?<a className="secondary" href="/provider/today">Provider Dashboard</a>:null}</div></section>:null}
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Monthly provider plan</h2><p>One simple plan for provider access.</p></div><strong className="providerPlanPrice">250 MVR <small>/ 30 days</small></strong></div><div className="providerReadableData uiSpaceTopBase"><div><dt>Free trial</dt><dd>30 days for new providers</dd></div><div><dt>Renewal period</dt><dd>30 days per successful payment</dd></div><div><dt>Payment gateway</dt><dd>Bank of Maldives (BML)</dd></div></div>{sub?.status==='TRIAL'?<p className="muted uiSpaceTopBase">Your free trial ends on {expiry}. You do not need to pay until the trial expires.</p>:null}{sub?.status==='ACTIVE'?<p className="muted uiSpaceTopBase">Current access ends on {expiry}. Early renewal will add 30 days after the current expiry date.</p>:null}{sub?.status==='EXPIRED'?<button className="primary providerPrimaryAction uiSpaceTopLg" disabled={busy} onClick={()=>void subscribe()}>{busy?'Opening payment…':'Subscribe Now – 250 MVR'}</button>:null}</section>
  {notice?<section className="providerModeCard"><p role="status">{notice}</p></section>:null}
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Your data stays safe</h2><p>If your subscription expires, previous jobs and account information remain stored. New provider work and service-listing access are paused until renewal.</p></div></div></section>
 </div></main>;
}
