'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import AdminNav from '../../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
type Account={user_id:string;email?:string|null;full_name?:string|null;provider_approved:boolean;created_at:string;updated_at:string};
type Onboarding={provider_type:string;public_name:string;business_name?:string|null;description?:string|null;experience_years:number;service_area_text:string;availability_status:string;accepting_leads:boolean;onboarding_status:string;submitted_at?:string|null;approved_at?:string|null;created_at:string;updated_at:string};
type Category={category_id:string;name:string;is_active:boolean};
type Hours={day_of_week:number;is_working:boolean;start_time?:string|null;end_time?:string|null;timezone_name:string};
type Detail={account:Account;onboarding:Onboarding|null;categories:Category[];hours:Hours[]};
const dayNames=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function AdminProviderDetailPage(){
 const params=useParams<{userId:string}>(); const userId=params.userId;
 const[detail,setDetail]=useState<Detail|null>(null); const[message,setMessage]=useState('Loading provider…'); const[busy,setBusy]=useState(false);
 useEffect(()=>{if(userId)void load();},[userId]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function callAdmin(body:Record<string,unknown>){const t=await jwt();if(!t)return null;const response=await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const payload=await callAdmin({action:'provider_detail',providerUserId:userId});if(!payload)return;setDetail(payload as Detail);setMessage('Provider details loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load provider.');}}
 async function setStatus(status:'APPROVED'|'REJECTED'|'SUSPENDED'|'SUBMITTED'){setBusy(true);try{await callAdmin({action:'set_provider_onboarding_status',providerUserId:userId,status});await load();setMessage(`Provider status changed to ${status}.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to update provider status.');}finally{setBusy(false);}}
 if(!detail)return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Provider Details</p></div></header><AdminNav/><section className="panel"><p className="formMessage">{message}</p></section></main>;
 const p=detail.onboarding;
 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Provider Details</p></div><a className="secondary" href="/admin/providers">Back to Providers</a></header>
  <AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROVIDER ACCOUNT</p><h2>{p?.public_name||detail.account.full_name||'Unnamed provider'}</h2><p className="muted">{detail.account.email||'No email'}</p></div><span className="pill">{p?.onboarding_status||(detail.account.provider_approved?'APPROVED':'PENDING')}</span></div><p className="formMessage" role="status">{message}</p><div className="actions"><button className="primary" disabled={busy} onClick={()=>setStatus('APPROVED')}>Approve</button><button className="secondary" disabled={busy} onClick={()=>setStatus('SUBMITTED')}>Mark Submitted</button><button className="secondary" disabled={busy} onClick={()=>setStatus('REJECTED')}>Reject</button><button className="secondary" disabled={busy} onClick={()=>setStatus('SUSPENDED')}>Suspend</button></div></section>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROFILE</p><h2>Provider Information</h2></div></div>{p?<div className="jobMeta"><span><b>Type:</b> {p.provider_type}</span><span><b>Business:</b> {p.business_name||'—'}</span><span><b>Experience:</b> {p.experience_years} years</span><span><b>Service area:</b> {p.service_area_text}</span><span><b>Availability:</b> {p.availability_status}</span><span><b>Accepting leads:</b> {p.accepting_leads?'Yes':'No'}</span><span><b>Submitted:</b> {p.submitted_at?new Date(p.submitted_at).toLocaleString():'—'}</span><span><b>Approved:</b> {p.approved_at?new Date(p.approved_at).toLocaleString():'—'}</span></div>:<div className="emptyQueue">This provider has not completed onboarding yet.</div>}{p?.description?<p className="jobDescription">{p.description}</p>:null}</section>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">SERVICES</p><h2>Service Categories</h2></div><span className="pill">{detail.categories.filter(c=>c.is_active).length} active</span></div><div className="jobList">{detail.categories.map(c=><article className="jobCard" key={c.category_id}><div className="jobTop"><strong>{c.name}</strong><span className="pill">{c.is_active?'Active':'Inactive'}</span></div></article>)}{!detail.categories.length?<div className="emptyQueue">No service categories configured.</div>:null}</div></section>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">AVAILABILITY</p><h2>Weekly Hours</h2></div></div><div className="jobList">{detail.hours.map(h=><article className="jobCard" key={h.day_of_week}><div className="jobTop"><strong>{dayNames[h.day_of_week]}</strong><span className="pill">{h.is_working?'Working':'Off'}</span></div><div className="muted">{h.is_working?`${h.start_time||'—'} – ${h.end_time||'—'}`:'Not available'} • {h.timezone_name}</div></article>)}{!detail.hours.length?<div className="emptyQueue">No weekly hours configured.</div>:null}</div></section>
 </main>;
}
