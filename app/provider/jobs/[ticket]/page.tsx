'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import AppModeSwitch from '../../../AppModeSwitch';
import { useProviderMode } from '../../useProviderMode';

const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
const FLOW_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-job-flow';

type Job={
 ticket_number:string;
 service_name:string;
 service_location_text:string;
 preferred_date?:string|null;
 problem_description?:string|null;
 status:string;
 contactUnlocked?:boolean;
 customer?:{name?:string|null;phone?:string|null}|null;
 onSiteContact?:{sameAsCustomer?:boolean;name?:string|null;phone?:string|null}|null;
 providerResponse?:{status?:string|null;provider_confirmed_at?:string|null}|null;
 inspection?:{preferred_slots?:string[]|null;scheduled_start?:string|null}|null;
 completion?:{status?:string|null}|null;
};

const stages=['ACCEPTED','CONFIRMED','IN PROGRESS','COMPLETED','CUSTOMER CONFIRMED'];

function label(job:Job){
 if(job.status==='COMPLETED'&&job.completion?.status==='CONFIRMED')return'CUSTOMER CONFIRMED';
 if(job.status==='COMPLETED')return'COMPLETED';
 if(job.status==='IN_PROGRESS'||job.status==='INSPECTION_SCHEDULED')return'IN PROGRESS';
 if(job.status==='ACCEPTED'&&job.providerResponse?.provider_confirmed_at)return'CONFIRMED';
 return'ACCEPTED';
}

function slotDate(value:string){
 const d=new Date(value.length===16?`${value}:00`:value);
 return Number.isNaN(d.getTime())?null:d;
}
function formatPreferredSlot(value:string){
 const d=slotDate(value);
 return d?d.toLocaleString():value;
}
function toDateTimeLocal(value:string){
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return value;
 const d=new Date(value);
 if(Number.isNaN(d.getTime()))return'';
 const pad=(n:number)=>String(n).padStart(2,'0');
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localNowMin(){
 const d=new Date();const pad=(n:number)=>String(n).padStart(2,'0');
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProviderJobDetailPage(){
 const mode=useProviderMode(true);
 const params=useParams<{ticket:string}>();
 const ticket=decodeURIComponent(String(params?.ticket||''));
 const[job,setJob]=useState<Job|null>(null);
 const[schedule,setSchedule]=useState('');
 const[busy,setBusy]=useState(true);
 const[message,setMessage]=useState('Loading customer job…');
 useEffect(()=>{if(mode.ready)void load();},[mode.ready,ticket]);
 async function session(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return null;}return data.session;}
 async function load(){setBusy(true);try{const s=await session();if(!s)return;const headers={'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`};const mr=await fetch(MARKET_URL,{method:'POST',headers,body:JSON.stringify({action:'dashboard'})});const mp=await mr.json();if(!mr.ok)throw new Error(mp?.error||'Unable to load job');const found=(mp.requests||[]).find((x:Job)=>x.ticket_number===ticket&&['ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED'].includes(x.status));if(!found)throw new Error('This customer job is not assigned to you.');setJob(found);setMessage('');}catch(e){setJob(null);setMessage(e instanceof Error?e.message:'Unable to load customer job.');}finally{setBusy(false);}}
 async function confirmJob(){setBusy(true);try{const s=await session();if(!s)return;const r=await fetch(MARKET_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({action:'confirm_selection',ticketNumber:ticket})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to confirm this job');setMessage('Job confirmed. Choose a valid future visit time.');await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to confirm this job.');}finally{setBusy(false);}}
 async function act(action:'schedule'|'start'|'complete'){setBusy(true);try{const s=await session();if(!s)return;const r=await fetch(FLOW_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({action,ticketNumber:ticket,scheduledStart:schedule||undefined})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to update job');setMessage(action==='schedule'?'Visit time saved. Work Done is now available.':action==='start'?'Work started.':'Work marked done. Waiting for customer confirmation.');await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to update job.');}finally{setBusy(false);}}
 if(mode.loading||busy&&!job)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading customer job…</div></div></main>;
 const stage=job?label(job):'';const index=Math.max(0,stages.indexOf(stage));const contactUnlocked=Boolean(job?.contactUnlocked);const scheduledInternal=job?.status==='INSPECTION_SCHEDULED';const workingInternal=job?.status==='IN_PROGRESS';const closed=stage==='CUSTOMER CONFIRMED';
 const preferredSlots=Array.from(new Set((job?.inspection?.preferred_slots||[]).filter(Boolean)));
 const futureSlots=preferredSlots.filter(slot=>{const d=slotDate(slot);return Boolean(d&&d.getTime()>Date.now());});
 const expiredSlots=preferredSlots.filter(slot=>!futureSlots.includes(slot));
 const scheduleValid=Boolean(schedule&&Date.parse(schedule)>Date.now());
 const directions=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job?.service_location_text||'')}`;
 return <main className="providerModePage"><div className="providerModeShell"><header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>{job?.service_name||'Customer Job'}</h1><p>{ticket}</p></div><AppModeSwitch mode="provider" compact/></header>{job?<>
  <section className="providerModeCard providerJobHero"><div><span className="modeBadge provider">{stage}</span><h2>{job.service_name}</h2><p>{job.service_location_text}</p></div><a className="secondary" href="/provider/jobs?tab=active">Back to jobs</a></section>
  <section className="providerModeCard"><div className="providerProgressCompact">{stages.map((item,i)=><div className={i<index?'done':i===index?'current':''} key={item}><span>{i<index?'✓':i+1}</span><small>{item}</small></div>)}</div></section>
  <section className="providerModeCard providerNextAction"><div className="providerSectionHead"><div><h2>{closed?'Job closed':'Next action'}</h2><p>{stage==='ACCEPTED'?'The customer selected you. Confirm this job to continue.':stage==='CONFIRMED'?'Choose a valid future visit time, then save it.':stage==='IN PROGRESS'&&scheduledInternal?'The visit is scheduled. Start Work or use Work Done when the job is finished.':stage==='IN PROGRESS'&&workingInternal?'Work is active. Use Work Done when finished.':stage==='COMPLETED'?'Work is complete. Waiting for the customer to confirm completion.':'No further provider action is required.'}</p></div></div>
   {stage==='ACCEPTED'?<button className="primary providerPrimaryAction" disabled={busy} onClick={()=>void confirmJob()}>{busy?'Confirming…':'Confirm Job'}</button>:null}
   {stage==='CONFIRMED'&&futureSlots.length?<div style={{marginBottom:16}}><strong>Customer preferred times</strong><div className="providerActionRow" style={{marginTop:10,flexWrap:'wrap'}}>{futureSlots.map((slot,i)=><button key={`${slot}-${i}`} type="button" className="secondary" onClick={()=>setSchedule(toDateTimeLocal(slot))}>{formatPreferredSlot(slot)}</button>)}</div></div>:null}
   {stage==='CONFIRMED'&&expiredSlots.length?<p className="statusNotice">Expired or duplicate preferred times were removed. Enter another agreed future visit time.</p>:null}
   {stage==='CONFIRMED'?<div className="providerActionRow"><input aria-label="Visit time" type="datetime-local" min={localNowMin()} value={schedule} onChange={e=>setSchedule(e.target.value)}/><button className="primary" disabled={busy||!scheduleValid} onClick={()=>void act('schedule')}>Save Visit Time</button></div>:null}
   {stage==='IN PROGRESS'&&scheduledInternal?<div className="providerActionRow"><button className="primary providerPrimaryAction" disabled={busy} onClick={()=>void act('start')}>Start Work</button><button className="success providerPrimaryAction" disabled={busy} onClick={()=>void act('complete')}>Work Done</button></div>:null}
   {stage==='IN PROGRESS'&&workingInternal?<button className="success providerPrimaryAction" disabled={busy} onClick={()=>void act('complete')}>Work Done</button>:null}
   {stage==='COMPLETED'?<span className="modeBadge customer">Waiting for Customer</span>:null}{closed?<span className="modeBadge customer">Closed</span>:null}
  </section>
  <section className="providerJobColumns"><div className="providerModeCard"><div className="providerSectionHead"><div><h2>Customer</h2><p>{contactUnlocked?'Contact details are available.':'Contact details unlock after provider confirmation.'}</p></div></div>{contactUnlocked?<><div className="providerContactIdentity"><strong>{job.customer?.name||'Customer'}</strong><span>{job.customer?.phone||'Phone not provided'}</span></div><div className="providerContactActions">{job.customer?.phone?<a className="secondary" href={`tel:${job.customer.phone}`}>Call customer</a>:null}<a className="secondary" href={`/provider/messages?ticket=${encodeURIComponent(ticket)}`}>Message</a></div></>:<div className="providerLockedContact">🔒 Customer contact is available after confirmation.</div>}</div><div className="providerModeCard"><div className="providerSectionHead"><div><h2>On-site contact</h2><p>{contactUnlocked?'Use this person for arrival and access.':'On-site contact unlocks after provider confirmation.'}</p></div></div>{contactUnlocked&&job.onSiteContact?<><div className="providerContactIdentity"><strong>{job.onSiteContact.name||'On-site contact'}</strong><span>{job.onSiteContact.sameAsCustomer?'Same as customer':job.onSiteContact.phone||'Phone not provided'}</span></div><div className="providerContactActions">{job.onSiteContact.phone?<a className="secondary" href={`tel:${job.onSiteContact.phone}`}>Call on-site</a>:null}<a className="secondary" href={directions} target="_blank" rel="noreferrer">Directions</a></div></>:<div className="providerLockedContact">🔒 On-site contact is available after confirmation.</div>}</div></section>
  <section className="providerJobColumns"><div className="providerModeCard"><div className="providerSectionHead"><div><h2>Visit</h2></div></div><dl className="providerReadableData"><div><dt>Location</dt><dd>{job.service_location_text}</dd></div><div><dt>Preferred date</dt><dd>{job.preferred_date?new Date(job.preferred_date+'T00:00:00').toLocaleDateString():'Not specified'}</dd></div><div><dt>Customer preferred times</dt><dd>{futureSlots.length?<div>{futureSlots.map((slot,i)=><div key={`${slot}-visit-${i}`}>{formatPreferredSlot(slot)}</div>)}</div>:expiredSlots.length?'Expired — set a new future time':'Not submitted'}</dd></div><div><dt>Visit time</dt><dd>{job.inspection?.scheduled_start?new Date(job.inspection.scheduled_start).toLocaleString():'Not scheduled'}</dd></div></dl></div><div className="providerModeCard"><div className="providerSectionHead"><div><h2>Job</h2></div></div><dl className="providerReadableData"><div><dt>Service</dt><dd>{job.service_name}</dd></div><div><dt>Reference</dt><dd>{ticket}</dd></div></dl>{job.problem_description?<div className="providerJobProblem providerProblemClean"><small>Customer request</small><p>{job.problem_description}</p></div>:null}</div></section>
  <p className="muted" role="status">{message}</p>
 </>:<section className="providerModeCard"><div className="providerEmptyState"><h3>Job unavailable</h3><p>{message}</p><a className="primary" href="/provider/jobs">Customer Work</a></div></section>}</div></main>;
}