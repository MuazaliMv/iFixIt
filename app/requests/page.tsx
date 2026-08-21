'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
type RequestRow={id:string;ticket_number:string;service_name:string;service_category_code:string;service_location_text:string;preferred_date:string;problem_description:string;status:string;assigned_provider_label?:string|null;created_at:string;updated_at:string};
type Filter='ACTIVE'|'COMPLETED'|'ALL';
const stages=['NEW','ACCEPTED','PROCESSING','COMPLETED'] as const;
function pretty(v:string){return v.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function when(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});}
function stageIndex(status:string){const i=stages.indexOf(status as (typeof stages)[number]);return i<0?0:i;}
function stageLabel(status:string){if(status==='NEW')return'Waiting for providers';if(status==='ACCEPTED')return'Provider selected';if(status==='PROCESSING')return'Work in progress';if(status==='COMPLETED')return'Completed';return pretty(status);}
function nextAction(r:RequestRow){if(r.status==='NEW')return'Compare provider responses';if(r.status==='ACCEPTED')return r.assigned_provider_label?'Schedule or track inspection':'Choose a provider';if(r.status==='PROCESSING')return'Track approved work';if(r.status==='COMPLETED')return'Review completion and rating';return'View request';}
function serviceMark(name:string){const n=name.toLowerCase();if(n.includes('electric'))return'⚡';if(n.includes('plumb'))return'◉';if(n.includes('air')||n.includes('ac'))return'❄';if(n.includes('clean'))return'✦';if(n.includes('paint'))return'◐';return'⌁';}

export default function MyRequestsPage(){
 const[requests,setRequests]=useState<RequestRow[]>([]);const[filter,setFilter]=useState<Filter>('ACTIVE');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading your requests…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Request history failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list'});setRequests(p.requests||[]);setMessage((p.requests||[]).length?'Request history is up to date.':'You have no service requests yet.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load requests.');}finally{setBusy(false);}}
 const visible=useMemo(()=>requests.filter(r=>filter==='ALL'||(filter==='COMPLETED'?r.status==='COMPLETED':r.status!=='COMPLETED')),[requests,filter]);
 const counts=useMemo(()=>({all:requests.length,active:requests.filter(r=>r.status!=='COMPLETED').length,completed:requests.filter(r=>r.status==='COMPLETED').length}),[requests]);
 return <main className="shell customerRequestsApp premiumRequests">
  <header className="topbar premiumCustomerTopbar"><div><a className="brand" href="/">iFixIt</a><p className="tagline">My Requests</p></div><div className="actions"><a className="primary" href="/#request">＋ New Request</a><button className="secondary compactAction" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'↻'}</button></div></header>

  <section className="requestHubHero"><div><span className="requestHubEyebrow">CUSTOMER REQUESTS</span><h1>Everything you’ve booked, in one place.</h1><p>See what needs attention now, who is helping, and exactly where each request is in the service journey.</p></div><div className="requestHubStats"><div><strong>{counts.active}</strong><span>Active</span></div><div><strong>{counts.completed}</strong><span>Completed</span></div><div><strong>{counts.all}</strong><span>Total</span></div></div></section>

  <section className="requestFilterBar"><div className="requestTabs premiumRequestTabs"><button className={filter==='ACTIVE'?'active':''} onClick={()=>setFilter('ACTIVE')}>Active <span>{counts.active}</span></button><button className={filter==='COMPLETED'?'active':''} onClick={()=>setFilter('COMPLETED')}>Completed <span>{counts.completed}</span></button><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>All <span>{counts.all}</span></button></div><span className="requestSyncText">{message}</span></section>

  <section className="requestCards premiumRequestCards">{visible.map(r=>{const current=stageIndex(r.status);return <article key={r.id} className="premiumRequestCard"><div className="premiumRequestLead"><div className="premiumServiceMark">{serviceMark(r.service_name)}</div><div className="premiumRequestTitle"><div className="premiumStatusRow"><span className={`premiumStatus premiumStatus-${r.status.toLowerCase()}`}>{stageLabel(r.status)}</span><span className="premiumTicket">{r.ticket_number}</span></div><h2>{r.service_name}</h2><p>{r.problem_description}</p></div></div>
   <div className="premiumRequestFacts"><div><span>Location</span><strong>{r.service_location_text}</strong></div><div><span>Preferred date</span><strong>{r.preferred_date}</strong></div><div><span>Provider</span><strong>{r.assigned_provider_label||'Not selected yet'}</strong></div><div><span>Created</span><strong>{when(r.created_at)}</strong></div></div>
   <div className="premiumMiniProgress" aria-label={`Request status ${pretty(r.status)}`}>{stages.map((stage,index)=><div className={index<=current?'done':''} key={stage}><span>{index<current?'✓':index+1}</span><small>{stage==='NEW'?'Request':stage==='ACCEPTED'?'Provider':stage==='PROCESSING'?'Work':'Done'}</small></div>)}</div>
   <div className="premiumRequestFooter"><div><span className="premiumNextLabel">NEXT ACTION</span><strong>{nextAction(r)}</strong></div><a className="premiumOpenButton" href={`/requests/${encodeURIComponent(r.ticket_number)}`}>Open request <span>›</span></a></div>
  </article>})}{!visible.length?<div className="premiumEmptyRequest"><div>⌁</div><h2>No requests here yet</h2><p>{filter==='COMPLETED'?'Completed requests will appear here.':'Create a service request and track it from this screen.'}</p><a className="primary" href="/#request">Create Request</a></div>:null}</section>
 </main>;
}
