'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';
import styles from '../requests/requests.module.css';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-marketplace';
const PAGE_SIZE=10;
type Summary={totalRequests:number;last30Days:number;completionRate:number;unassignedNew:number;approvedProviders:number;activeProviders:number;coveredIslands:number;totalIslands:number};
type ServiceRow={code:string;name:string;total:number;completed:number};
type PlaceRow={id:string;name:string;code?:string;total:number};
type StatusCounts={NEW:number;ACCEPTED:number;PROCESSING:number;COMPLETED:number};
type View='OVERVIEW'|'SERVICES'|'ATOLLS'|'ISLANDS';
type Detail={kind:'service'|'atoll'|'island';id:string}|null;

const filters:[View,string,string][]=[
 ['OVERVIEW','Overview','all'],
 ['SERVICES','Services','new'],
 ['ATOLLS','Atolls','accepted'],
 ['ISLANDS','Islands / Cities','processing'],
];

export default function AdminReportsPage(){
 const[summary,setSummary]=useState<Summary|null>(null);
 const[statusCounts,setStatusCounts]=useState<StatusCounts>({NEW:0,ACCEPTED:0,PROCESSING:0,COMPLETED:0});
 const[byService,setByService]=useState<ServiceRow[]>([]);
 const[byAtoll,setByAtoll]=useState<PlaceRow[]>([]);
 const[byIsland,setByIsland]=useState<PlaceRow[]>([]);
 const[message,setMessage]=useState('Loading marketplace performance…');
 const[busy,setBusy]=useState(false);
 const[view,setView]=useState<View>('OVERVIEW');
 const[query,setQuery]=useState('');
 const[page,setPage]=useState(1);
 const[selected,setSelected]=useState<Detail>(null);
 const[lastUpdated,setLastUpdated]=useState<Date|null>(null);

 useEffect(()=>{void load();},[]);
 useEffect(()=>{setPage(1);setSelected(null);},[view,query]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function load(){setBusy(true);try{const t=await token();if(!t)return;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'reports'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load reports');setSummary(p.summary);setStatusCounts(p.statusCounts||{});setByService(p.byService||[]);setByAtoll(p.byAtoll||[]);setByIsland(p.byIsland||[]);setLastUpdated(new Date());setMessage('Marketplace performance is up to date.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load marketplace performance.');}finally{setBusy(false);}}

 const coverage=summary?.totalIslands?Math.round((summary.coveredIslands/summary.totalIslands)*1000)/10:0;
 const q=query.trim().toLowerCase();
 const services=useMemo(()=>byService.filter(s=>!q||`${s.name} ${s.code}`.toLowerCase().includes(q)).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),[byService,q]);
 const atolls=useMemo(()=>byAtoll.filter(a=>!q||`${a.name} ${a.code||''}`.toLowerCase().includes(q)).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),[byAtoll,q]);
 const islands=useMemo(()=>byIsland.filter(i=>!q||i.name.toLowerCase().includes(q)).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),[byIsland,q]);
 const currentCount=view==='SERVICES'?services.length:view==='ATOLLS'?atolls.length:view==='ISLANDS'?islands.length:0;
 const totalPages=Math.max(1,Math.ceil(currentCount/PAGE_SIZE));
 useEffect(()=>{if(page>totalPages)setPage(totalPages);},[page,totalPages]);
 const pageSlice=<T,>(rows:T[])=>rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const completion=(s:ServiceRow)=>s.total?Math.round(s.completed*1000/s.total)/10:0;
 const toggle=(kind:'service'|'atoll'|'island',id:string)=>setSelected(v=>v?.kind===kind&&v.id===id?null:{kind,id});

 function pagination(){if(currentCount<=PAGE_SIZE)return null;return <div className="paginationBar"><button className="secondary" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><span className="muted">Page {page} of {totalPages} · {currentCount} records</span><button className="secondary" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button></div>}

 return <main className={`${styles.page} shell adminRequestsPage`}>
  <header className="topbar adminRequestsTopbar"><div><p className="eyebrow">ADMIN WORKSPACE</p><h1 className="pageTitle">Marketplace Performance</h1><p className="tagline">Monitor demand, completion, provider coverage and geographic performance.</p></div><button className="primary refreshAction" onClick={()=>void load()} disabled={busy}><span aria-hidden="true">↻</span>{busy?'Refreshing…':'Refresh'}</button></header>
  <AdminNav />

  <section className="requestToolbarPanel">
   <div className="requestStatusBar" role="status"><span className="statusCheck">✓</span><span><b>{message}</b>{lastUpdated?<small>Last updated {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>:null}</span></div>
   <div className="requestSearchRow"><label className="requestSearchLabel">Search marketplace data<span className="requestSearchBox"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Service, code, atoll, island or city"/></span></label></div>
   <div className="filterRow requestFilterRow" aria-label="Marketplace performance view">{filters.map(([key,label,tone])=><button key={key} className={`statusFilter statusFilter-${tone} ${view===key?'active':''}`} onClick={()=>setView(key)}><span className="statusFilterDot" aria-hidden="true"/>{label}</button>)}</div>
  </section>

  {view==='OVERVIEW'?<>
   <section className="panel requestsListPanel"><div className="panelHeader"><div><p className="eyebrow">MARKETPLACE SNAPSHOT</p><h2>Current performance</h2><p className="muted">Live operational metrics using the same card language as Request Management.</p></div><span className="pill">Live data</span></div>{summary?<div className="jobList">
    <article className="jobCard requestRowCard requestCardTone-other"><div className="jobTop"><div><strong className="ticket">Total requests</strong><span className="requestServiceName">All marketplace demand</span></div><span className="requestStatus requestStatus-new">{summary.totalRequests}</span></div><div className="jobMeta requestMeta"><span><b>Last 30 days</b>{summary.last30Days}</span><span><b>Completion rate</b>{summary.completionRate}%</span><span><b>Unassigned new</b>{summary.unassignedNew}</span><span><b>Approved providers</b>{summary.approvedProviders}</span><span><b>Active providers</b>{summary.activeProviders}</span></div></article>
    <article className="jobCard requestRowCard requestCardTone-processing"><div className="jobTop"><div><strong className="ticket">Request pipeline</strong><span className="requestServiceName">Current lifecycle distribution</span></div><span className="requestStatus requestStatus-processing">Live</span></div><div className="jobMeta requestMeta"><span><b>New</b>{statusCounts.NEW||0}</span><span><b>Accepted</b>{statusCounts.ACCEPTED||0}</span><span><b>Processing</b>{statusCounts.PROCESSING||0}</span><span><b>Completed</b>{statusCounts.COMPLETED||0}</span><span><b>Completion</b>{summary.completionRate}%</span></div></article>
    <article className="jobCard requestRowCard requestCardTone-completed"><div className="jobTop"><div><strong className="ticket">Provider coverage</strong><span className="requestServiceName">Marketplace service footprint</span></div><span className="requestStatus requestStatus-completed">{coverage}% coverage</span></div><div className="jobMeta requestMeta"><span><b>Approved providers</b>{summary.approvedProviders}</span><span><b>Active providers</b>{summary.activeProviders}</span><span><b>Covered islands</b>{summary.coveredIslands}</span><span><b>Total locations</b>{summary.totalIslands}</span><span><b>Coverage</b>{coverage}%</span></div></article>
   </div>:<div className="emptyQueue">No marketplace summary is available.</div>}</section>
  </>:null}

  {view==='SERVICES'?<section className="panel requestsListPanel"><div className="panelHeader"><div><p className="eyebrow">SERVICE DEMAND</p><h2>Requests by service</h2><p className="muted">Showing {services.length} service{services.length===1?'':'s'}, highest request volume first.</p></div></div><div className="jobList">{pageSlice(services).map(s=>{const rate=completion(s);const open=selected?.kind==='service'&&selected.id===s.code;return <div className="requestCardGroup" key={s.code}><article className={`jobCard requestRowCard ${rate>=80?'requestCardTone-completed':rate>=50?'requestCardTone-processing':'requestCardTone-other'}`}><div className="jobTop"><div><strong className="ticket">{s.name}</strong><span className="requestServiceName">{s.code}</span></div><span className={`requestStatus ${rate>=80?'requestStatus-completed':rate>=50?'requestStatus-processing':'requestStatus-new'}`}>{rate}% complete</span></div><div className="jobMeta requestMeta"><span><b>Total requests</b>{s.total}</span><span><b>Completed</b>{s.completed}</span><span><b>Open / other</b>{Math.max(0,s.total-s.completed)}</span><span><b>Completion rate</b>{rate}%</span><span><b>Demand rank</b>#{services.findIndex(x=>x.code===s.code)+1}</span></div><div className="actions requestRowActions"><button className="primary" onClick={()=>toggle('service',s.code)}>{open?'Close Details':'Open Details'}</button></div></article>{open?<div className="inlineRequestDetail"><div className="panelHeader"><div><p className="eyebrow">SERVICE PERFORMANCE DETAIL</p><h2>{s.name}</h2></div><button className="secondary" onClick={()=>setSelected(null)}>Close</button></div><div className="trackingGrid"><div className="requestSummary"><p><b>Service code:</b> {s.code}</p><p><b>Total requests:</b> {s.total}</p><p><b>Completed requests:</b> {s.completed}</p><p><b>Completion rate:</b> {rate}%</p><p><b>Outstanding:</b> {Math.max(0,s.total-s.completed)}</p></div></div></div>:null}</div>})}{!services.length?<div className="emptyQueue">No services match your search.</div>:null}</div>{pagination()}</section>:null}

  {view==='ATOLLS'?<section className="panel requestsListPanel"><div className="panelHeader"><div><p className="eyebrow">GEOGRAPHIC DEMAND</p><h2>Requests by atoll</h2><p className="muted">Showing {atolls.length} atoll{atolls.length===1?'':'s'}, highest request volume first.</p></div></div><div className="jobList">{pageSlice(atolls).map(a=>{const open=selected?.kind==='atoll'&&selected.id===a.id;return <div className="requestCardGroup" key={a.id}><article className="jobCard requestRowCard requestCardTone-other"><div className="jobTop"><div><strong className="ticket">{a.name}</strong><span className="requestServiceName">{a.code||'Atoll'}</span></div><span className="requestStatus requestStatus-accepted">{a.total} requests</span></div><div className="jobMeta requestMeta"><span><b>Requests</b>{a.total}</span><span><b>Atoll code</b>{a.code||'—'}</span><span><b>Demand rank</b>#{atolls.findIndex(x=>x.id===a.id)+1}</span><span><b>Share</b>{summary?.totalRequests?Math.round(a.total*1000/summary.totalRequests)/10:0}%</span><span><b>Type</b>Atoll</span></div><div className="actions requestRowActions"><button className="primary" onClick={()=>toggle('atoll',a.id)}>{open?'Close Details':'Open Details'}</button></div></article>{open?<div className="inlineRequestDetail"><div className="panelHeader"><div><p className="eyebrow">ATOLL PERFORMANCE DETAIL</p><h2>{a.name}</h2></div><button className="secondary" onClick={()=>setSelected(null)}>Close</button></div><div className="requestSummary"><p><b>Atoll:</b> {a.name}</p><p><b>Code:</b> {a.code||'Not provided'}</p><p><b>Total requests:</b> {a.total}</p><p><b>Marketplace share:</b> {summary?.totalRequests?Math.round(a.total*1000/summary.totalRequests)/10:0}%</p></div></div>:null}</div>})}{!atolls.length?<div className="emptyQueue">No atolls match your search.</div>:null}</div>{pagination()}</section>:null}

  {view==='ISLANDS'?<section className="panel requestsListPanel"><div className="panelHeader"><div><p className="eyebrow">TOP ISLANDS / CITIES</p><h2>Highest request volumes</h2><p className="muted">Showing {islands.length} location{islands.length===1?'':'s'}, highest request volume first.</p></div></div><div className="jobList">{pageSlice(islands).map(i=>{const open=selected?.kind==='island'&&selected.id===i.id;return <div className="requestCardGroup" key={i.id}><article className="jobCard requestRowCard requestCardTone-processing"><div className="jobTop"><div><strong className="ticket">{i.name}</strong><span className="requestServiceName">Island / City</span></div><span className="requestStatus requestStatus-processing">{i.total} requests</span></div><div className="jobMeta requestMeta"><span><b>Requests</b>{i.total}</span><span><b>Demand rank</b>#{islands.findIndex(x=>x.id===i.id)+1}</span><span><b>Marketplace share</b>{summary?.totalRequests?Math.round(i.total*1000/summary.totalRequests)/10:0}%</span><span><b>Coverage</b>{summary?.coveredIslands||0} locations</span><span><b>Type</b>Island / City</span></div><div className="actions requestRowActions"><button className="primary" onClick={()=>toggle('island',i.id)}>{open?'Close Details':'Open Details'}</button></div></article>{open?<div className="inlineRequestDetail"><div className="panelHeader"><div><p className="eyebrow">LOCATION PERFORMANCE DETAIL</p><h2>{i.name}</h2></div><button className="secondary" onClick={()=>setSelected(null)}>Close</button></div><div className="requestSummary"><p><b>Location:</b> {i.name}</p><p><b>Total requests:</b> {i.total}</p><p><b>Demand rank:</b> #{islands.findIndex(x=>x.id===i.id)+1}</p><p><b>Marketplace share:</b> {summary?.totalRequests?Math.round(i.total*1000/summary.totalRequests)/10:0}%</p></div></div>:null}</div>})}{!islands.length?<div className="emptyQueue">No islands or cities match your search.</div>:null}</div>{pagination()}</section>:null}
 </main>;
}
