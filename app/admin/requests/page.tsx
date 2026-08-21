'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
type RequestRow={ticket_number:string;service_name:string;service_location_text:string;preferred_date:string;problem_description:string;status:'NEW'|'ACCEPTED'|'PROCESSING'|'COMPLETED';assigned_provider_label?:string|null;created_at:string;updated_at:string};
const labels:Record<RequestRow['status'],string>={NEW:'New',ACCEPTED:'Accepted',PROCESSING:'Processing',COMPLETED:'Completed'};

export default function AdminRequestsPage(){
 const[requests,setRequests]=useState<RequestRow[]>([]);const[filter,setFilter]=useState<'ALL'|RequestRow['status']>('ALL');const[message,setMessage]=useState('Loading requests…');const[loading,setLoading]=useState(false);
 const visible=useMemo(()=>filter==='ALL'?requests:requests.filter(r=>r.status===filter),[filter,requests]);
 useEffect(()=>{void load();},[]);
 async function load(){setLoading(true);try{const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}const response=await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'dashboard'})});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');setRequests(payload.requests||[]);setMessage('Request list loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load requests.');}finally{setLoading(false);}}
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Requests</p></div><button className="secondary" onClick={load} disabled={loading}>{loading?'Loading…':'Refresh'}</button></header><AdminNav />
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">REQUEST OVERSIGHT</p><h2>All Service Requests</h2></div><span className="pill">{requests.length} total</span></div><p className="formMessage" role="status">{message}</p><div className="filterRow">{(['ALL','NEW','ACCEPTED','PROCESSING','COMPLETED'] as const).map(item=><button key={item} className={filter===item?'filterChip active':'filterChip'} onClick={()=>setFilter(item)}>{item==='ALL'?'All':labels[item]}</button>)}</div><div className="jobList">{visible.map(r=><article className="jobCard" key={r.ticket_number}><div className="jobTop"><div><strong className="ticket">{r.ticket_number}</strong><span className="muted">{r.service_name}</span></div><span className="pill">{labels[r.status]}</span></div><div className="jobMeta"><span><b>Location:</b> {r.service_location_text}</span><span><b>Preferred:</b> {r.preferred_date}</span>{r.assigned_provider_label?<span><b>Provider:</b> {r.assigned_provider_label}</span>:null}</div><p className="jobDescription">{r.problem_description}</p></article>)}{!visible.length?<div className="emptyQueue">No requests to show.</div>:null}</div></section>
 </main>;
}
