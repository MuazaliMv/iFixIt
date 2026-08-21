'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-escalations';
type Escalation={id:string;ticket_number:string;escalation_type:string;severity:'INFO'|'WARNING'|'HIGH'|'CRITICAL';status:'OPEN'|'ACKNOWLEDGED'|'RESOLVED';summary:string;first_detected_at:string;last_detected_at:string};
type Counts={critical:number;high:number;warning:number;open:number;acknowledged:number};
const empty:Counts={critical:0,high:0,warning:0,open:0,acknowledged:0};
function pretty(v:string){return v.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function when(v:string){return new Date(v).toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});}

export default function EscalationsPage(){
 const[rows,setRows]=useState<Escalation[]>([]);const[counts,setCounts]=useState<Counts>(empty);const[message,setMessage]=useState('Loading escalations…');const[busy,setBusy]=useState(false);
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)return null;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Escalation request failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list',status:'ACTIVE'});if(!p)return;setRows(p.escalations||[]);setCounts(p.counts||empty);setMessage(p.escalations?.length?'Active cases requiring operations attention.':'No active SLA escalations.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load escalations.');}finally{setBusy(false);}}
 async function act(id:string,action:'acknowledge'|'resolve'){setBusy(true);try{await call({action,escalationId:id});await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to update escalation.');setBusy(false);}}
 async function run(){setBusy(true);try{await call({action:'run',escalationId:'manual'});await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to run SLA scan.');setBusy(false);}}
 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Admin Control Center</p></div><div className="actions"><a className="secondary" href="/admin/requests">Requests</a><a className="secondary" href="/admin">Dashboard</a></div></header>
  <AdminNav />
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">OPERATIONS SLA</p><h2>Escalation Queue</h2><p className="muted">Automatic provider-search, response and job-delay exceptions that need attention.</p></div><div className="actions"><button className="secondary" onClick={()=>void run()} disabled={busy}>Run Scan</button><button className="primary" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh'}</button></div></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>
  <section className="adminStats"><article className="statCard"><span>Critical</span><strong>{counts.critical}</strong></article><article className="statCard"><span>High</span><strong>{counts.high}</strong></article><article className="statCard"><span>Warning</span><strong>{counts.warning}</strong></article><article className="statCard"><span>Open</span><strong>{counts.open}</strong></article><article className="statCard"><span>Acknowledged</span><strong>{counts.acknowledged}</strong></article></section>
  <section className="panel"><div className="jobList">{rows.map(e=><article className="jobCard" key={e.id}><div className="jobTop"><div><div className="actions"><span className="pill">{e.severity}</span><span className="pill">{pretty(e.status)}</span><span className="muted">{e.ticket_number}</span></div><strong>{e.summary}</strong><div className="muted">{pretty(e.escalation_type)} · First detected {when(e.first_detected_at)} · Last checked {when(e.last_detected_at)}</div></div><div className="actions"><a className="secondary" href={`/admin/requests?ticket=${encodeURIComponent(e.ticket_number)}`}>Open Request</a>{e.status==='OPEN'?<button className="secondary" onClick={()=>void act(e.id,'acknowledge')} disabled={busy}>Acknowledge</button>:null}<button className="primary" onClick={()=>void act(e.id,'resolve')} disabled={busy}>Resolve</button></div></div></article>)}{!rows.length?<div className="muted">No active escalation cases.</div>:null}</div></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Automatic SLA monitoring</span></footer>
 </main>;
}
