'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const DETAIL_API='/api/legacy-edge?service=customer-requests';
const MESSAGE_API='/api/legacy-edge?service=request-messages';
type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;assigned_provider_label?:string|null;assigned_provider_user_id?:string|null};
type Msg={id:string;sender_role:string;sender_mode?:string|null;sender_label?:string|null;message_text:string;created_at:string;delivered_at?:string|null;read_at?:string|null};
function receipt(m:Msg){if(m.read_at)return'Read';if(m.delivered_at)return'Delivered';return'Sent';}
async function post(url:string,body:Record<string,unknown>){const r=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const p=await r.json().catch(()=>({}));if(r.status===401){const next=`${window.location.pathname}${window.location.search}`;window.location.replace(`/login?next=${encodeURIComponent(next)}`);throw new Error('Authentication required.');}if(!r.ok)throw new Error(p?.error||'Request failed');return p;}

export default function CustomerConversationPage(){
 const params=useParams<{ticket:string}>();const ticket=decodeURIComponent(String(params.ticket||'')).toUpperCase();
 const[request,setRequest]=useState<RequestRow|null>(null);const[messages,setMessages]=useState<Msg[]>([]);const[text,setText]=useState('');const[busy,setBusy]=useState(true);const[notice,setNotice]=useState('Loading conversation…');
 useEffect(()=>{if(ticket)void load(false);},[ticket]);
 useEffect(()=>{if(!request?.id)return;const channel=supabase.channel(`customer-chat-${request.id}`).on('postgres_changes',{event:'*',schema:'public',table:'request_messages',filter:`request_id=eq.${request.id}`},()=>void markRead(true)).subscribe();return()=>{void supabase.removeChannel(channel);};},[request?.id]);
 async function callMessages(action='list',message=''){return post(MESSAGE_API,{action,ticketNumber:ticket,message,mode:'CUSTOMER'});}
 async function load(silent=false){if(!silent)setBusy(true);try{const p=await post(DETAIL_API,{action:'detail',ticketNumber:ticket});setRequest(p.request);if(!p.request?.assigned_provider_user_id&&!p.request?.assigned_provider_label){setMessages([]);setNotice('Messaging becomes available after a provider accepts your request.');return;}const mp=await callMessages('mark_read');setMessages(mp.messages||[]);if(!silent)setNotice('Live conversation connected.');}catch(e){if(!(e instanceof Error&&e.message==='Authentication required.'))setNotice(e instanceof Error?e.message:'Unable to load conversation.');}finally{if(!silent)setBusy(false);}}
 async function markRead(silent=false){try{const p=await callMessages('mark_read');setMessages(p.messages||[]);if(!silent)setNotice('Conversation up to date.');}catch(e){if(!silent&&!(e instanceof Error&&e.message==='Authentication required.'))setNotice(e instanceof Error?e.message:'Unable to refresh conversation.');}}
 async function send(e:FormEvent){e.preventDefault();const value=text.trim();if(!value)return;setBusy(true);try{const p=await callMessages('send',value);setMessages(p.messages||[]);setText('');setNotice('Message sent.');}catch(err){if(!(err instanceof Error&&err.message==='Authentication required.'))setNotice(err instanceof Error?err.message:'Unable to send message.');}finally{setBusy(false);}}
 const available=Boolean(request?.assigned_provider_user_id||request?.assigned_provider_label);
 return <main className="providerModePage"><div className="providerModeShell">
  <header className="providerModeTop"><div><a className="secondary" href="/messages">‹ Messages</a><h1>{request?.assigned_provider_label||'Provider conversation'}</h1><p>{request?`${request.service_name} · ${request.ticket_number}`:'Customer conversation'}</p></div><span className="modeBadge customer">Live</span></header>
  {!available?<section className="providerModeCard"><div className="providerEmptyState"><h3>Conversation not open yet</h3><p>Messaging starts automatically after a provider accepts your request. Until then, no provider can receive messages from this request.</p><a className="primary" href={`/requests/${encodeURIComponent(ticket)}`}>Back to request</a></div></section>:
  <section className="providerMessagesLayout"><aside className="providerInbox"><div className="providerSectionHead"><div><h2>Service request</h2><p>{request?.service_location_text}</p></div></div><div className="providerList"><a className="providerListItem providerListLink" href={`/requests/${encodeURIComponent(ticket)}`}><div><h3>{request?.service_name}</h3><p>{request?.status?.replaceAll('_',' ')}</p></div><strong>›</strong></a></div></aside>
   <section className="providerChat"><header><div><strong>{request?.assigned_provider_label||'Provider'}</strong><small>{ticket}</small></div><span className="modeBadge customer">Customer</span></header><div className="providerChatMessages">{messages.length?messages.map(m=>{const mine=(m.sender_mode||m.sender_role)==='CUSTOMER';return <div key={m.id} className={`providerBubble ${mine?'mine':''}`}><span>{m.message_text}</span><small>{new Date(m.created_at).toLocaleString()}{mine?` · ${receipt(m)}`:''}</small></div>}):<div className="providerEmptyState"><h3>Start the conversation</h3><p>Send your assigned provider a message about this service request.</p></div>}</div><form className="providerChatComposer" onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="Message provider…"/><button className="primary" disabled={busy||!text.trim()}>Send</button></form></section>
  </section>}
  <p className="muted" role="status">{busy?'Connecting…':notice}</p>
 </div></main>;
}
