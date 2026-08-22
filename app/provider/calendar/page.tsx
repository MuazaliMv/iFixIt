'use client';

import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export default function ProviderCalendarPage(){
 const state=useProviderMode(true);
 if(state.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading provider calendar…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Calendar</h1><p>Manage when customers can book your services.</p></div><AppModeSwitch mode="provider" compact/></header>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Weekly availability</h2><p>Working hours use Maldives time.</p></div><a className="secondary" href="/provider/onboarding#availability">Edit availability</a></div><div className="providerCalendarGrid">{days.map((day,i)=>{const h=state.hours.find((x:any)=>Number(x.day_of_week)===i+1);const working=Boolean(h?.is_working);return <div className={`providerDay ${working?'working':''}`} key={day}><strong>{day}</strong><span>{working?`${String(h?.start_time||'08:00').slice(0,5)} – ${String(h?.end_time||'17:00').slice(0,5)}`:'Unavailable'}</span></div>;})}</div></section>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Upcoming bookings</h2><p>Your scheduled inspections and accepted jobs will appear here.</p></div></div><div className="providerEmptyState"><h3>No scheduled bookings yet</h3><p>When a job is scheduled, it will be added to this calendar automatically.</p><a className="primary" href="/provider">View Today</a></div></section>
 </div></main>;
}
