'use client';

import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

export default function ProviderListingsPage(){
 const state=useProviderMode(true);
 if(state.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading service listings…</div></div></main>;
 const selected=state.categories.filter(c=>state.selectedCategoryIds.includes(c.id));
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Listings</h1><p>Manage the services customers can match with you.</p></div><AppModeSwitch mode="provider" compact/></header>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Your services</h2><p>Service categories, description, service areas and availability are managed from Provider Setup.</p></div><a className="primary" href="/provider/onboarding#services">Manage listings</a></div>{selected.length?<div className="providerList">{selected.map(item=><div className="providerListItem" key={item.id}><div><h3>{item.name}</h3><p>Active service category · pricing/description setup available from Provider Setup.</p></div><span className="modeBadge provider">Active</span></div>)}</div>:<div className="providerEmptyState"><h3>No active listings</h3><p>Add your first service so FixIt can match you with relevant customers.</p><a className="primary" href="/provider/onboarding#services">Add your first service</a></div>}</section>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Listing quality</h2><p>Complete pricing, service description, coverage area and availability before publishing.</p></div></div><div className="providerList"><div className="providerListItem"><div><h3>Pricing</h3><p>Fixed/hourly pricing is the next listing-data extension; current jobs still use inspection/estimate amounts.</p></div><span className="modeBadge customer">Estimate flow</span></div><div className="providerListItem"><div><h3>Verification</h3><p>{state.providerApproved?'Provider approval is active.':'Approval is still required before receiving jobs.'}</p></div><span className={`modeBadge ${state.providerApproved?'customer':'provider'}`}>{state.providerApproved?'Approved':'Pending'}</span></div></div></section>
 </div></main>;
}
