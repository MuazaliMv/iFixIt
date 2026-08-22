'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

const OFFERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-offers';
const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
const CONFIRM_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-confirmations';
type Tab='new'|'active'|'completed';
type Offer={id:string;response_deadline_at:string;request:{ticket_number:string;service_name:string;service_location_text:string;preferred_date:string;problem_description:string;urgency:string}|null};
type Job={ticket_number:string;service_name:string;service_location_text:string;status:string;customer?:{name?:string|null}|null;inspection?:{scheduled_start?:string|null}|null;completion?:{status?:string|null}|null};
function left(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const m=Math.max(0,Math.ceil((d.getTime()-Date.now())/60000));return m>60?`${Math.floor(m/60)}h ${m%60}m left`:`${m}m left`;}
function stage(j:Job,confirmed:Set<string>){if(j.status==='COMPLETED'&&j.completion?.status==='CONFIRMED')return'CUSTOMER CONFIRMED';if(j.status==='COMPLETED')return'COMPLETED';if(j.status==='IN_PROGRESS'||j.status==='INSPECTION_SCHEDULED')return'IN PROGRESS';if(j.status==='ACCEPTED'&&confirmed.has(j.ticket_number))return'CONFIRMED';return'ACCEPTED';}
export default function ProviderJobsPage(){
 const mode=useProviderMode(true);const[tab,setTab]=useState<Tab>('active');const[offers,setOffers]=useState<Offer[]>([]);const[jobs,setJobs]=useState<Job[]>([]);const[confirmed,setConfirmed]=useState<Set<string>>(new Set());const[busy,setBusy]=useState(true);const[actionOfferId,setActionOfferId]=useState<string|null>(null);const[message,setMessage]=useState('Loading customer work…');
 useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('tab');if(requested==='new'||requested==='active'||requested==='completed')setTab(requested);},[]);
 useEffect(()=>{if(mode.ready)void load();},[mode.ready]);
 async function auth(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return null;}return data.session;}
 async function load(){setBusy(true);try{const s=await auth();if(!s)return;const headers={'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`};const[or,mr,cr]=await Promise.all([fetch(OFFERS_URL,{method:'POST',headers,body:JSON.stringify({action:'list'})}),fetch(MARKET_URL,{method:'POST',headers,body:JSON.stringify({action:'dashboard'})}),fetch(CONFIRM_URL,{method:'POST',headers,body:'{}'})]);const op=await or.json(),mp=await mr.json(),cp=await cr.json();if(!or.ok)throw new Error(op?.error||'Unable to load new requests');if(!mr.ok)throw new Error(mp?.error||'Unable to load jobs');setOffers(op.offers||[]);setJobs((mp.requests||[]).filter((j:Job)=>['ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED'].includes(j.status)));if(cr.ok)setConfirmed(new Set(cp.confirmedTickets||[]));setMessage('Customer work is up to date.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load customer work.');}finally{setBusy(false);}}
 async function respond(offerId:string,action:'accept'|'decline'){
  setBusy(true);setActionOfferId(offerId);setMessage(action==='accept'?'Accepting request…':'Declining request…');
  try{
   const s=await auth();if(!s)return;
   const r=await fetch(OFFERS_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({action,offerId})});
   const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to respond');
   if(action==='accept'){
    setOffers(current=>current.filter(o=>o.id!==offerId));
    setTab('active');
    setMessage('Request accepted. It is now in Active jobs.');
    await load();
    setTab('active');
   }else{
    setOffers(current=>current.filter(o=>o.id!==offerId));
    setMessage('Request declined.');
    await load();
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to respond.');setBusy(false);}finally{setActionOfferId(null);}
 }
 const active=useMemo(()=>jobs.filter(j=>j.status!=='COMPLETED'),[jobs]);const completed=useMemo(()=>jobs.filter(j=>j.status==='COMPLETED'),[jobs]);
 if(mode.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Checking provider access…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Customer Work</h1><p>New requests, active jobs and completed work in one place.</p></div><AppModeSwitch mode="provider" compact/></header>
  <div className="providerSegmented" role="tablist"><button className={tab==='new'?'active':''} onClick={()=>setTab('new')}>New <span>{offers.length}</span></button><button className={tab==='active'?'active':''} onClick={()=>setTab('active')}>Active <span>{active.length}</span></button><button className={tab==='completed'?'active':''} onClick={()=>setTab('completed')}>Completed <span>{completed.length}</span></button></div>
  {tab==='new'?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>New requests</h2><p>Accept only the jobs you can take.</p></div></div>{offers.length?<div className="providerOfferGrid providerOfferGridClean">{offers.map(o=><article className="providerOfferCard" key={o.id}><div className="providerOfferTop"><strong>{o.request?.service_name||'Service request'}</strong><span className="modeBadge provider">{o.request?.urgency||'STANDARD'}</span></div><p><b>{o.request?.service_location_text||'Location not specified'}</b> · {o.request?.preferred_date?new Date(o.request.preferred_date+'T00:00:00').toLocaleDateString():'Date flexible'}</p><p className="providerOfferProblem">{o.request?.problem_description||'No problem description supplied.'}</p><div className="providerOfferDeadline">⏱ {left(o.response_deadline_at)}</div><div className="providerSetupActions"><button className="danger" disabled={busy} onClick={()=>void respond(o.id,'decline')}>{actionOfferId===o.id&&busy?'Working…':'Decline'}</button><button className="success" disabled={busy} onClick={()=>void respond(o.id,'accept')}>{actionOfferId===o.id&&busy?'Accepting…':'Accept'}</button></div></article>)}</div>:<div className="providerEmptyState"><h3>No new requests</h3><p>Matched requests will appear here automatically.</p></div>}</section>:null}
  {tab==='active'?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>Active jobs</h2><p>Open a job to see the next valid action.</p></div></div>{active.length?<div className="providerOperationalList">{active.map(j=><a className="providerOperationalCard" href={`/provider/jobs/${encodeURIComponent(j.ticket_number)}`} key={j.ticket_number}><div className="providerOperationalMain"><div className="providerOperationalTitle"><strong>{j.service_name}</strong><span className="modeBadge provider">{stage(j,confirmed)}</span></div><p>{j.customer?.name||'Customer'} · {j.service_location_text}</p>{j.inspection?.scheduled_start?<small>Visit · {new Date(j.inspection.scheduled_start).toLocaleString()}</small>:<small>{j.ticket_number}</small>}</div><b>Open →</b></a>)}</div>:<div className="providerEmptyState"><h3>No active jobs</h3><p>Accepted jobs will appear here.</p></div>}</section>:null}
  {tab==='completed'?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>Completed jobs</h2><p>Jobs stay here while waiting for or after customer confirmation.</p></div></div>{completed.length?<div className="providerOperationalList">{completed.map(j=><a className="providerOperationalCard" href={`/provider/jobs/${encodeURIComponent(j.ticket_number)}`} key={j.ticket_number}><div className="providerOperationalMain"><div className="providerOperationalTitle"><strong>{j.service_name}</strong><span className="modeBadge customer">{stage(j,confirmed)}</span></div><p>{j.customer?.name||'Customer'} · {j.service_location_text}</p><small>{j.ticket_number}</small></div><b>Open →</b></a>)}</div>:<div className="providerEmptyState"><h3>No completed jobs</h3><p>Finished work will appear here.</p></div>}</section>:null}
  <p className="muted" role="status">{busy&&actionOfferId===null?'Refreshing…':message}</p>
 </div></main>;
}
