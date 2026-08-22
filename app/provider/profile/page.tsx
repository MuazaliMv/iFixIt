'use client';

import { useEffect } from 'react';
import ProfilePage from '../../profile/page';
import { useProviderMode } from '../useProviderMode';

export default function ProviderProfilePage(){
 const state=useProviderMode(false);
 useEffect(()=>{
  if(!state.loading&&!state.profile)window.location.href='/profile';
 },[state.loading,state.profile]);
 if(state.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading provider profile…</div></div></main>;
 if(!state.profile)return null;
 const sub=state.subscription;
 const expires=sub?.current_period_ends_at?new Date(sub.current_period_ends_at).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'Not set';
 return <>
  <main className="providerModePage"><div className="providerModeShell">
   <section className="providerModeCard"><div className="providerModeHero"><div><span className="modeBadge provider">Subscription</span><h2>{sub?.status==='TRIAL'?`${sub.daysRemaining} day${sub.daysRemaining===1?'':'s'} remaining`:sub?.status||'Provider subscription'}</h2><p>{sub?.status==='TRIAL'?`Free trial ends ${expires}. After that, renew for 250 MVR/month.`:sub?`Current period ends ${expires}.`:'Manage your provider subscription and renewal.'}</p></div><a className="secondary" href="/provider/subscription">Manage Subscription</a></div></section>
  </div></main>
  <ProfilePage/>
 </>;
}
