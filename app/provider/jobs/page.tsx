'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

const OFFERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-offers';
const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
type Tab='new'|'active'|'completed';
type RequestPhoto={id:string;url:string|null;sort_order?:number|null;created_at?:string|null};
type Offer={id:string;response_deadline_at:string;request:{ticket_number:string;service_name:string;service_location_text:string;preferred_date?:string|null;problem_description?:string|null;urgency?:string|null;photos?:RequestPhoto[]}|null};
type Job={ticket_number:string;service_name:string;service_location_text:string;status:string;customer?:{name?:string|null}|null};

function left(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const m=Math.max(0,Math.ceil((d.getTime()-Date.now())/60000));return m>60?`${Math.floor(m/60)}h ${m%60}m left`:`${m}m left`;}
function canonicalStage(status:string){const value=String(status||'').toUpperCase();if(value==='COMPLETED')return'COMPLETED';if(['PROCESSING','IN_PROGRESS','INSPECTION_SCHEDULED'].includes(value))return'PROCESSING';return'ACCEPTED';}

export default function ProviderJobsPage(){
 const mode=useProviderMode(true);
 const[tab,setTab]=useState<Tab>('active');
 const[offers,setOffers]=useState<Offer[]>([]);
 const[jobs,setJobs]=useState<Job[]>([]);
 const[busy,setBusy]=useState(true);
 const[actionOfferId,setActionOfferId]=useState<string|null>(null);
 const[message,setMessage]=useState('Loading customer work…');

 useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('tab');if(requested==='new'||requested==='active'||requested==='completed')setTab(requested);},[]);
 useEffect(()=>{if(mode.ready)void load();},[mode.ready]);

 async function auth(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return null;}return data.session;}
 async function load(){
  setBusy(true);
  try{
   const s=await auth();if(!s)return;
   const headers={'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`};
   const[or,mr]=await Promise.all([
    fetch(OFFERS_URL,{method:'POST',headers,body:JSON.stringify({action:'list'})}),
    fetch(MARKET_URL,{method:'POST',headers,body:JSON.stringify({action:'dashboard'})})
   ]);
   const op=await or.json().catch(()=>({})),mp=await mr.json().catch(()=>({}));
   if(!or.ok)throw new Error(op?.error||'Unable to load new requests');
   if(!mr.ok)throw new Error(mp?.error||'Unable to load jobs');
   setOffers(op.offers||[]);
   setJobs((mp.requests||[]).filter((j:Job)=>['ACCEPTED','PROCESSING','IN_PROGRESS','INSPECTION_SCHEDULED','COMPLETED'].includes(String(j.status).toUpperCase())));
   setMessage('Customer work is up to date.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load customer work.');}
  finally{setBusy(false);}
 }

 async function respond(offerId:string,action:'accept'|'decline'){
  setBusy(true);setActionOfferId(offerId);setMessage(action==='accept'?'Accepting request…':'Marking unavailable…');
  try{
   const s=await auth();if(!s)return;
   const r=await fetch(OFFERS_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({action,offerId})});
   const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||'Unable to respond');
   setOffers(current=>current.filter(o=>o.id!==offerId));
   if(action==='accept'){
    setMessage('Request accepted. Status is now ACCEPTED.');
    await load();setTab('active');
   }else{
    setMessage('Request skipped. It remains available to another eligible provider.');
    await load();setTab('new');
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to respond.');}
  finally{setBusy(false);setActionOfferId(null);}
 }

 const active=useMemo(()=>jobs.filter(j=>canonicalStage(j.status)!=='COMPLETED'),[jobs]);
 const completed=useMemo(()=>jobs.filter(j=>canonicalStage(j.status)==='COMPLETED'),[jobs]);
 if(mode.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Checking provider access…</div></div></main>;

 return <main className="providerModePage frozenProviderFlow"><div className="providerModeShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Customer Work</h1><p>New requests, active jobs and completed work.</p></div><AppModeSwitch mode="provider" compact/></header>
  <div className="providerSegmented" role="tablist"><button className={tab==='new'?'active':''} onClick={()=>setTab('new')}>New <span>{offers.length}</span></button><button className={tab==='active'?'active':''} onClick={()=>setTab('active')}>Active <span>{active.length}</span></button><button className={tab==='completed'?'active':''} onClick={()=>setTab('completed')}>Completed <span>{completed.length}</span></button></div>

  {tab==='new'?<section className="providerModeCard frozenProviderSection"><div className="providerSectionHead"><div><small>NEW SERVICE REQUESTS</small><h2>Available requests</h2><p>Review the problem, photos and location before accepting.</p></div></div>{offers.length?<div className="providerOfferGrid providerOfferGridClean">{offers.map(o=><article className="providerOfferCard frozenOfferCard" key={o.id}>
   <div className="providerOfferTop"><div><small>NEW SERVICE REQUEST</small><strong>{o.request?.service_name||'Service request'}</strong><span className="frozenTicket">{o.request?.ticket_number||''}</span></div><span className="modeBadge provider">NEW</span></div>
   <div className="frozenRequestBlock"><small>PROBLEM</small><p className="providerOfferProblem">{o.request?.problem_description||'No problem description supplied.'}</p></div>
   {o.request?.photos?.some(photo=>photo.url)?<div className="frozenPhotoGrid">{o.request.photos.filter(photo=>photo.url).slice(0,5).map((photo,index)=><a key={photo.id} href={photo.url||'#'} target="_blank" rel="noreferrer" aria-label={`Open request photo ${index+1}`}><img src={photo.url||''} alt={`Customer request photo ${index+1}`} loading="lazy"/></a>)}</div>:null}
   <div className="frozenRequestBlock"><small>SERVICE LOCATION</small><strong>{o.request?.service_location_text||'Location not specified'}</strong></div>
   <div className="providerOfferDeadline">⏱ {left(o.response_deadline_at)}</div>
   <div className="frozenProviderActions"><button className="secondary" disabled={busy} onClick={()=>void respond(o.id,'decline')}>{actionOfferId===o.id&&busy?'Working…':'Not Available'}</button><button className="primary providerPrimaryAction" disabled={busy} onClick={()=>void respond(o.id,'accept')}>{actionOfferId===o.id&&busy?'Accepting…':'Accept Request'}</button></div>
   <p className="frozenHelper">Accepting moves the request directly from NEW to ACCEPTED. No customer confirmation is required.</p>
  </article>)}</div>:<div className="providerEmptyState"><h3>No new requests</h3><p>Matched requests will appear here automatically.</p></div>}</section>:null}

  {tab==='active'?<section className="providerModeCard frozenProviderSection"><div className="providerSectionHead"><div><small>ACTIVE WORK</small><h2>Accepted & processing</h2><p>Open a job to perform the next valid lifecycle action.</p></div></div>{active.length?<div className="providerOperationalList">{active.map(j=><a className="providerOperationalCard frozenOperationalCard" href={`/provider/jobs/${encodeURIComponent(j.ticket_number)}`} key={j.ticket_number}><div className="providerOperationalMain"><div className="providerOperationalTitle"><strong>{j.service_name}</strong><span className="modeBadge provider">{canonicalStage(j.status)}</span></div><p>{j.customer?.name||'Customer'} · {j.service_location_text}</p><small>{j.ticket_number}</small></div><b>Open →</b></a>)}</div>:<div className="providerEmptyState"><h3>No active jobs</h3><p>Accepted requests will appear here.</p></div>}</section>:null}

  {tab==='completed'?<section className="providerModeCard frozenProviderSection"><div className="providerSectionHead"><div><small>COMPLETED</small><h2>Finished jobs</h2><p>Completed service requests are kept here for reference.</p></div></div>{completed.length?<div className="providerOperationalList">{completed.map(j=><a className="providerOperationalCard frozenOperationalCard" href={`/provider/jobs/${encodeURIComponent(j.ticket_number)}`} key={j.ticket_number}><div className="providerOperationalMain"><div className="providerOperationalTitle"><strong>{j.service_name}</strong><span className="modeBadge customer">COMPLETED</span></div><p>{j.customer?.name||'Customer'} · {j.service_location_text}</p><small>{j.ticket_number}</small></div><b>Open →</b></a>)}</div>:<div className="providerEmptyState"><h3>No completed jobs</h3><p>Finished work will appear here.</p></div>}</section>:null}
  <p className="muted" role="status">{busy&&actionOfferId===null?'Refreshing…':message}</p>
 </div></main>;
}
