'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import MobileNav from '../MobileNav';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;assigned_provider_label?:string|null;updated_at:string;created_at:string};

export default function MessagesPage(){
 const[requests,setRequests]=useState<RequestRow[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading conversations…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function load(){setBusy(true);try{const t=await token();if(!t)return;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'list'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load requests');setRequests(p.requests||[]);setMessage('Conversations are tied to individual service requests.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load conversations.');}finally{setBusy(false);}}
 const conversations=useMemo(()=>requests.filter(r=>r.status!=='NEW'&&r.assigned_provider_label),[requests]);
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Messages</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'Refresh'}</button></header>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">CUSTOMER MESSAGES</p><h2>Your request conversations</h2></div><span className="pill">{conversations.length}</span></div><p className="muted">{message}</p><div className="jobList">{conversations.map(r=><article className="jobCard" key={r.id}><div className="jobTop"><div><strong>{r.assigned_provider_label}</strong><span className="muted">{r.service_name}</span></div><span className="pill">{r.status}</span></div><div className="jobMeta"><span>{r.ticket_number}</span><span>{r.service_location_text}</span></div><div className="actions"><a className="primary" href={`/requests/${encodeURIComponent(r.ticket_number)}#messages`}>Open Conversation</a><a className="secondary" href={`/requests/${encodeURIComponent(r.ticket_number)}`}>View Request</a></div></article>)}{!conversations.length?<div className="emptyQueue"><strong>No active conversations yet.</strong><p className="muted">Messaging becomes available after a provider is selected and the request is accepted.</p></div>:null}</div></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Request-based messaging</span></footer><MobileNav role="customer"/>
 </main>;
}
