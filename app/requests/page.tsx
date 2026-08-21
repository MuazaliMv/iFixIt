'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
type RequestRow={id:string;ticket_number:string;service_name:string;service_category_code:string;service_location_text:string;preferred_date:string;problem_description:string;status:string;assigned_provider_label?:string|null;created_at:string;updated_at:string};
type Filter='ACTIVE'|'COMPLETED'|'ALL';

export default function MyRequestsPage(){
 const[requests,setRequests]=useState<RequestRow[]>([]);const[filter,setFilter]=useState<Filter>('ACTIVE');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading your requests…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Request history failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list'});setRequests(p.requests||[]);setMessage((p.requests||[]).length?'Your request history is up to date.':'You have no service requests yet.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load requests.');}finally{setBusy(false);}}
 const visible=useMemo(()=>requests.filter(r=>filter==='ALL'||(filter==='COMPLETED'?r.status==='COMPLETED':r.status!=='COMPLETED')),[requests,filter]);
 const counts=useMemo(()=>({all:requests.length,active:requests.filter(r=>r.status!=='COMPLETED').length,completed:requests.filter(r=>r.status==='COMPLETED').length}),[requests]);
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">My Requests</p></div><div className="actions"><a className="primary" href="/#request">New Request</a><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button></div></header>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">CUSTOMER DASHBOARD</p><h2>All your service requests</h2></div><span className="pill">{counts.active} active</span></div><div className="adminStats"><div className="statCard"><span>All</span><strong>{counts.all}</strong></div><div className="statCard"><span>Active</span><strong>{counts.active}</strong></div><div className="statCard"><span>Completed</span><strong>{counts.completed}</strong></div></div>{message?<p className="formMessage" role="status">{message}</p>:null}<div className="filterRow"><button className={filter==='ACTIVE'?'filterChip active':'filterChip'} onClick={()=>setFilter('ACTIVE')}>Active</button><button className={filter==='COMPLETED'?'filterChip active':'filterChip'} onClick={()=>setFilter('COMPLETED')}>Completed</button><button className={filter==='ALL'?'filterChip active':'filterChip'} onClick={()=>setFilter('ALL')}>All</button></div></section>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">REQUESTS</p><h2>{filter==='ACTIVE'?'Active requests':filter==='COMPLETED'?'Completed requests':'Request history'}</h2></div></div><div className="jobList">{visible.map(r=><article key={r.id} className="jobCard"><div className="jobTop"><div><strong className="ticket">{r.ticket_number}</strong><span>{r.service_name}</span></div><span className="pill">{r.status}</span></div><div className="jobMeta"><span>{r.service_location_text}</span><span>{r.preferred_date}</span>{r.assigned_provider_label?<span>{r.assigned_provider_label}</span>:null}</div><p className="jobDescription">{r.problem_description}</p><div className="actions"><a className="primary" href={`/requests/${encodeURIComponent(r.ticket_number)}`}>View Request</a></div></article>)}{!visible.length?<div className="emptyQueue">No requests in this section.</div>:null}</div></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Authenticated Request History</span></footer>
 </main>;
}
