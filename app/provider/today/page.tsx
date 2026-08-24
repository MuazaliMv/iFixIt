'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';
import '../provider-dashboard.css';

const OFFERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-offers';
const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';

type RequestPhoto={id:string;url:string|null};
type Offer={
 id:string;
 response_deadline_at:string;
 request:{
  ticket_number:string;
  service_name:string;
  service_location_text:string;
  preferred_date:string;
  problem_description:string;
  urgency:string;
  photos?:RequestPhoto[];
 }|null;
};
type Job={
 ticket_number:string;
 service_name:string;
 service_location_text:string;
 status:string;
 customer?:{name?:string|null}|null;
 inspection?:{scheduled_start?:string|null}|null;
};

function timeLeft(value:string){
 const deadline=new Date(value).getTime();
 if(Number.isNaN(deadline))return 'Response window active';
 const mins=Math.max(0,Math.ceil((deadline-Date.now())/60000));
 if(mins>=60)return `${Math.floor(mins/60)}h ${mins%60}m left`;
 return `${mins}m left`;
}

function jobStage(status:string){
 if(status==='IN_PROGRESS')return 'Processing';
 if(status==='INSPECTION_SCHEDULED')return 'Scheduled';
 if(status==='ACCEPTED')return 'Accepted';
 if(status==='COMPLETED')return 'Completed';
 return status.replaceAll('_',' ');
}

export default function ProviderTodayPage(){
 const mode=useProviderMode(true);
 const[offers,setOffers]=useState<Offer[]>([]);
 const[jobs,setJobs]=useState<Job[]>([]);
 const[busy,setBusy]=useState(true);
 const[actionOfferId,setActionOfferId]=useState<string|null>(null);
 const[message,setMessage]=useState('Loading your provider dashboard…');

 useEffect(()=>{if(mode.ready)void load();},[mode.ready]);

 async function getSession(){
  const{data}=await supabase.auth.getSession();
  if(!data.session){window.location.href='/login';return null;}
  return data.session;
 }

 async function load(){
  setBusy(true);
  try{
   const session=await getSession();if(!session)return;
   const headers={'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`};
   const[offerResponse,marketResponse]=await Promise.all([
    fetch(OFFERS_URL,{method:'POST',headers,body:JSON.stringify({action:'list'}),cache:'no-store'}),
    fetch(MARKET_URL,{method:'POST',headers,body:JSON.stringify({action:'dashboard'}),cache:'no-store'})
   ]);
   const offerPayload=await offerResponse.json();
   const marketPayload=await marketResponse.json();
   if(!offerResponse.ok)throw new Error(offerPayload?.error||'Unable to load new requests');
   if(!marketResponse.ok)throw new Error(marketPayload?.error||'Unable to load active work');
   setOffers(offerPayload.offers||[]);
   setJobs((marketPayload.requests||[]).filter((job:Job)=>['ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED'].includes(job.status)));
   setMessage('Dashboard is up to date.');
  }catch(error){
   setMessage(error instanceof Error?error.message:'Unable to load provider dashboard.');
  }finally{setBusy(false);}
 }

 async function respond(offerId:string,action:'accept'|'decline'){
  setActionOfferId(offerId);setBusy(true);
  try{
   const session=await getSession();if(!session)return;
   const response=await fetch(OFFERS_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
    body:JSON.stringify({action,offerId})
   });
   const payload=await response.json();
   if(!response.ok)throw new Error(payload?.error||'Unable to respond to request');
   setOffers(current=>current.filter(offer=>offer.id!==offerId));
   setMessage(action==='accept'?'Request accepted and moved to Active jobs.':'Request declined.');
   await load();
  }catch(error){
   setMessage(error instanceof Error?error.message:'Unable to respond to request.');
  }finally{setActionOfferId(null);setBusy(false);}
 }

 const active=useMemo(()=>jobs.filter(job=>job.status!=='COMPLETED'),[jobs]);
 const completed=useMemo(()=>jobs.filter(job=>job.status==='COMPLETED'),[jobs]);
 const upcoming=useMemo(()=>active.filter(job=>Boolean(job.inspection?.scheduled_start)).sort((a,b)=>new Date(a.inspection?.scheduled_start||0).getTime()-new Date(b.inspection?.scheduled_start||0).getTime()).slice(0,3),[active]);
 const selectedServices=useMemo(()=>mode.categories.filter(category=>mode.selectedCategoryIds.includes(category.id)).length,[mode.categories,mode.selectedCategoryIds]);
 const workingDays=useMemo(()=>mode.hours.filter((hour:any)=>Boolean(hour?.is_working)).length,[mode.hours]);

 if(mode.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading Service Provider Dashboard…</div></div></main>;

 return <main className="providerModePage"><div className="providerModeShell providerDashboard">
  <header className="providerModeTop">
   <div><span className="modeBadge provider"><span className="modeDot provider"/>Service Provider</span><h1>Welcome, {mode.name}</h1><p>Manage new requests, active work, availability and provider performance from one mobile-friendly workspace.</p></div>
   <AppModeSwitch mode="provider" compact/>
  </header>

  <section className="providerPipeline" aria-label="Provider work summary">
   <div className="providerPipelineGrid">
    <a className="pipelineCard active" href="/provider/jobs?tab=new"><span>New requests</span><strong>{offers.length}</strong></a>
    <a className="pipelineCard" href="/provider/jobs?tab=active"><span>Active jobs</span><strong>{active.length}</strong></a>
    <a className="pipelineCard" href="/provider/jobs?tab=completed"><span>Completed</span><strong>{completed.length}</strong></a>
    <a className="pipelineCard" href="/provider/availability"><span>Working days</span><strong>{workingDays}</strong></a>
   </div>
  </section>

  <section className="providerHero">
   <div className="providerHeroCard">
    <span className="eyebrow">Today</span>
    <h1>Your provider workspace</h1>
    <p>{offers.length>0?`You have ${offers.length} new request${offers.length===1?'':'s'} waiting for a response.`:'No new requests need a response right now.'} Keep availability and service areas current so matching stays accurate.</p>
    <div className="providerQuickActions">
     <a className="primary" href="/provider/jobs?tab=new">Review requests</a>
     <a className="secondary" href="/provider/calendar">Open calendar</a>
     <button className="secondary" type="button" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'Refresh'}</button>
    </div>
   </div>
   <div className="providerSideCard">
    <div className="providerSideRow"><span>Provider status</span><strong>{mode.approved?'Approved':'Reviewing'}</strong></div>
    <div className="providerSideRow"><span>Services enabled</span><strong>{selectedServices}</strong></div>
    <div className="providerSideRow"><span>Service areas</span><strong>{mode.serviceAreas.length}</strong></div>
    <div className="providerSideRow"><span>Subscription</span><strong>{mode.subscription?.status||'Active'}</strong></div>
   </div>
  </section>

  <section className="providerJobsPanel">
   <div className="providerJobsHeader">
    <div><span className="eyebrow">Needs your attention</span><h2>New service requests</h2><p className="muted">Accept only work you can complete. Request photos are shown when customers provide them.</p></div>
    <div className="providerToolbar"><a className="secondary" href="/provider/jobs?tab=new">View all</a></div>
   </div>
   {offers.length?<div className="providerJobList">{offers.slice(0,3).map(offer=>{
    const request=offer.request;
    const photos=request?.photos?.filter(photo=>photo.url)||[];
    return <article className="providerJobCard" key={offer.id}>
     <div className="providerJobTop"><div className="providerJobTitle"><strong>{request?.service_name||'Service request'}</strong><small>{request?.ticket_number||'New request'}</small></div><span className="providerStatusChip">{request?.urgency||'STANDARD'}</span></div>
     <div className="providerJobMeta"><div className="providerMetaItem"><span>Location</span><strong>{request?.service_location_text||'Not specified'}</strong></div><div className="providerMetaItem"><span>Preferred date</span><strong>{request?.preferred_date?new Date(`${request.preferred_date}T00:00:00`).toLocaleDateString():'Flexible'}</strong></div><div className="providerMetaItem"><span>Response</span><strong>{timeLeft(offer.response_deadline_at)}</strong></div></div>
     <p className="providerProblem">{request?.problem_description||'No problem description supplied.'}</p>
     {photos.length?<div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(photos.length,3)}, minmax(0, 1fr))`,gap:10}}>{photos.slice(0,3).map((photo,index)=><a key={photo.id} href={photo.url||'#'} target="_blank" rel="noreferrer" aria-label={`Open request photo ${index+1}`}><img src={photo.url||''} alt={`Customer request photo ${index+1}`} loading="lazy" style={{width:'100%',height:120,objectFit:'cover',borderRadius:14,border:'1px solid var(--line)',display:'block'}}/></a>)}</div>:null}
     <div className="providerJobActions"><button className="secondary" type="button" disabled={busy} onClick={()=>void respond(offer.id,'decline')}>{actionOfferId===offer.id&&busy?'Working…':'Decline'}</button><button className="primary" type="button" disabled={busy} onClick={()=>void respond(offer.id,'accept')}>{actionOfferId===offer.id&&busy?'Accepting…':'Accept request'}</button></div>
    </article>;
   })}</div>:<div className="providerEmpty"><strong>No new requests</strong>Matched customer requests will appear here automatically.</div>}
  </section>

  <section className="providerHero">
   <div className="providerJobsPanel">
    <div className="providerJobsHeader"><div><span className="eyebrow">Active work</span><h2>Jobs in progress</h2><p className="muted">Open a job to continue with its next valid action.</p></div><a className="secondary" href="/provider/jobs?tab=active">View all</a></div>
    {active.length?<div className="providerJobList">{active.slice(0,4).map(job=><a className="providerJobCard" href={`/provider/jobs/${encodeURIComponent(job.ticket_number)}`} key={job.ticket_number}><div className="providerJobTop"><div className="providerJobTitle"><strong>{job.service_name}</strong><small>{job.customer?.name||'Customer'} · {job.service_location_text}</small></div><span className={`providerStatusChip ${job.status==='IN_PROGRESS'?'processing':'accepted'}`}>{jobStage(job.status)}</span></div>{job.inspection?.scheduled_start?<div className="providerMetaItem"><span>Scheduled visit</span><strong>{new Date(job.inspection.scheduled_start).toLocaleString()}</strong></div>:null}</a>)}</div>:<div className="providerEmpty"><strong>No active jobs</strong>Accepted requests will appear here.</div>}
   </div>
   <div className="providerMessages">
    <span className="eyebrow">Provider controls</span><h2>Quick access</h2>
    <div className="providerMessageList">
     <a className="providerMessage" href="/provider/availability"><strong>Location & availability</strong><p>Update where and when you can receive service requests.</p><small>Open settings →</small></a>
     <a className="providerMessage" href="/provider/services"><strong>Services provided</strong><p>Keep the services you offer accurate for customer matching.</p><small>Manage services →</small></a>
     <a className="providerMessage" href="/provider/profile"><strong>Profile & business</strong><p>Review your public provider information and approval details.</p><small>Open profile →</small></a>
    </div>
   </div>
  </section>

  <section className="providerJobsPanel">
   <div className="providerJobsHeader"><div><span className="eyebrow">Schedule</span><h2>Upcoming visits</h2><p className="muted">Your next scheduled customer visits.</p></div><a className="secondary" href="/provider/calendar">Calendar</a></div>
   {upcoming.length?<div className="providerJobList">{upcoming.map(job=><a className="providerJobCard" href={`/provider/jobs/${encodeURIComponent(job.ticket_number)}`} key={job.ticket_number}><div className="providerJobTop"><div className="providerJobTitle"><strong>{job.service_name}</strong><small>{job.service_location_text}</small></div><span className="providerStatusChip accepted">{job.inspection?.scheduled_start?new Date(job.inspection.scheduled_start).toLocaleString():'Scheduled'}</span></div></a>)}</div>:<div className="providerEmpty"><strong>No upcoming visits</strong>Scheduled jobs will appear here automatically.</div>}
  </section>

  <p className="muted" role="status">{message}</p>
 </div></main>;
}
