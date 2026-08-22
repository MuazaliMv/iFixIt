'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';
import styles from './escalations.module.css';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-escalations';
const PAGE_SIZE=10;
type Escalation={id:string;ticket_number:string;escalation_type:string;severity:'INFO'|'WARNING'|'HIGH'|'CRITICAL';status:'OPEN'|'ACKNOWLEDGED'|'RESOLVED';summary:string;first_detected_at:string;last_detected_at:string};
type Counts={critical:number;high:number;warning:number;open:number;acknowledged:number};
type Filter='ALL'|'OPEN'|'ACKNOWLEDGED'|'RESOLVED';
const empty:Counts={critical:0,high:0,warning:0,open:0,acknowledged:0};
function pretty(v:string){return v.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function when(v:string){return new Date(v).toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});}
function cardTone(status:Escalation['status']){return status==='RESOLVED'?'completed':status==='ACKNOWLEDGED'?'processing':status==='OPEN'?'unaccepted':'other';}

export default function EscalationsPage(){
 const[rows,setRows]=useState<Escalation[]>([]);const[counts,setCounts]=useState<Counts>(empty);const[busy,setBusy]=useState(false);const[filter,setFilter]=useState<Filter>('ALL');const[query,setQuery]=useState('');const[page,setPage]=useState(1);const[expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>{void load();},[]);
 useEffect(()=>{setPage(1);setExpanded(null);},[filter,query]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)return null;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Escalation request failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list',status:'ACTIVE'});if(!p)return;setRows(p.escalations||[]);setCounts(p.counts||empty);}catch(e){console.error(e);}finally{setBusy(false);}}
 async function act(id:string,action:'acknowledge'|'resolve'){setBusy(true);try{await call({action,escalationId:id});await load();setExpanded(null);}catch(e){console.error(e);setBusy(false);}}
 const visible=useMemo(()=>rows.filter(e=>(filter==='ALL'||e.status===filter)&&(!query.trim()||`${e.ticket_number} ${e.summary} ${e.escalation_type} ${e.severity} ${e.status}`.toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b)=>new Date(b.last_detected_at||b.first_detected_at).getTime()-new Date(a.last_detected_at||a.first_detected_at).getTime()),[rows,filter,query]);
 const totalPages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
 const paged=visible.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 useEffect(()=>{if(page>totalPages)setPage(totalPages);},[page,totalPages]);
 return <main className={`${styles.page} shell`}>
  <AdminNav />

  <section className="attentionStats"><article><span>Critical</span><strong>{counts.critical}</strong></article><article><span>High</span><strong>{counts.high}</strong></article><article><span>Warning</span><strong>{counts.warning}</strong></article><article><span>Open</span><strong>{counts.open}</strong></article><article><span>Acknowledged</span><strong>{counts.acknowledged}</strong></article></section>

  <section className="panel attentionToolbar"><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ticket, issue, severity or status"/></label><div className="statusFilters">{(['ALL','OPEN','ACKNOWLEDGED','RESOLVED'] as Filter[]).map(key=><button key={key} className={`statusFilter statusFilter-${key.toLowerCase()} ${filter===key?'active':''}`} onClick={()=>setFilter(key)}><span className="dot"/>{key==='ALL'?'All':pretty(key)}</button>)}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">LATEST ISSUES</p><h2>{filter==='ALL'?'All Attention Cases':pretty(filter)}</h2><p className="muted">Newest activity first · {visible.length} case{visible.length===1?'':'s'}.</p></div></div><div className="jobList">{paged.map(e=><div className="attentionGroup" key={e.id}><article className={`jobCard attentionCard attentionTone-${cardTone(e.status)}`}><div className="jobTop"><div><strong>{e.ticket_number}</strong><span className="issueSummary">{e.summary}</span></div><span className={`requestStatus requestStatus-${e.status.toLowerCase()}`}>{pretty(e.status)}</span></div><div className="issueMeta"><span><b>Severity</b>{pretty(e.severity)}</span><span><b>Issue</b>{pretty(e.escalation_type)}</span><span><b>First detected</b>{when(e.first_detected_at)}</span><span><b>Last activity</b>{when(e.last_detected_at)}</span></div><div className="actions attentionActions"><button className="primary" onClick={()=>setExpanded(expanded===e.id?null:e.id)}>{expanded===e.id?'Close Details':'Open Issue'}</button></div></article>{expanded===e.id?<div className="inlineDetails"><div><p><b>Ticket:</b> {e.ticket_number}</p><p><b>Status:</b> {pretty(e.status)}</p><p><b>Severity:</b> {pretty(e.severity)}</p><p><b>Issue type:</b> {pretty(e.escalation_type)}</p><p><b>Summary:</b> {e.summary}</p></div><div className="actions"><a className="secondary" href={`/admin/requests?ticket=${encodeURIComponent(e.ticket_number)}`}>Open Request</a>{e.status==='OPEN'?<button className="secondary" onClick={()=>void act(e.id,'acknowledge')} disabled={busy}>Acknowledge</button>:null}{e.status!=='RESOLVED'?<button className="primary" onClick={()=>void act(e.id,'resolve')} disabled={busy}>Resolve</button>:null}</div></div>:null}</div>)}{!paged.length?<div className="emptyQueue">No cases match this view.</div>:null}</div>{visible.length>PAGE_SIZE?<div className="paginationBar"><button className="secondary" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><span className="muted">Page {page} of {totalPages} · {visible.length} cases</span><button className="secondary" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button></div>:null}</section>
  <footer className="footer"><span>FixIt Maldives</span><span>Automatic SLA monitoring</span></footer>
 </main>;
}
