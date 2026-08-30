'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import AdminNav from '../../AdminNav';
import './provider-detail.css';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ADMIN_USERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-users';
const SUMMARY_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-admin-summary';
const REQUEST_TIMEOUT_MS=15000;

type Account={user_id:string;email?:string|null;phone_number?:string|null;provider_approved:boolean};
type Onboarding={provider_type:string;business_name?:string|null;description?:string|null;availability_status:string;accepting_leads:boolean;onboarding_status:string;submitted_at?:string|null;approved_at?:string|null};
type Category={category_id:string;name:string;is_active:boolean};
type Hours={day_of_week:number;is_working:boolean;start_time?:string|null;end_time?:string|null;timezone_name:string};
type DocumentRow={id:string;document_type:string;document_label?:string|null;submitted_at:string};
type Detail={account:Account;onboarding:Onboarding|null;categories:Category[];hours:Hours[];documents:DocumentRow[]};
type ServiceArea={id:string;island_name?:string|null;location_name?:string|null;location_type?:string|null;is_active:boolean};
type RequestRow={ticket_number:string;service_name:string;service_location_text:string;status:string;created_at:string};
type HistoryRow={id:string;event_type:string;created_at:string};
type Summary={serviceAreas:ServiceArea[];requests:RequestRow[];history:HistoryRow[]};
type ProviderStatus='APPROVED'|'REJECTED'|'SUSPENDED'|'SUBMITTED';

const dayNames=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const pretty=(value?:string|null)=>value?value.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase()):'—';
const when=(value?:string|null)=>value?new Date(value).toLocaleString([], {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

function ActionIcon({kind}:{kind:'approve'|'reject'|'suspend'|'document'}){
  if(kind==='reject')return <span aria-hidden="true">✕</span>;
  if(kind==='suspend')return <span aria-hidden="true">Ⅱ</span>;
  if(kind==='document')return <span aria-hidden="true">▤</span>;
  return <span aria-hidden="true">✓</span>;
}

export default function AdminProviderDetailPage(){
  const params=useParams<{userId:string}>();
  const userId=params.userId;
  const[detail,setDetail]=useState<Detail|null>(null);
  const[summary,setSummary]=useState<Summary>({serviceAreas:[],requests:[],history:[]});
  const[message,setMessage]=useState('Loading provider…');
  const[busyStatus,setBusyStatus]=useState<ProviderStatus|null>(null);

  useEffect(()=>{if(userId)void load();},[userId]);

  async function jwt(){
    const{data}=await supabase.auth.getSession();
    if(!data.session){window.location.href='/login';throw new Error('Sign in required');}
    return data.session.access_token;
  }

  async function call(url:string,body:Record<string,unknown>){
    const token=await jwt();
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body),signal:controller.signal});
      const text=await response.text();
      let payload:any={};
      try{payload=text?JSON.parse(text):{};}catch{payload={error:text||'Admin request failed'};}
      if(!response.ok)throw new Error(payload?.error||`Admin request failed (${response.status})`);
      return payload;
    }finally{window.clearTimeout(timeout);}
  }

  async function refreshDetail(){
    const[d,usersPayload]=await Promise.all([call(ADMIN_URL,{action:'provider_detail',providerUserId:userId}),call(ADMIN_USERS_URL,{})]);
    const userRow=(usersPayload?.users||[]).find((u:any)=>u.user_id===userId);
    setDetail({...d,account:{...d.account,phone_number:userRow?.phone_number||d.account?.phone_number||null}} as Detail);
  }

  async function load(){
    try{
      await refreshDetail();
      setMessage('Provider record loaded.');
      try{
        const s=await call(SUMMARY_URL,{providerUserId:userId});
        setSummary({serviceAreas:s?.serviceAreas||[],requests:s?.requests||[],history:s?.history||[]});
      }catch{setSummary({serviceAreas:[],requests:[],history:[]});}
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load provider.');}
  }

  async function setStatus(status:ProviderStatus){
    if(busyStatus)return;
    setBusyStatus(status);
    setMessage(`${pretty(status)} action in progress…`);
    try{
      await call(ADMIN_URL,{action:'set_provider_onboarding_status',providerUserId:userId,status});
      await refreshDetail();
      setMessage(`Provider status changed to ${pretty(status)}.`);
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update provider status.');}
    finally{setBusyStatus(null);}
  }

  if(!detail)return <main className="shell adminProviderDetail"><AdminNav/><section className="providerLoading">{message}</section></main>;

  const p=detail.onboarding;
  const status=p?.onboarding_status||(detail.account.provider_approved?'APPROVED':'SUBMITTED');
  const activeCategories=detail.categories.filter(c=>c.is_active);
  const docs=detail.documents||[];
  const workingHours=[...detail.hours].sort((a,b)=>a.day_of_week-b.day_of_week);

  return <main className="shell adminProviderDetail">
    <AdminNav/>

    <header className="reviewHeading">
      <a href="/admin/providers" className="reviewBack" aria-label="Back to providers">←</a>
      <div><h1>Provider Review</h1><p>Review provider details and take action</p></div>
    </header>

    <section className="reviewCard providerSummaryCard">
      <div className="providerSummaryTop">
        <div className="providerAvatar" aria-hidden="true"><span>●</span></div>
        <div className="providerIdentity">
          <h2>{detail.account.phone_number?.trim()||'Contact number missing'}</h2>
          <p className="providerEmail">{detail.account.email||'No email provided'}</p>
          <div className="providerStatusLine"><span className="statusPill">{pretty(status)}</span><span>{when(p?.submitted_at)}</span></div>
        </div>
      </div>

      <div className="quickFacts">
        <div><span>Provider Type</span><strong>{pretty(p?.provider_type)}</strong></div>
        <div><span>Availability</span><strong>{pretty(p?.availability_status)}</strong></div>
        <div><span>Accepting Requests</span><strong>{p?.accepting_leads?'Yes':'No'}</strong></div>
      </div>

      <p className="providerMessage" role="status" aria-live="polite">✓ {message}</p>

      <div className="providerActions">
        <button className="action approve" disabled={!!busyStatus||status==='APPROVED'} onClick={()=>void setStatus('APPROVED')}><ActionIcon kind="approve"/><span><strong>{busyStatus==='APPROVED'?'Approving…':status==='APPROVED'?'Approved':'Approve Provider'}</strong><small>Activate full access</small></span></button>
        <button className="action suspend" disabled={!!busyStatus||status==='SUSPENDED'} onClick={()=>void setStatus('SUSPENDED')}><ActionIcon kind="suspend"/><span><strong>{busyStatus==='SUSPENDED'?'Suspending…':'Suspend Provider'}</strong><small>Temporarily restrict access</small></span></button>
        <button className="action reject" disabled={!!busyStatus||status==='REJECTED'} onClick={()=>void setStatus('REJECTED')}><ActionIcon kind="reject"/><span><strong>{busyStatus==='REJECTED'?'Rejecting…':'Reject Provider'}</strong><small>Decline application</small></span></button>
        <a className="action document" href={`/admin/providers/${userId}/documents`}><ActionIcon kind="document"/><span><strong>View Documents</strong><small>{docs.length} optional {docs.length===1?'document':'documents'}</small></span></a>
      </div>
    </section>

    <nav className="reviewTabs" aria-label="Provider review sections">
      <a href="#overview">Overview</a><a href="#services">Services</a><a href="#availability">Availability</a><a href="#history">History</a>
    </nav>

    <section id="overview" className="reviewCard detailCard">
      <div className="sectionTitle"><h2>Provider Information</h2></div>
      <div className="detailGrid">
        <div><span>Provider Type</span><strong>{pretty(p?.provider_type)}</strong></div>
        <div><span>Accepting Requests</span><strong>{p?.accepting_leads?'Yes':'No'}</strong></div>
        <div><span>Availability</span><strong>{pretty(p?.availability_status)}</strong></div>
        <div><span>Registered</span><strong>{when(p?.submitted_at)}</strong></div>
        <div><span>Approved</span><strong>{when(p?.approved_at)}</strong></div>
        <div><span>Business</span><strong>{p?.business_name||'—'}</strong></div>
      </div>
      {p?.description?<p className="providerDescription">{p.description}</p>:null}
    </section>

    <section id="services" className="reviewCard compactSection">
      <div className="sectionTitle"><h2>Managed Services <span>({activeCategories.length} Active)</span></h2></div>
      <div className="serviceChips">{activeCategories.slice(0,8).map(c=><span key={c.category_id}>{c.name}</span>)}{activeCategories.length>8?<span>+{activeCategories.length-8} more</span>:null}</div>
      {!activeCategories.length?<p className="emptyState">No active services configured.</p>:null}
    </section>

    <section className="reviewCard compactSection">
      <div className="sectionTitle"><h2>Service Locations</h2></div>
      <div className="serviceChips">{summary.serviceAreas.filter(a=>a.is_active).map(a=><span key={a.id}>{a.location_name||a.island_name||'Configured location'}</span>)}</div>
      {!summary.serviceAreas.some(a=>a.is_active)?<p className="emptyState">No active service locations configured.</p>:null}
    </section>

    <section id="availability" className="reviewCard compactSection">
      <div className="sectionTitle"><h2>Weekly Availability</h2></div>
      <div className="hoursList">{workingHours.map(h=><div className="hoursRow" key={h.day_of_week}><strong>{dayNames[h.day_of_week]||`Day ${h.day_of_week}`}</strong><span className={h.is_working?'available':'off'}>{h.is_working?'Available':'Off'}</span><small>{h.is_working?`${h.start_time||'—'} – ${h.end_time||'—'} · ${h.timezone_name}`:`Not available · ${h.timezone_name}`}</small></div>)}</div>
      {!workingHours.length?<p className="emptyState">No availability schedule configured.</p>:null}
    </section>

    <section id="history" className="historyGrid">
      <article className="reviewCard compactSection"><div className="sectionTitle"><div><span className="eyebrow">SERVICE HISTORY</span><h2>Recent Service Requests</h2></div><span className="countPill">{summary.requests.length} recent</span></div>{summary.requests.length?<div className="historyList">{summary.requests.slice(0,5).map(r=><div key={r.ticket_number}><strong>{r.service_name}</strong><span>{pretty(r.status)} · {when(r.created_at)}</span></div>)}</div>:<p className="emptyState">No service requests assigned to this provider.</p>}</article>
      <article className="reviewCard compactSection"><div className="sectionTitle"><div><span className="eyebrow">AUDIT HISTORY</span><h2>Recent Admin Activity</h2></div></div>{summary.history.length?<div className="historyList">{summary.history.slice(0,5).map(h=><div key={h.id}><strong>{pretty(h.event_type)}</strong><span>{when(h.created_at)}</span></div>)}</div>:<p className="emptyState">No recent provider audit activity.</p>}</article>
    </section>
  </main>;
}
