'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CustomerHeader from '../components/customer/CustomerHeader';
import ServiceIcon from '../components/customer/ServiceIcon';
import '../customer-v3.css';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
type RequestRow={id:string;ticket_number:string;service_name:string;service_category_code:string;service_location_text:string;preferred_date:string;problem_description:string;status:string;assigned_provider_label?:string|null;created_at:string;updated_at:string};
type Filter='ACTIVE'|'COMPLETED'|'ALL';
function pretty(v:string){return v.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function when(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});}
function actionFor(r:RequestRow){if(r.status==='NEW')return'View provider responses';if(r.status==='ACCEPTED')return r.assigned_provider_label?'Continue with provider':'Choose provider';if(r.status==='PROCESSING')return'Track work';if(r.status==='COMPLETED')return'View completion';return'Open request';}

export default function MyRequestsPage(){
 const[requests,setRequests]=useState<RequestRow[]>([]);const[filter,setFilter]=useState<Filter>('ACTIVE');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load requests');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list'});setRequests(p.requests||[]);setMessage((p.requests||[]).length?'Up to date':'No requests yet');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load requests');}finally{setBusy(false);}}
 const visible=useMemo(()=>requests.filter(r=>filter==='ALL'||(filter==='COMPLETED'?r.status==='COMPLETED':r.status!=='COMPLETED')),[requests,filter]);
 const counts=useMemo(()=>({all:requests.length,active:requests.filter(r=>r.status!=='COMPLETED').length,completed:requests.filter(r=>r.status==='COMPLETED').length}),[requests]);
 return <main className="c3Page"><CustomerHeader title="Requests" backHref="/" right={<a className="c3IconButton" href="/?new=1" aria-label="New request"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></a>}/><div className="c3Shell c3Requests">
  <div className="c3RequestsTop"><div><h1>My requests</h1><p>{counts.active?`${counts.active} active request${counts.active===1?'':'s'}`:'Nothing needs your attention right now.'}</p></div><button className="c3Secondary" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh'}</button></div>
  <div className="c3Filters"><button className={filter==='ACTIVE'?'active':''} onClick={()=>setFilter('ACTIVE')}>Active {counts.active}</button><button className={filter==='COMPLETED'?'active':''} onClick={()=>setFilter('COMPLETED')}>Completed {counts.completed}</button><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>All {counts.all}</button></div>
  {message&&message!=='Up to date'?<div className="c3Notice">{message}</div>:null}
  <section className="c3RequestList">{visible.map(r=><article key={r.id} className={`c3RequestCard ${r.status==='COMPLETED'?'completed':''}`}><div className="c3RequestMain"><div className="c3RequestIcon"><ServiceIcon name={r.service_name}/></div><div><span className={`c3Status ${r.status==='COMPLETED'?'completed':''}`}>{pretty(r.status)}</span><h2>{r.service_name}</h2><p>{r.assigned_provider_label||'Provider not selected yet'}</p></div><span className="c3Ticket">{r.ticket_number}</span></div><div className="c3RequestMeta"><span><strong>{r.service_location_text}</strong></span><span>Preferred <strong>{r.preferred_date}</strong></span><span>Created <strong>{when(r.created_at)}</strong></span></div><div className="c3RequestAction"><div><span>Next</span><strong>{actionFor(r)}</strong></div><a className="c3Primary" href={`/requests/${encodeURIComponent(r.ticket_number)}`}>Open</a></div></article>)}{!visible.length?<div className="c3Empty"><h2>No requests here</h2><p>{filter==='COMPLETED'?'Completed requests will appear here.':'Create a request when you need a local service provider.'}</p><a className="c3Primary" href="/">Create request</a></div>:null}</section>
 </div></main>;
}
