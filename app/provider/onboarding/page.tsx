'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import './onboarding.css';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
type Category={id:string;code:string;name:string};
type Profile={provider_type:'INDIVIDUAL'|'BUSINESS';public_name:string;business_name?:string|null;description?:string|null;experience_years:number;service_area_text:string;availability_status:'AVAILABLE_NOW'|'AVAILABLE_TODAY'|'BY_APPOINTMENT'|'UNAVAILABLE';onboarding_status:'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'SUSPENDED'};
type Hour={dayOfWeek:number;isWorking:boolean;startTime:string;endTime:string};
const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const defaultHours:Hour[]=dayNames.map((_,i)=>({dayOfWeek:i+1,isWorking:i<6,startTime:'08:00',endTime:'17:00'}));

export default function ProviderOnboardingPage(){
 const[providerType,setProviderType]=useState<'INDIVIDUAL'|'BUSINESS'>('INDIVIDUAL');
 const[publicName,setPublicName]=useState('');
 const[businessName,setBusinessName]=useState('');
 const[description,setDescription]=useState('');
 const[experienceYears,setExperienceYears]=useState(0);
 const[serviceAreaText,setServiceAreaText]=useState('');
 const[availabilityStatus,setAvailabilityStatus]=useState<'AVAILABLE_NOW'|'AVAILABLE_TODAY'|'BY_APPOINTMENT'|'UNAVAILABLE'>('BY_APPOINTMENT');
 const[categories,setCategories]=useState<Category[]>([]);
 const[selected,setSelected]=useState<string[]>([]);
 const[hours,setHours]=useState<Hour[]>(defaultHours);
 const[status,setStatus]=useState<Profile['onboarding_status']>('DRAFT');
 const[message,setMessage]=useState('Loading provider profile…');
 const[busy,setBusy]=useState(false);
 const selectedCount=useMemo(()=>selected.length,[selected]);

 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const response=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Provider onboarding request failed');return payload;}
 async function load(){setBusy(true);try{const payload=await call({action:'get'});if(payload.authProfile?.role!=='PROVIDER'){setMessage('This account is not a Provider account. An Admin can change your role to Provider.');return;}setCategories(payload.categories||[]);setSelected(payload.selectedCategoryIds||[]);if(payload.profile){const p=payload.profile as Profile;setProviderType(p.provider_type);setPublicName(p.public_name||'');setBusinessName(p.business_name||'');setDescription(p.description||'');setExperienceYears(Number(p.experience_years||0));setServiceAreaText(p.service_area_text||'');setAvailabilityStatus(p.availability_status||'BY_APPOINTMENT');setStatus(p.onboarding_status||'DRAFT');}if(Array.isArray(payload.hours)&&payload.hours.length){setHours(dayNames.map((_,i)=>{const h=payload.hours.find((x:any)=>Number(x.day_of_week)===i+1);return h?{dayOfWeek:i+1,isWorking:Boolean(h.is_working),startTime:(h.start_time||'08:00').slice(0,5),endTime:(h.end_time||'17:00').slice(0,5)}:defaultHours[i];}));}setMessage(payload.authProfile?.provider_approved?'Provider account approved. Keep your profile current.':'Complete your profile and submit it for Admin approval.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load provider profile.');}finally{setBusy(false);}}
 function toggleCategory(id:string){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);}
 function updateHour(day:number,patch:Partial<Hour>){setHours(current=>current.map(h=>h.dayOfWeek===day?{...h,...patch}:h));}
 async function save(submit:boolean){if(publicName.trim().length<2)return setMessage('Enter your public provider name.');if(serviceAreaText.trim().length<2)return setMessage('Enter the island/city or service area you cover.');if(submit&&!selected.length)return setMessage('Select at least one service category before submitting.');setBusy(true);try{const payload=await call({action:submit?'submit':'save',providerType,publicName:publicName.trim(),businessName:businessName.trim(),description:description.trim(),experienceYears,serviceAreaText:serviceAreaText.trim(),availabilityStatus,categoryIds:selected,hours});setStatus(payload.onboardingStatus||status);setMessage(submit?'Provider profile submitted for Admin approval.':'Draft saved.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to save provider profile.');}finally{setBusy(false);}}
 async function signOut(){await supabase.auth.signOut();window.location.href='/login';}

 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Provider Onboarding</p></div><div className="actions"><a className="secondary" href="/provider">Job Operations</a><button className="secondary" onClick={signOut}>Sign Out</button></div></header>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROVIDER PROFILE</p><h2>Set up your service business</h2></div><span className="pill">{status}</span></div>{message?<p className="formMessage" role="status">{message}</p>:null}<p className="localNotice">This onboarding profile is tied to your authenticated account. Payment processing is not part of this MVP.</p></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ABOUT YOU</p><h2>Provider details</h2></div></div><div className="formGrid onboardingForm">
   <label>Provider type<select value={providerType} onChange={e=>setProviderType(e.target.value as 'INDIVIDUAL'|'BUSINESS')}><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></label>
   <label>Public provider name<input value={publicName} onChange={e=>setPublicName(e.target.value)} placeholder="Name customers will see"/></label>
   {providerType==='BUSINESS'?<label>Business name<input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Registered/trading name"/></label>:null}
   <label>Years of experience<input type="number" min="0" max="80" value={experienceYears} onChange={e=>setExperienceYears(Number(e.target.value||0))}/></label>
   <label className="full">Service area<input value={serviceAreaText} onChange={e=>setServiceAreaText(e.target.value)} placeholder="Example: Fuvahmulah City"/></label>
   <label>Current availability<select value={availabilityStatus} onChange={e=>setAvailabilityStatus(e.target.value as typeof availabilityStatus)}><option value="AVAILABLE_NOW">Available now</option><option value="AVAILABLE_TODAY">Available today</option><option value="BY_APPOINTMENT">By appointment</option><option value="UNAVAILABLE">Unavailable</option></select></label>
   <label className="full">About your services<textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell customers about your experience and the work you do"/></label>
  </div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">SERVICES</p><h2>What work do you provide?</h2></div><span className="pill">{selectedCount} selected</span></div><div className="categoryGrid">{categories.map(c=><button type="button" key={c.id} className={selected.includes(c.id)?'categoryChoice selected':'categoryChoice'} onClick={()=>toggleCategory(c.id)}>{c.name}</button>)}{!categories.length?<div className="emptyQueue">No service categories available.</div>:null}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">AVAILABILITY</p><h2>Weekly working hours</h2></div><span className="pill">Maldives time</span></div><div className="hoursList">{hours.map((h,i)=><div className="hoursRow" key={h.dayOfWeek}><label className="workingToggle"><input type="checkbox" checked={h.isWorking} onChange={e=>updateHour(h.dayOfWeek,{isWorking:e.target.checked})}/><span>{dayNames[i]}</span></label>{h.isWorking?<><input type="time" value={h.startTime} onChange={e=>updateHour(h.dayOfWeek,{startTime:e.target.value})}/><span className="muted">to</span><input type="time" value={h.endTime} onChange={e=>updateHour(h.dayOfWeek,{endTime:e.target.value})}/></>:<span className="muted">Not working</span>}</div>)}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">SUBMISSION</p><h2>Save or send for approval</h2></div></div><div className="actions"><button className="secondary" disabled={busy} onClick={()=>save(false)}>{busy?'Saving…':'Save Draft'}</button><button className="primary" disabled={busy} onClick={()=>save(true)}>{busy?'Submitting…':'Submit for Approval'}</button></div><p className="localNotice">After Admin approval, your provider account can access job operations. Exact island/service matching will be connected in the next matching-engine batch.</p></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Provider Onboarding</span></footer>
 </main>;
}
