'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import AdminNav from '../../AdminNav';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-provider-reports';

type ExceptionRow={
 requestId:string;
 ticket:string;
 service:string;
 location:string;
 status:string;
 dispatchState?:string|null;
 deadline:string;
 acceptedProviderCount:number;
 lateAcceptedCount:number;
 firstAcceptedAt?:string|null;
 firstAcceptedProvider?:string|null;
 assignedProvider?:string|null;
 reason:string;
};
type ExceptionSummary={requestCount:number;noAcceptanceCount:number;lateOnlyCount:number};

function when(v?:string|null){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString();}

export default function NoProviderOnTimeReport(){
 const[rows,setRows]=useState<ExceptionRow[]>([]);
 const[summary,setSummary]=useState<ExceptionSummary>({requestCount:0,noAcceptanceCount:0,lateOnlyCount:0});
 const[message,setMessage]=useState('Loading SLA exceptions…');
 const[busy,setBusy]=useState(false);
 const[query,setQuery]=useState('');

 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function load(){setBusy(true);try{const t=await token();if(!t)return;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'timeliness'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load report');setRows(p.noProviderAcceptedOnTime||[]);setSummary(p.noProviderAcceptedOnTimeSummary||{requestCount:0,noAcceptanceCount:0,lateOnlyCount:0});setMessage('SLA exception report is up to date.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load report.');}finally{setBusy(false);}}
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return rows;return rows.filter(r=>`${r.ticket} ${r.service} ${r.location} ${r.status} ${r.assignedProvider||''} ${r.firstAcceptedProvider||''}`.toLowerCase().includes(q));},[rows,query]);

 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Reports • SLA Exceptions</p></div><button className="secondary" onClick={()=>void load()} disabled={busy}>{busy?'Loading…':'Refresh'}</button></header>
  <AdminNav />
  <section className="panel">
   <div className="panelHeader"><div><p className="eyebrow">ACTION REQUIRED</p><h2>No Provider Accepted On Time</h2><p className="muted">Requests whose active provider-response deadline passed with zero provider acceptances before the deadline.</p></div><span className="pill">{summary.requestCount} exception{summary.requestCount===1?'':'s'}</span></div>
   <p className="formMessage" role="status">{message}</p>
   <div className="adminStats"><div className="statCard"><span>Total SLA exceptions</span><strong>{summary.requestCount}</strong></div><div className="statCard"><span>No acceptance at all</span><strong>{summary.noAcceptanceCount}</strong></div><div className="statCard"><span>Accepted only after deadline</span><strong>{summary.lateOnlyCount}</strong></div></div>
   <div className="formGrid"><label className="full">Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Request, service, location or provider"/></label></div>
  </section>
  <section className="panel">
   {visible.length?<div className="userTableWrap"><table className="userTable"><thead><tr><th>Request</th><th>Service</th><th>Location</th><th>Deadline</th><th>Acceptances</th><th>First acceptance</th><th>Result</th><th>Action</th></tr></thead><tbody>{visible.map(r=><tr key={r.requestId}><td><strong>{r.ticket}</strong><small>{r.status} · {r.dispatchState||'Dispatch'}</small></td><td>{r.service}</td><td>{r.location}</td><td>{when(r.deadline)}</td><td><strong>{r.acceptedProviderCount}</strong><small>{r.lateAcceptedCount?`${r.lateAcceptedCount} late`:r.acceptedProviderCount===0?'None':'No on-time acceptance'}</small></td><td>{r.firstAcceptedAt?<><strong>{r.firstAcceptedProvider||r.assignedProvider||'Provider'}</strong><small>{when(r.firstAcceptedAt)}</small></>:'—'}</td><td><strong>{r.acceptedProviderCount===0?'No provider accepted':'Accepted late only'}</strong><small>{r.reason}</small></td><td><a className="primary" href="/admin/requests">Open Request Operations</a></td></tr>)}</tbody></table></div>:<div className="emptyQueue">No requests currently failed the provider acceptance deadline.</div>}
  </section>
 </main>;
}
