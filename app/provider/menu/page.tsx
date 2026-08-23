'use client';

import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

export default function ProviderMenuPage(){
 const state=useProviderMode(true);
 if(state.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading provider menu…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Menu</h1><p>Manage customer work, services, locations, availability and account settings.</p></div></header>
  <section className="providerModeCard"><div className="providerModeHero"><div><span className="modeBadge provider">{state.status}</span><h2>{state.name}</h2><p>Your provider account is approved and can receive matched customer requests.</p></div><a className="primary" href="/provider/services">Services & Locations</a></div></section>
  <section className="providerMenuGrid"><a className="providerMenuCard" href="/provider/jobs"><span><strong>Customer Requests</strong><small>Matched requests waiting for your response</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/services"><span><strong>Services & Locations</strong><small>Services, service areas and availability</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/calendar"><span><strong>Calendar</strong><small>Scheduled customer bookings</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/profile"><span><strong>Account profile</strong><small>Identity, contact and subscription settings</small></span><b>›</b></a><a className="providerMenuCard" href="/provider/messages"><span><strong>Messages</strong><small>Customer conversations after acceptance</small></span><b>›</b></a></section>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Viewing mode</h2><p>Switching mode only changes what you see. Customers never see your provider workspace.</p></div></div><AppModeSwitch mode="provider"/></section>
 </div></main>;
}
