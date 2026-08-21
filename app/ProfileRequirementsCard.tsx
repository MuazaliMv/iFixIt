'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type RequiredField={field_key:string;display_name:string;section:string;validation_rules?:Record<string,unknown>;editable_by_user:boolean;is_completed:boolean;grace_period_days:number};
type Status={profile_completeness:number;missing_required_field_keys:string[];required_fields:RequiredField[];can_request:boolean;completion_required:boolean};

export default function ProfileRequirementsCard(){
 const[status,setStatus]=useState<Status|null>(null);const[busy,setBusy]=useState('');const[editing,setEditing]=useState('');const[value,setValue]=useState('');const[message,setMessage]=useState('');
 useEffect(()=>{void load();},[]);
 async function call(body:Record<string,unknown>){const{data,error}=await supabase.functions.invoke('profile-requirements',{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;}
 async function load(){try{const p=await call({action:'status'});setStatus(p);}catch{/* Not shown for unsupported roles or signed-out sessions. */}}
 async function save(field:RequiredField){setBusy(field.field_key);setMessage('');try{const p=await call({action:'update_field',fieldKey:field.field_key,value});setMessage(`${field.display_name} updated.`);setEditing('');setValue('');setStatus(s=>s?{...s,profile_completeness:p.profile_completeness,missing_required_field_keys:p.missing_required_field_keys}:s);await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to update field.');}finally{setBusy('');}}
 if(!status||!status.required_fields?.length)return null;
 const missing=status.required_fields.filter(f=>!f.is_completed);
 return <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROFILE REQUIREMENTS</p><h2>{missing.length?'Complete your profile':'Profile requirements complete'}</h2></div><span className="pill">{status.profile_completeness}%</span></div>
  {status.completion_required?<p className="localNotice">Complete the required profile fields before creating new service requests.</p>:missing.length?<p className="muted">These fields were configured by FixIt Admin. Existing account data is checked automatically.</p>:<p className="muted">All currently required fields are complete.</p>}
  {missing.length?<div className="jobList">{missing.map(f=><div className="jobCard" key={f.field_key}><div className="jobTop"><div><strong>{f.display_name}</strong><span className="muted">{f.section}{f.grace_period_days?` • ${f.grace_period_days}-day grace period`:''}</span></div><span className="pill">Required</span></div>{f.editable_by_user?(editing===f.field_key?<div className="providerAccessRow">{Array.isArray(f.validation_rules?.allowed)?<select value={value} onChange={e=>setValue(e.target.value)}><option value="">Select value</option>{(f.validation_rules?.allowed as string[]).map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>:<input type={f.field_key.includes('experience_years')?'number':'text'} value={value} onChange={e=>setValue(e.target.value)} placeholder={`Enter ${f.display_name.toLowerCase()}`}/>}<button className="primary" disabled={busy===f.field_key||!value} onClick={()=>void save(f)}>{busy===f.field_key?'Saving…':'Save'}</button><button className="secondary" onClick={()=>{setEditing('');setValue('');}}>Cancel</button></div>:<button className="secondary" onClick={()=>{setEditing(f.field_key);setValue('');}}>Add {f.display_name}</button>):<p className="muted">This field is managed by your sign-in account.</p>}</div>)}</div>:null}
  {message?<p className="formMessage" role="status">{message}</p>:null}
 </section>;
}
