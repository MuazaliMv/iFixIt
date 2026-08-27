'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import AppModeSwitch from '../../../AppModeSwitch';
import { useProviderMode } from '../../useProviderMode';

const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
const FLOW_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-job-flow';

type RequestPhoto={id:string;url?:string|null};
type Job={
 ticket_number:string;
 service_name:string;
 service_location_text:string;
 problem_description?:string|null;
 customer_notes?:string|null;
 status:string;
 contactUnlocked?:boolean;
 customer?:{name?:string|null;phone?:string|null}|null;
 onSiteContact?:{sameAsCustomer?:boolean;name?:string|null;phone?:string|null}|null;
 media?:RequestPhoto[];
};

const stages=['ACCEPTED','PROCESSING','COMPLETED'] as const;
function canonicalStage(status:string){const value=String(status||'').toUpperCase();if(value==='COMPLETED')return'COMPLETED';if(['PROCESSING','IN_PROGRESS','INSPECTION_SCHEDULED'].includes(value))return'PROCESSING';return'ACCEPTED';}

export default function ProviderJobDetailPage(){
 const mode=useProviderMode(true);
 const params=useParams<{ticket:string}>();
 const ticket=decodeURIComponent(String(params?.ticket||''));
 const[job,setJob]=useState<Job|null>(null);
 const[busy,setBusy]=useState(true);
 const[message,setMessage]=useState('Loading customer job…');
 useEffect(()=>{if(mode.ready)void load();},[mode.ready,ticket]);

 async function session(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return null;}return data.session;}
 async function load(){
  setBusy(true);
  try{
   const s=await session();if(!s)return;
   const headers={'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`};
   const mr=await fetch(MARKET_URL,{method:'POST',headers,body:JSON.stringify({action:'dashboard'})});
   const mp=await mr.json().catch(()=>({}));if(!mr.ok)throw new Error(mp?.error||'Unable to load job');
   const found=(mp.requests||[]).find((x:Job)=>x.ticket_number===ticket&&['ACCEPTED','PROCESSING','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED'].includes(String(x.status).toUpperCase()));
   if(!found)throw new Error('This customer job is not assigned to you.');
   setJob(found);setMessage('');
  }catch(e){setJob(null);setMessage(e instanceof Error?e.message:'Unable to load customer job.');}
  finally{setBusy(false);}
 }
 async function flow(action:'start'|'complete'){
  const s=await session();if(!s)throw new Error('Session expired');
  const r=await fetch(FLOW_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({action,ticketNumber:ticket})});
  const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||`Unable to ${action} job (${r.status})`);return p;
 }
 async function act(action:'start'|'complete'){
  setBusy(true);setMessage(action==='start'?'Starting work…':'Completing work…');
  try{await flow(action);setMessage(action==='start'?'Work started. Status is now PROCESSING.':'Work completed. Status is now COMPLETED.');await load();}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to update job.');}
  finally{setBusy(false);}
 }

 if(mode.loading||busy&&!job)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading customer job…</div></div></main>;
 const stage=job?canonicalStage(job.status):'ACCEPTED';
 const index=Math.max(0,stages.indexOf(stage));
 const closed=stage==='COMPLETED';
 const requestPhotos=(job?.media||[]).filter(photo=>photo.url).slice(0,5);
 const contactName=job?.onSiteContact?.name||job?.customer?.name||'Customer';
 const contactPhone=job?.onSiteContact?.phone||job?.customer?.phone||null;
 const directions=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job?.service_location_text||'')}`;

 return <main className="providerModePage frozenProviderFlow"><div className="providerModeShell"><header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>{job?.service_name||'Customer Job'}</h1><p>Request {ticket}</p></div><AppModeSwitch mode="provider" compact/></header>{job?<>
  <section className="providerModeCard providerJobHero frozenJobHero"><div><small>{stage==='ACCEPTED'?'ACCEPTED REQUEST':stage==='PROCESSING'?'SERVICE IN PROGRESS':'COMPLETED REQUEST'}</small><span className="modeBadge provider">{stage}</span><h2>{job.service_name}</h2><p>{job.service_location_text}</p></div><a className="secondary" href="/provider/jobs?tab=active">← Requests</a></section>

  <section className="providerModeCard frozenProgressCard"><small>CURRENT PROGRESS</small><div className="providerProgressCompact">{stages.map((item,i)=><div className={i<index?'done':i===index?'current':''} key={item}><span>{i<=index?'✓':i+1}</span><small>{item}</small></div>)}</div></section>

  <section className="providerModeCard frozenNextAction"><div className="providerSectionHead"><div><small>NEXT ACTION</small><h2>{closed?'Job completed':stage==='ACCEPTED'?'Start the service':'Finish the service'}</h2><p>{stage==='ACCEPTED'?'Start work only when service work actually begins.':stage==='PROCESSING'?'Mark the request completed when the service is finished.':'This request has completed the frozen service lifecycle.'}</p></div></div>
   {message?<p className="statusNotice" role="status">{message}</p>:null}
   {stage==='ACCEPTED'?<button className="primary providerPrimaryAction" disabled={busy} onClick={()=>void act('start')}>{busy?'Starting…':'Start Work'}</button>:null}
   {stage==='PROCESSING'?<button className="success providerPrimaryAction" disabled={busy} onClick={()=>void act('complete')}>{busy?'Completing…':'Complete Service'}</button>:null}
   {closed?<span className="modeBadge customer">COMPLETED ✓</span>:null}
  </section>

  <section className="providerModeCard frozenDetailCard"><small>PROBLEM</small><p className="frozenProblemText">{job.problem_description||'No problem description supplied.'}</p>{requestPhotos.length?<div className="frozenPhotoGrid">{requestPhotos.map((photo,index)=><a href={photo.url||'#'} target="_blank" rel="noreferrer" key={photo.id}><img src={photo.url||''} alt={`Customer request photo ${index+1}`} loading="lazy"/></a>)}</div>:null}</section>

  <section className="providerModeCard frozenDetailCard"><div className="providerSectionHead"><div><small>SERVICE LOCATION</small><h2>{job.service_location_text}</h2></div><a className="secondary" href={directions} target="_blank" rel="noreferrer">Directions</a></div></section>

  <section className="providerModeCard frozenDetailCard"><small>CONTACT ON SITE</small>{job.contactUnlocked||contactPhone?<div className="providerContactIdentity"><strong>{contactName}</strong><span>{contactPhone||'Phone not provided'}</span></div>:<div className="providerLockedContact">Contact details will appear when the job is accepted.</div>}{contactPhone?<div className="providerContactActions"><a className="secondary" href={`tel:${contactPhone}`}>Call</a><a className="secondary" href={`/provider/messages?ticket=${encodeURIComponent(ticket)}`}>Message</a></div>:null}</section>

  {job.customer_notes?<section className="providerModeCard frozenDetailCard"><small>ACCESS NOTES</small><p className="frozenProblemText">{job.customer_notes}</p></section>:null}
 </>:<section className="providerModeCard"><div className="providerEmptyState"><h3>Job unavailable</h3><p>{message}</p><a className="primary" href="/provider/jobs">Customer Work</a></div></section>}</div></main>;
}
