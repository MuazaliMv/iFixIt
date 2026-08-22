'use client';

import AppModeSwitch from '../../AppModeSwitch';
import { supabase } from '../../../lib/supabaseClient';
import { useProviderMode } from '../useProviderMode';

export default function ProviderMenuPage(){
 const state=useProviderMode(true);
 async function logout(){
  try{localStorage.removeItem('fixit:mobile-nav-role');localStorage.removeItem('fixit:app-mode');localStorage.removeItem('fixit:mode-toast');}catch{}
  await supabase.auth.signOut();
  window.location.href='/login';
 }
 if(state.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading provider menu…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Menu</h1><p>Manage customer work, services, availability, earnings and account settings.</p></div><AppModeSwitch mode="provider" compact/></header>
  <section className="providerModeCard"><div className="providerModeHero"><div><span className="modeBadge provider">{state.status}</span><h2>{state.name}</h2><p>{state.providerApproved?'Your provider account is approved and can receive matched customer requests.':'Complete provider onboarding before receiving customer requests.'}</p></div>{state.providerApproved?<a className="primary" href="/provider/listings">Manage Listings</a>:<a className="primary" href="/provider/setup">Complete Setup</a>}</div></section>
  <section className="providerMenuGrid"><a className="providerMenuCard" href="/provider/jobs"><span><strong>Customer Requests</strong><small>Matched requests waiting for your response</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/earnings"><span><strong>Earnings</strong><small>Revenue and completed work</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/services"><span><strong>Services</strong><small>Choose categories you want to offer</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/listings"><span><strong>Listings & Pricing</strong><small>Pricing, descriptions and active listings</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/availability"><span><strong>Availability</strong><small>Working status and weekly hours</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/calendar"><span><strong>Calendar</strong><small>Scheduled customer bookings</small></span><b>›</b></a>{!state.providerApproved?<a className="providerMenuCard" href="/provider/setup"><span><strong>Verification & setup</strong><small>Complete provider onboarding</small></span><b>›</b></a>:null}<a className="providerMenuCard" href="/profile"><span><strong>Account profile</strong><small>Identity and contact settings</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/messages"><span><strong>Messages</strong><small>Customer conversations after acceptance</small></span><b>›</b></a></section>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Viewing mode</h2><p>Switching mode only changes what you see. Customers never see your provider dashboard.</p></div></div><AppModeSwitch mode="provider"/></section>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Account</h2><p>Sign out of FixIt on this device.</p></div><button className="secondary" type="button" onClick={()=>void logout()}>Log Out</button></div></section>
 </div></main>;
}
