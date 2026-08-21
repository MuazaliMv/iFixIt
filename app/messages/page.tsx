'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const REQUESTS_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
const MESSAGE_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-messages';
type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;assigned_provider_label?:string|null;updated_at:string;created_at:string};
type MessageRow={id:string;sender_role:string;sender_label?:string|null;message_text:string;created_at:string};
type Conversation={request:RequestRow;latest:MessageRow|null;unread:number};
type Filter='ALL'|'UNREAD'|'ACTIVE';

function timeLabel(value?:string){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const now=new Date();return d.toDateString()===now.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});}

export default function MessagesPage(){
 const[conversations,setConversations]=useState<Conversation[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading conversations…');const[filter,setFilter]=useState<Filter>('ALL');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function load(){
  setBusy(true);
  try{
   const t=await token();if(!t)return;
   const r=await fetch(REQUESTS_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'list'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load requests');
   const rows:RequestRow[]=(p.requests||[]).filter((x:RequestRow)=>x.status!=='NEW'&&Boolean(x.assigned_provider_label));const next:Conversation[]=[];
   for(const request of rows){let messages:MessageRow[]=[];let unread=0;try{const mr=await fetch(MESSAGE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'list',ticketNumber:request.ticket_number})});const mp=await mr.json();if(mr.ok){messages=mp.messages||[];unread=Number(mp.unreadCount||0);}}catch{}
    const latest=messages.length?messages[messages.length-1]:null;next.push({request,latest,unread});
   }
   next.sort((a,b)=>new Date(b.latest?.created_at||b.request.updated_at).getTime()-new Date(a.latest?.created_at||a.request.updated_at).getTime());setConversations(next);setMessage(next.length?'Your conversations are up to date.':'No conversations yet.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load conversations.');}finally{setBusy(false);}
 }
 const unreadTotal=conversations.reduce((sum,c)=>sum+c.unread,0);
 const visible=useMemo(()=>conversations.filter(c=>filter==='ALL'||(filter==='UNREAD'?c.unread>0:c.request.status!=='COMPLETED')),[conversations,filter]);
 async function openConversation(ticket:string){try{const t=await token();if(t)await fetch(MESSAGE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'mark_read',ticketNumber:ticket})});}catch{}window.location.href=`/requests/${encodeURIComponent(ticket)}#messages`;}
 return <main className="shell accountApp">
  <header className="accountHeader"><div className="accountTitle"><a className="accountBack" href="/">‹</a><div><h1>Messages</h1><p>Chat with providers assigned to your requests</p></div></div><button className="accountIconButton" type="button" onClick={()=>void load()} disabled={busy} aria-label="Refresh messages">↻</button></header>

  <section className="messagesHero"><div><span className="messagesHeroIcon">✉</span><div><strong>{unreadTotal?`${unreadTotal} unread message${unreadTotal===1?'':'s'}`:'You’re all caught up'}</strong><p>{conversations.length} conversation{conversations.length===1?'':'s'} linked to your service requests</p></div></div><a href="/requests" className="secondary">My Requests</a></section>

  <nav className="messageFilters" aria-label="Message filters"><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>All <span>{conversations.length}</span></button><button className={filter==='UNREAD'?'active':''} onClick={()=>setFilter('UNREAD')}>Unread <span>{unreadTotal}</span></button><button className={filter==='ACTIVE'?'active':''} onClick={()=>setFilter('ACTIVE')}>Active <span>{conversations.filter(c=>c.request.status!=='COMPLETED').length}</span></button></nav>

  <section className="conversationList" aria-label="Conversations">{visible.map(({request,latest,unread})=><button key={request.id} type="button" className={`conversationCard${unread?' unread':''}`} onClick={()=>void openConversation(request.ticket_number)}><div className="conversationAvatar">{(request.assigned_provider_label||'P').slice(0,1).toUpperCase()}</div><div className="conversationBody"><div className="conversationNameRow"><span className="conversationName">{request.assigned_provider_label}</span>{request.status==='COMPLETED'?<span className="conversationStatus completed">Completed</span>:<span className="conversationStatus active">Active</span>}</div><div className="conversationService">{request.service_name} · {request.ticket_number}</div><div className="conversationPreview">{latest?.message_text||'Open the conversation to message your provider.'}</div></div><div className="conversationMeta"><span className="conversationTime">{timeLabel(latest?.created_at||request.updated_at)}</span>{unread>0?<span className="unreadDot">{unread>9?'9+':unread}</span>:<span className="readMark">✓✓</span>}</div></button>)}{!visible.length?<div className="conversationEmpty"><div className="emptyIcon">✉</div><strong>{filter==='UNREAD'?'No unread messages':'No conversations in this section'}</strong><p className="muted">{filter==='UNREAD'?'You have read all current provider messages.':'A conversation appears after a provider is selected for your request.'}</p><a className="primary" href="/requests">View My Requests</a></div>:null}</section>
  <p className="muted accountStatusText" role="status">{busy?'Refreshing conversations…':message}</p>
 </main>;
}
