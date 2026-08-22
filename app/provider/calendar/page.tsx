'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
type Job={ticket_number:string;service_name:string;service_location_text:string;status:string;inspection?:{scheduled_start?:string|null;duration_minutes?:number|null}|null};
export default function ProviderCalendarPage(){
 const state=useProviderMode(true);const[jobs,setJobs]=useState<Job[]>([]);
 useEffect(()=>{if(!state.ready)return;void(async()=>{try{const{data}=await supabase.auth.getSession();if(!data.session)return;const r=await fetch(MARKET_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'dashboard'})});const p=await r.json();if(r.ok)setJobs(p.requests||[]);}catch{}})();},[state.ready]);
 const upcoming=useMemo(()=>jobs.filter(j=>Boolean(j.inspection?.scheduled_start)&&j.status!=='COMPLETED').sort((a,b)=>new Date(a.inspection?.scheduled_start||0).getTime()-new Date(b.inspection?.scheduled_start||0).getTime()),[jobs]);
 if(state.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading provider calendar…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Calendar</h1><p>Service availability and scheduled bookings.</p></div><AppModeSwitch mode="provider" compact/></header>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Weekly availability</h2><p>Working hours use Maldives time.</p></div><a className="secondary" href="/provider/setup?edit=availability">Edit availability</a></div><div className="providerCalendarGrid">{days.map((day,i)=>{const h=state.hours.find((x:any)=>Number(x.day_of_week)===i+1);const working=Boolean(h?.is_working);return <div className={`providerDay ${working?'working':''}`} key={day}><strong>{day}</strong><span>{working?`${String(h?.start_time||'08:00').slice(0,5)} – ${String(h?.end_time||'17:00').slice(0,5)}`:'Unavailable'}</span></div>;})}</div></section>
  <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Upcoming bookings</h2><p>Scheduled inspections and visits assigned to you.</p></div><span className="modeBadge provider">{upcoming.length} upcoming</span></div>{upcoming.length?<div className="providerList">{upcoming.map(j=><a className="providerListItem providerListLink" href={`/provider/jobs?ticket=${encodeURIComponent(j.ticket_number)}`} key={j.ticket_number}><div><h3>{j.service_name}</h3><p>{new Date(j.inspection?.scheduled_start||'').toLocaleString()} · {j.service_location_text}</p></div><strong>›</strong></a>)}</div>:<div className="providerEmptyState"><h3>No scheduled bookings yet</h3><p>When a job is scheduled, it will be added here automatically.</p><a className="primary" href="/provider/today">View Today</a></div>}</section>
 </div></main>;
}
