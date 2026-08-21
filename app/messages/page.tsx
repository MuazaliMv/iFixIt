'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const REQUESTS_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
const MESSAGE_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-messages';
type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;assigned_provider_label?:string|null;updated_at:string;created_at:string};
type MessageRow={id:string;sender_role:string;sender_label?:string|null;message_text:string;created_at:string};
type Conversation={request:RequestRow;latest:MessageRow|null;unread:number};

function timeLabel(value?:string){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const now=new Date();return d.toDateString()===now.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});}
function lastReadKey(ticket:string){return`fixit:messages:last-read:${ticket}`;}

export default function MessagesPage(){
 const[conversations,setConversations]=useState<Conversation[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading conversations…');
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function load(){
  setBusy(true);
  try{
   const t=await token();if(!t)return;
   const r=await fetch(REQUESTS_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'list'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load requests');
   const rows:RequestRow[]=(p.requests||[]).filter((x:RequestRow)=>x.status!=='NEW'&&Boolean(x.assigned_provider_label));const next:Conversation[]=[];
   for(const request of rows){let messages:MessageRow[]=[];try{const mr=await fetch(MESSAGE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'list',ticketNumber:request.ticket_number})});const mp=await mr.json();if(mr.ok)messages=mp.messages||[];}catch{}
    const latest=messages.length?messages[messages.length-1]:null;const readAt=Number(window.localStorage.getItem(lastReadKey(request.ticket_number))||0);const unread=messages.filter(m=>m.sender_role!=='CUSTOMER'&&new Date(m.created_at).getTime()>readAt).length;next.push({request,latest,unread});
   }
   next.sort((a,b)=>new Date(b.latest?.created_at||b.request.updated_at).getTime()-new Date(a.latest?.created_at||a.request.updated_at).getTime());setConversations(next);setMessage(next.length?'Your conversations are up to date.':'No conversations yet.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load conversations.');}finally{setBusy(false);}
 }
 const unreadTotal=conversations.reduce((sum,c)=>sum+c.unread,0);
 function openConversation(ticket:string){window.localStorage.setItem(lastReadKey(ticket),String(Date.now()));window.location.href=`/requests/${encodeURIComponent(ticket)}#messages`;}
 return <main className="shell accountApp">
  <header className="accountHeader"><div className="accountTitle"><a className="accountBack" href="/">‹</a><div><h1>Messages</h1><p>Chat with your selected providers</p></div></div><button className="accountIconButton" type="button" onClick={()=>void load()} disabled={busy} aria-label="Refresh messages">↻</button></header>
  <div className="messagesSummary"><div><span className="muted">Conversations</span><br/><strong>{conversations.length}</strong></div><div style={{textAlign:'right'}}><span className="muted">Unread</span><br/><strong>{unreadTotal}</strong></div></div>
  <section className="conversationList" aria-label="Conversations">{conversations.map(({request,latest,unread})=><button key={request.id} type="button" className="conversationCard" onClick={()=>openConversation(request.ticket_number)} style={{textAlign:'left',width:'100%',cursor:'pointer'}}><div className="conversationAvatar">{(request.assigned_provider_label||'P').slice(0,1).toUpperCase()}</div><div className="conversationBody"><div className="conversationNameRow"><span className="conversationName">{request.assigned_provider_label}</span>{request.status==='COMPLETED'?<span className="conversationStatus">Completed</span>:null}</div><div className="conversationService">{request.service_name} · {request.ticket_number}</div><div className="conversationPreview">{latest?.message_text||'Open the conversation to message your provider.'}</div></div><div className="conversationMeta"><span className="conversationTime">{timeLabel(latest?.created_at||request.updated_at)}</span>{unread>0?<span className="unreadDot">{unread>9?'9+':unread}</span>:<span className="conversationStatus">{request.status}</span>}</div></button>)}{!conversations.length?<div className="conversationEmpty"><div className="emptyIcon">✉</div><strong>No active conversations</strong><p className="muted">A conversation appears after a provider is selected for your request.</p><a className="primary" href="/requests">View My Requests</a></div>:null}</section>
  <p className="muted" style={{textAlign:'center',fontSize:12}}>{message}</p>
 </main>;
}
