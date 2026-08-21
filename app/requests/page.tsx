'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
type RequestRow={id:string;ticket_number:string;service_name:string;service_category_code:string;service_location_text:string;preferred_date:string;problem_description:string;status:string;assigned_provider_label?:string|null;created_at:string;updated_at:string};
type Filter='ACTIVE'|'COMPLETED'|'ALL';
function pretty(v:string){return v.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function when(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString();}

export default function MyRequestsPage(){
 const[requests,setRequests]=useState<RequestRow[]>([]);const[filter,setFilter]=useState<Filter>('ACTIVE');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading your requests…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Request history failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list'});setRequests(p.requests||[]);setMessage((p.requests||[]).length?'Your request history is up to date.':'You have no service requests yet.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load requests.');}finally{setBusy(false);}}
 const visible=useMemo(()=>requests.filter(r=>filter==='ALL'||(filter==='COMPLETED'?r.status==='COMPLETED':r.status!=='COMPLETED')),[requests,filter]);
 const counts=useMemo(()=>({all:requests.length,active:requests.filter(r=>r.status!=='COMPLETED').length,completed:requests.filter(r=>r.status==='COMPLETED').length}),[requests]);
 return <main className="shell customerRequestsApp">
  <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">My Requests</p></div><div className="actions"><a className="primary" href="/#request">+ New Request</a><button className="secondary" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'Refresh'}</button></div></header>
  <section className="panel requestAppPanel"><div className="requestAppHeading"><div><h1>My Requests</h1><p>Track every service request from provider selection through completion.</p></div><span className="pill">{counts.active} active</span></div>
   <div className="requestTabs"><button className={filter==='ACTIVE'?'active':''} onClick={()=>setFilter('ACTIVE')}>Active <span>{counts.active}</span></button><button className={filter==='COMPLETED'?'active':''} onClick={()=>setFilter('COMPLETED')}>Completed <span>{counts.completed}</span></button><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>All <span>{counts.all}</span></button></div>{message?<p className="formMessage" role="status">{message}</p>:null}
  </section>
  <section className="requestCards">{visible.map(r=><article key={r.id} className="requestAppCard"><div className="requestCardIcon">🔧</div><div className="requestCardBody"><div className="requestCardTop"><div><span className="requestStatus">{pretty(r.status)}</span><h2>{r.service_name}</h2><p>{r.problem_description}</p></div><div className="requestCardId"><strong>{r.ticket_number}</strong><small>{when(r.created_at)}</small></div></div><div className="requestInfoGrid"><div><span>📍 Location</span><strong>{r.service_location_text}</strong></div><div><span>🗓 Preferred</span><strong>{r.preferred_date}</strong></div><div><span>👤 Provider</span><strong>{r.assigned_provider_label||'Waiting for selection'}</strong></div></div><div className="requestCardActions"><a className="primary" href={`/requests/${encodeURIComponent(r.ticket_number)}`}>View Request Details →</a></div></div></article>)}{!visible.length?<div className="panel emptyQueue">No requests in this section.</div>:null}</section>
 </main>;
}
