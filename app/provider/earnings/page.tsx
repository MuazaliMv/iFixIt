'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import MobileNav from '../../MobileNav';

const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
type Completion={final_amount:number|string;currency:string;status:string;payment_note:string};
type Job={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;completed_at?:string|null;completion?:Completion|null};
function money(v:number,currency='MVR'){return`${currency} ${v.toFixed(2)}`;}

export default function ProviderEarningsPage(){
 const[jobs,setJobs]=useState<Job[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading completed jobs…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function load(){setBusy(true);try{const t=await token();if(!t)return;const r=await fetch(MARKET_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'dashboard'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load provider jobs');setJobs((p.requests||[]).filter((j:Job)=>j.status==='COMPLETED'));setMessage('These amounts are completed-job values recorded in iFixIt. Payment settlement happens outside iFixIt.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load completed jobs.');}finally{setBusy(false);}}
 const totals=useMemo(()=>{const withSummary=jobs.filter(j=>j.completion);const total=withSummary.reduce((sum,j)=>sum+Number(j.completion?.final_amount||0),0);const confirmed=withSummary.filter(j=>j.completion?.status==='CONFIRMED').reduce((sum,j)=>sum+Number(j.completion?.final_amount||0),0);return{total,confirmed,count:withSummary.length};},[jobs]);
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/provider">FixIt</a><p className="tagline">Provider Earnings</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'Refresh'}</button></header>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">COMPLETED JOB VALUE</p><h2>Job value summary</h2></div><span className="pill">MVR</span></div><div className="adminStats"><div className="statCard"><span>Recorded Job Value</span><strong>{money(totals.total)}</strong></div><div className="statCard"><span>Customer Confirmed</span><strong>{money(totals.confirmed)}</strong></div><div className="statCard"><span>Completed Summaries</span><strong>{totals.count}</strong></div></div><p className="localNotice">{message}</p></section>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">JOB HISTORY</p><h2>Completed jobs</h2></div><span className="pill">{jobs.length}</span></div><div className="jobList">{jobs.map(j=><article className="jobCard" key={j.id}><div className="jobTop"><div><strong>{j.service_name}</strong><span className="muted">{j.ticket_number}</span></div><span className="pill">{j.completion?.status||'Completed'}</span></div><div className="jobMeta"><span>{j.service_location_text}</span>{j.completed_at?<span>{new Date(j.completed_at).toLocaleString()}</span>:null}</div>{j.completion?<><p><b>Final job value:</b> {money(Number(j.completion.final_amount||0),j.completion.currency)}</p><p className="muted">{j.completion.payment_note}</p></>:<p className="muted">No marketplace cost summary exists for this older completed job.</p>}</article>)}{!jobs.length?<div className="emptyQueue">No completed jobs yet.</div>:null}</div></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Payments remain outside iFixIt</span></footer><MobileNav role="provider"/>
 </main>;
}
