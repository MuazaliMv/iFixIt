'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const REQUESTS_API='/api/legacy-edge?service=customer-requests';
const MESSAGE_API='/api/legacy-edge?service=request-messages';
type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;assigned_provider_label?:string|null;assigned_provider_user_id?:string|null;updated_at:string;created_at:string};
type MessageRow={id:string;sender_role:string;sender_mode?:string|null;sender_label?:string|null;message_text:string;created_at:string;delivered_at?:string|null;read_at?:string|null};
type Conversation={request:RequestRow;latest:MessageRow|null;unread:number};
type Filter='ALL'|'UNREAD'|'ACTIVE';

function timeLabel(value?:string){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const now=new Date();return d.toDateString()===now.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});}
async function post(url:string,body:Record<string,unknown>){const r=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const p=await r.json().catch(()=>({}));if(r.status===401){const next=`${window.location.pathname}${window.location.search}`;window.location.replace(`/login?next=${encodeURIComponent(next)}`);throw new Error('Authentication required.');}if(!r.ok)throw new Error(p?.error||'Request failed');return p;}

export default function MessagesPage(){
 const[conversations,setConversations]=useState<Conversation[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading conversations…');const[filter,setFilter]=useState<Filter>('ALL');
 useEffect(()=>{void load(false);const channel=supabase.channel('customer-message-inbox').on('postgres_changes',{event:'*',schema:'public',table:'request_messages'},()=>void load(true)).subscribe();return()=>{void supabase.removeChannel(channel);};},[]);
 async function load(silent=false){
  if(!silent)setBusy(true);
  try{
   const p=await post(REQUESTS_API,{action:'list'});
   const rows:RequestRow[]=(p.requests||[]).filter((x:RequestRow)=>Boolean(x.assigned_provider_label||x.assigned_provider_user_id));const next:Conversation[]=[];
   for(const request of rows){let messages:MessageRow[]=[];let unread=0;try{const mp=await post(MESSAGE_API,{action:'list',ticketNumber:request.ticket_number,mode:'CUSTOMER'});messages=mp.messages||[];unread=Number(mp.unreadCount||0);}catch{}
    const latest=messages.length?messages[messages.length-1]:null;next.push({request,latest,unread});
   }
   next.sort((a,b)=>new Date(b.latest?.created_at||b.request.updated_at).getTime()-new Date(a.latest?.created_at||a.request.updated_at).getTime());setConversations(next);if(!silent)setMessage(next.length?'Your conversations are connected live.':'No conversations yet.');
  }catch(e){if(!silent&&!(e instanceof Error&&e.message==='Authentication required.'))setMessage(e instanceof Error?e.message:'Unable to load conversations.');}finally{if(!silent)setBusy(false);}
 }
 const unreadTotal=conversations.reduce((sum,c)=>sum+c.unread,0);
 const visible=useMemo(()=>conversations.filter(c=>filter==='ALL'||(filter==='UNREAD'?c.unread>0:c.request.status!=='COMPLETED')),[conversations,filter]);
 return <main className="shell accountApp">
  <header className="accountHeader"><div className="accountTitle"><a className="accountBack" href="/">‹</a><div><h1>Messages</h1><p>Live chat with providers assigned to your requests</p></div></div><button className="accountIconButton" type="button" onClick={()=>void load(false)} disabled={busy} aria-label="Refresh messages">↻</button></header>
  <section className="messagesHero"><div><span className="messagesHeroIcon">✉</span><div><strong>{unreadTotal?`${unreadTotal} unread message${unreadTotal===1?'':'s'}`:'You’re all caught up'}</strong><p>{conversations.length} conversation{conversations.length===1?'':'s'} linked to your service requests</p></div></div><span className="modeBadge customer">Live</span></section>
  <nav className="messageFilters" aria-label="Message filters"><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>All <span>{conversations.length}</span></button><button className={filter==='UNREAD'?'active':''} onClick={()=>setFilter('UNREAD')}>Unread <span>{unreadTotal}</span></button><button className={filter==='ACTIVE'?'active':''} onClick={()=>setFilter('ACTIVE')}>Active <span>{conversations.filter(c=>c.request.status!=='COMPLETED').length}</span></button></nav>
  <section className="conversationList" aria-label="Conversations">{visible.map(({request,latest,unread})=><button key={request.id} type="button" className={`conversationCard${unread?' unread':''}`} onClick={()=>{window.location.href=`/messages/${encodeURIComponent(request.ticket_number)}`;}}><div className="conversationAvatar">{(request.assigned_provider_label||'P').slice(0,1).toUpperCase()}</div><div className="conversationBody"><div className="conversationNameRow"><span className="conversationName">{request.assigned_provider_label||'Provider'}</span>{request.status==='COMPLETED'?<span className="conversationStatus completed">Completed</span>:<span className="conversationStatus active">Active</span>}</div><div className="conversationService">{request.service_name} · {request.ticket_number}</div><div className="conversationPreview">{latest?.message_text||'Open the conversation to message your provider.'}</div></div><div className="conversationMeta"><span className="conversationTime">{timeLabel(latest?.created_at||request.updated_at)}</span>{unread>0?<span className="unreadDot">{unread>9?'9+':unread}</span>:null}</div></button>)}{!visible.length?<div className="conversationEmpty"><div className="emptyIcon">✉</div><strong>{filter==='UNREAD'?'No unread messages':'No conversations in this section'}</strong><p className="muted">{filter==='UNREAD'?'You have read all current provider messages.':'A conversation appears only after a provider accepts your request.'}</p><a className="primary" href="/requests">View My Requests</a></div>:null}</section>
  <p className="muted accountStatusText" role="status">{busy?'Refreshing conversations…':message}</p>
 </main>;
}
