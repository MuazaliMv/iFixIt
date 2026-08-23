'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import AdminNav from '../../AdminNav';
import './provider-detail.css';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const SUMMARY_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-admin-summary';
type Account={user_id:string;email?:string|null;full_name?:string|null;provider_approved:boolean;created_at:string;updated_at:string};
type Onboarding={provider_type:string;public_name:string;business_name?:string|null;description?:string|null;experience_years:number;service_area_text:string;availability_status:string;accepting_leads:boolean;onboarding_status:string;submitted_at?:string|null;approved_at?:string|null;created_at:string;updated_at:string};
type Category={category_id:string;name:string;is_active:boolean};
type Hours={day_of_week:number;is_working:boolean;start_time?:string|null;end_time?:string|null;timezone_name:string};
type DocumentRow={id:string;document_type:string;document_label?:string|null;review_status:string;review_note?:string|null;reviewed_at?:string|null;submitted_at:string;signed_url?:string|null};
type Detail={account:Account;onboarding:Onboarding|null;categories:Category[];hours:Hours[];documents:DocumentRow[]};
type ServiceArea={id:string;island_name?:string|null;location_name?:string|null;location_type?:string|null;is_active:boolean};
type Subscription={id:string;status:string;trial_started_at?:string|null;current_period_started_at?:string|null;current_period_ends_at?:string|null;monthly_price_mvr?:number|null;last_payment_at?:string|null};
type RequestRow={ticket_number:string;service_name:string;service_location_text:string;status:string;created_at:string;updated_at:string};
type HistoryRow={id:string;event_type:string;severity:string;entity_type?:string|null;created_at:string;metadata?:Record<string,unknown>|null};
type Summary={serviceAreas:ServiceArea[];subscription:Subscription|null;requests:RequestRow[];history:HistoryRow[]};
const dayNames=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const pretty=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());
const when=(value?:string|null)=>value?new Date(value).toLocaleString():'—';

function Fact({label,value}:{label:string;value:string|number}){return <div className="providerFact"><span>{label}</span><strong>{value}</strong></div>}

export default function AdminProviderDetailPage(){
 const params=useParams<{userId:string}>(); const userId=params.userId;
 const[detail,setDetail]=useState<Detail|null>(null); const[summary,setSummary]=useState<Summary|null>(null); const[message,setMessage]=useState('Loading provider…'); const[busy,setBusy]=useState(false);
 useEffect(()=>{if(userId)void load();},[userId]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(url:string,body:Record<string,unknown>){const t=await jwt();if(!t)return null;const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const[d,s]=await Promise.all([call(ADMIN_URL,{action:'provider_detail',providerUserId:userId}),call(SUMMARY_URL,{providerUserId:userId})]);if(!d)return;setDetail(d as Detail);setSummary((s||{serviceAreas:[],subscription:null,requests:[],history:[]}) as Summary);setMessage('Provider record loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load provider.');}}
 async function setStatus(status:'APPROVED'|'REJECTED'|'SUSPENDED'|'SUBMITTED'){setBusy(true);try{await call(ADMIN_URL,{action:'set_provider_onboarding_status',providerUserId:userId,status});await load();setMessage(`Provider status changed to ${pretty(status)}.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to update provider status.');}finally{setBusy(false);}}
 if(!detail)return <main className="shell adminProviderDetail"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Providers</p></div></header><AdminNav/><section className="providerSection"><p className="formMessage">{message}</p></section></main>;
 const p=detail.onboarding; const subscription=summary?.subscription; const activeAreas=summary?.serviceAreas.filter(a=>a.is_active)||[]; const docs=detail.documents||[]; const status=p?.onboarding_status||(detail.account.provider_approved?'APPROVED':'PENDING');
 return <main className="shell adminProviderDetail">
  <header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Providers</p></div></header>
  <AdminNav/>

  <section className="providerHero">
   <div className="providerHeroHead"><div className="providerIdentity"><p className="eyebrow">PROVIDER RECORD</p><h1>{p?.public_name||detail.account.full_name||'Unnamed provider'}</h1><p className="muted">{detail.account.email||'No email'}</p></div><div className="providerBadges"><span className="pill">{pretty(status)}</span>{subscription?<span className="pill">Subscription: {pretty(subscription.status)}</span>:null}</div></div>
   <p className="providerMessage" role="status">{message}</p>
   <div className="providerActions"><button className="primary" disabled={busy||status==='APPROVED'} onClick={()=>setStatus('APPROVED')}>Approve</button><button className="secondary" disabled={busy||status==='SUBMITTED'} onClick={()=>setStatus('SUBMITTED')}>Mark Submitted</button><button className="secondary rejectAction" disabled={busy||status==='REJECTED'} onClick={()=>setStatus('REJECTED')}>Reject</button><button className="secondary suspendAction" disabled={busy||status==='SUSPENDED'} onClick={()=>setStatus('SUSPENDED')}>Suspend</button></div>
  </section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">PROFILE</p><h2>Provider Information</h2></div></div>{p?<><div className="providerFacts"><Fact label="Provider type" value={pretty(p.provider_type)}/><Fact label="Business" value={p.business_name||'—'}/><Fact label="Experience" value={`${p.experience_years} years`}/><Fact label="Availability" value={pretty(p.availability_status)}/><Fact label="Accepting requests" value={p.accepting_leads?'Yes':'No'}/><Fact label="Submitted" value={when(p.submitted_at)}/><Fact label="Approved" value={when(p.approved_at)}/></div>{p.description?<p className="providerDescription">{p.description}</p>:null}</>:<div className="emptyQueue">This provider has not completed onboarding yet.</div>}</section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">SERVICES</p><h2>Managed Services</h2></div><span className="pill sectionCount">{detail.categories.filter(c=>c.is_active).length} active</span></div><div className="jobList">{detail.categories.map(c=><article className="jobCard" key={c.category_id}><div className="jobTop"><strong>{c.name}</strong><span className="pill">{c.is_active?'Active':'Inactive'}</span></div></article>)}{!detail.categories.length?<div className="emptyQueue">No services configured.</div>:null}</div></section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">SERVICE LOCATIONS</p><h2>Managed Service Locations</h2><p className="muted">Locations where this provider can receive matching service requests.</p></div><span className="pill sectionCount">{activeAreas.length} active</span></div><div className="jobList">{summary?.serviceAreas.map(a=><article className="jobCard" key={a.id}><div className="jobTop"><div><strong>{a.location_name||a.island_name||'Configured location'}</strong>{a.location_name&&a.island_name?<div className="muted">{a.island_name}{a.location_type?` • ${pretty(a.location_type)}`:''}</div>:null}</div><span className="pill">{a.is_active?'Active':'Inactive'}</span></div></article>)}{!summary?.serviceAreas.length?<div className="emptyQueue">No managed service locations configured.</div>:null}</div></section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">SUBSCRIPTION</p><h2>Provider Subscription</h2></div>{subscription?<span className="pill sectionCount">{pretty(subscription.status)}</span>:null}</div>{subscription?<div className="jobMeta"><span><b>Monthly price</b>MVR {Number(subscription.monthly_price_mvr||0).toLocaleString()}</span><span><b>Current period</b>{when(subscription.current_period_started_at)}</span><span><b>Period ends</b>{when(subscription.current_period_ends_at)}</span><span><b>Last payment</b>{when(subscription.last_payment_at)}</span><span><b>Trial started</b>{when(subscription.trial_started_at)}</span></div>:<div className="emptyQueue">No provider subscription record found.</div>}</section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">DOCUMENTS</p><h2>Verification Documents</h2></div><div className="documentActions"><span className="pill">{docs.length} documents</span>{docs.length?<a className="secondary" href={`/admin/providers/${userId}/documents`}>Review Documents</a>:null}</div></div><div className="jobList">{docs.map(d=><article className="jobCard" key={d.id}><div className="jobTop"><div><strong>{d.document_label||pretty(d.document_type)}</strong><div className="muted">Submitted {when(d.submitted_at)}</div></div><span className="pill">{pretty(d.review_status)}</span></div>{d.review_note?<p className="jobDescription">{d.review_note}</p>:null}{d.signed_url?<div className="actions"><a className="secondary" href={d.signed_url} target="_blank" rel="noreferrer">View Document</a></div>:null}</article>)}{!docs.length?<div className="emptyQueue">No verification documents submitted.</div>:null}</div></section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">AVAILABILITY</p><h2>Weekly Availability</h2></div></div><div className="jobList">{detail.hours.map(h=><article className="jobCard" key={h.day_of_week}><div className="jobTop"><strong>{dayNames[h.day_of_week]}</strong><span className="pill">{h.is_working?'Available':'Off'}</span></div><div className="muted">{h.is_working?`${h.start_time||'—'} – ${h.end_time||'—'}`:'Not available'} • {h.timezone_name}</div></article>)}{!detail.hours.length?<div className="emptyQueue">No weekly availability configured.</div>:null}</div></section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">SERVICE HISTORY</p><h2>Recent Service Requests</h2></div><span className="pill sectionCount">{summary?.requests.length||0} recent</span></div><div className="jobList">{summary?.requests.map(r=><article className="jobCard" key={r.ticket_number}><div className="jobTop"><div><strong className="ticket">{r.ticket_number}</strong><div className="muted">{r.service_name} • {r.service_location_text}</div></div><span className="pill">{pretty(r.status)}</span></div><div className="muted">Created {when(r.created_at)}</div></article>)}{!summary?.requests.length?<div className="emptyQueue">No service requests assigned to this provider.</div>:null}</div></section>

  <section className="providerSection"><div className="providerSectionHeader"><div><p className="eyebrow">AUDIT HISTORY</p><h2>Recent Admin Activity</h2></div></div><div className="jobList">{summary?.history.map(h=><article className="jobCard" key={h.id}><div className="jobTop"><strong>{pretty(h.event_type)}</strong><span className="pill">{pretty(h.severity)}</span></div><div className="muted">{when(h.created_at)}</div></article>)}{!summary?.history.length?<div className="emptyQueue">No recent provider audit activity.</div>:null}</div></section>
 </main>;
}
