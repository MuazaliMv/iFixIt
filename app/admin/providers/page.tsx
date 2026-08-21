'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
type ProviderRow={user_id:string;email?:string|null;full_name?:string|null;provider_approved:boolean;created_at:string};

export default function AdminProvidersPage(){
 const[providers,setProviders]=useState<ProviderRow[]>([]);const[busyUser,setBusyUser]=useState('');const[message,setMessage]=useState('Loading providers…');
 useEffect(()=>{void load();},[]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function callAdmin(body:Record<string,unknown>){const t=await jwt();if(!t)return null;const response=await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const payload=await callAdmin({action:'dashboard'});if(!payload)return;setProviders(payload.providers||[]);setMessage('Provider list loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load providers.');}}
 async function setApproval(row:ProviderRow,approved:boolean){setBusyUser(row.user_id);try{await callAdmin({action:'approve_provider',providerUserId:row.user_id,approved});await load();setMessage(`${row.full_name||row.email||'Provider'} ${approved?'approved':'disabled'}.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to update provider.');}finally{setBusyUser('');}}
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Providers</p></div></header><AdminNav />
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROVIDER MANAGEMENT</p><h2>Provider Accounts</h2></div><span className="pill">{providers.filter(p=>!p.provider_approved).length} pending</span></div><p className="formMessage" role="status">{message}</p><div className="jobList">{providers.map(p=><article className="jobCard" key={p.user_id}><div className="jobTop"><div><strong>{p.full_name||'Unnamed provider'}</strong><div className="muted">{p.email||'No email'}</div></div><span className="pill">{p.provider_approved?'Approved':'Pending'}</span></div><div className="actions"><a className="secondary" href={`/admin/providers/${p.user_id}`}>View Details</a>{p.provider_approved?<button className="secondary" disabled={busyUser===p.user_id} onClick={()=>setApproval(p,false)}>Disable Provider</button>:<button className="primary" disabled={busyUser===p.user_id} onClick={()=>setApproval(p,true)}>Approve Provider</button>}</div></article>)}{!providers.length?<div className="emptyQueue">No provider accounts found.</div>:null}</div></section>
 </main>;
}
