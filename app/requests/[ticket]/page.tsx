'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import './marketplace.css';
import './completion-media.css';

const DETAIL_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
const MESSAGE_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-messages';
const MEDIA_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/completion-media';
const CANCEL_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-cancel-request';

type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;preferred_date:string;problem_description:string;urgency?:string|null;customer_notes?:string|null;status:string;assigned_provider_label?:string|null;created_at:string;updated_at:string;accepted_at?:string|null;processing_at?:string|null;completed_at?:string|null};
type MessageRow={id:string;sender_role:string;sender_label?:string|null;message_text:string;created_at:string};
type CompletionMedia={id:string;media_type:'BEFORE'|'AFTER';url?:string|null;created_at:string};

function when(v?:string|null){
 if(!v)return'Not set';
 const d=new Date(v);
 return Number.isNaN(d.getTime())?v:d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
}
function pretty(v?:string|null){return String(v||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}

function isNoProviderState(status:string){
 return ['NO_PROVIDER','NO_PROVIDER_AVAILABLE','EXPIRED','SEARCH_EXHAUSTED','FAILED'].includes(status);
}

function customerStatus(status:string){
 if(status==='COMPLETED')return'Completed';
 if(status==='PROCESSING'||status==='IN_PROGRESS')return'Work in progress';
 if(status==='ACCEPTED')return'Provider accepted';
 if(isNoProviderState(status))return'No provider available';
 return'Searching for provider';
}

function statusCopy(status:string,provider?:string|null){
 if(status==='COMPLETED')return{title:'Service completed',detail:'Your service request has been completed.'};
 if(status==='PROCESSING'||status==='IN_PROGRESS')return{title:'Service in progress',detail:provider?`${provider} is currently working on your request.`:'Your provider is currently working on your request.'};
 if(status==='ACCEPTED')return{title:'Provider accepted your request',detail:provider?`${provider} accepted your request. You do not need to confirm again.`:'A provider accepted your request. You do not need to confirm again.'};
 if(isNoProviderState(status))return{title:'No provider available right now',detail:'We could not find an available provider for this request. You can cancel this request or return to your requests list.'};
 return{title:'Finding a service provider',detail:'We are looking for an available provider. No action is needed from you — this page will update automatically.'};
}

export default function RequestDetailPage(){
 const params=useParams<{ticket:string}>();
 const ticket=decodeURIComponent(String(params.ticket||'')).toUpperCase();
 const[request,setRequest]=useState<RequestRow|null>(null);
 const[messages,setMessages]=useState<MessageRow[]>([]);
 const[media,setMedia]=useState<CompletionMedia[]>([]);
 const[busy,setBusy]=useState(false);
 const[notice,setNotice]=useState('Loading request…');
 const[text,setText]=useState('');

 useEffect(()=>{if(!ticket)return;void load();const id=window.setInterval(()=>void load(false),30000);return()=>window.clearInterval(id);},[ticket]);

 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function post(url:string,body:Record<string,unknown>){const t=await token();const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Request failed');return p;}
 async function load(showBusy=true){if(showBusy)setBusy(true);try{const t=await token();if(!t)return;const headers={'Content-Type':'application/json','Authorization':`Bearer ${t}`};const[dr,mr,cr]=await Promise.all([fetch(DETAIL_API,{method:'POST',headers,body:JSON.stringify({action:'detail',ticketNumber:ticket})}),fetch(MESSAGE_API,{method:'POST',headers,body:JSON.stringify({action:'list',ticketNumber:ticket})}),fetch(MEDIA_API,{method:'POST',headers,body:JSON.stringify({action:'list',ticketNumber:ticket})})]);const[d,m,c]=await Promise.all([dr.json(),mr.json(),cr.json()]);if(!dr.ok)throw new Error(d?.error||'Unable to load request');setRequest(d.request);if(mr.ok)setMessages(m.messages||[]);if(cr.ok)setMedia(c.media||[]);setNotice('');}catch(e){setNotice(e instanceof Error?e.message:'Unable to load request.');}finally{if(showBusy)setBusy(false);}}
 async function cancelRequest(){if(!window.confirm('Cancel this service request?'))return;setBusy(true);try{await post(CANCEL_API,{ticketNumber:ticket,reason:'Cancelled by customer'});window.location.replace('/requests');}catch(e){setNotice(e instanceof Error?e.message:'Unable to cancel request.');}finally{setBusy(false);}}
 async function send(){if(!text.trim())return;setBusy(true);try{const p=await post(MESSAGE_API,{action:'send',ticketNumber:ticket,message:text.trim()});setMessages(p.messages||[]);setText('');}catch(e){setNotice(e instanceof Error?e.message:'Unable to send message.');}finally{setBusy(false);}}

 const canCancel=['NEW','PENDING','SEARCHING','NO_PROVIDER','NO_PROVIDER_AVAILABLE','EXPIRED','SEARCH_EXHAUSTED','FAILED'].includes(request?.status||'');
 const progressSteps=['New','Accepted','Processing','Completed'];
 const status=request?.status||'NEW';
 const progressIndex=status==='COMPLETED'?3:status==='PROCESSING'||status==='IN_PROGRESS'?2:status==='ACCEPTED'?1:0;
 const current=statusCopy(status,request?.assigned_provider_label);
 const before=media.filter(x=>x.media_type==='BEFORE'&&x.url);
 const after=media.filter(x=>x.media_type==='AFTER'&&x.url);

 if(!request)return <main className="ifixPage"><div className="ifixLoading"><div className="ifixLogo"><span>Fix</span><b>It</b></div><p>{notice}</p></div></main>;

 return <main className="ifixPage"><div className="requestAppPanel">
  <div className="requestAppHeading">
   <div>
    <h1>{request.service_name}</h1>
    <p>{request.ticket_number} · {when(request.created_at)}</p>
    <span className="heroStatus">{customerStatus(status)}</span>
   </div>
  </div>

  {notice?<p className="statusNotice">{notice}</p>:null}

  <section className="activeHero">
   <div>
    <h1>{current.title}</h1>
    <p>{current.detail}</p>
    <div className="heroMeta"><span>Updated {when(request.updated_at)}</span></div>
   </div>
  </section>

  <section className="screenCard">
   <div className="sectionHeading"><div><h2>Request Progress</h2><p>Follow your request from submission to completion.</p></div></div>
   <div className="progressTimeline">
    {progressSteps.map((step,index)=><div className={`progressStep ${index<progressIndex?'done':index===progressIndex?'current':''}`} key={step}>
     <span>{index<progressIndex?'✓':index===progressIndex?'●':'○'}</span>
     <div><strong>{step}</strong><small>{step==='New'?(isNoProviderState(status)?'Provider search finished without a match':'Searching for a provider'):step==='Accepted'?'Provider accepted':step==='Processing'?'Service in progress':'Service completed'}</small></div>
    </div>)}
   </div>
  </section>

  {request.assigned_provider_label?<section className="screenCard">
   <div className="sectionHeading"><div><h2>Service Provider</h2><p>Assigned to this request</p></div></div>
   <div className="findingCard"><strong>{request.assigned_provider_label}</strong><p>{status==='ACCEPTED'?'Accepted this request and can proceed directly.':status==='PROCESSING'||status==='IN_PROGRESS'?'Currently working on your request.':status==='COMPLETED'?'Completed this service request.':'Assigned service provider.'}</p></div>
  </section>:null}

  <section className="screenCard">
   <div className="sectionHeading"><div><h2>Request Details</h2><p>The information you submitted for this service request.</p></div></div>
   <div className="requestInfoGrid"><div><span>Service address</span><strong>{request.service_location_text||'Not provided'}</strong></div>{request.urgency?<div><span>Priority</span><strong>{pretty(request.urgency)}</strong></div>:null}</div>
   <div className="findingCard"><strong>Issue / description</strong><p>{request.problem_description||'No description provided.'}</p></div>
   {request.customer_notes?<div className="findingCard"><strong>Customer notes</strong><p>{request.customer_notes}</p></div>:null}
  </section>

  {before.length||after.length?<section className="screenCard">
   <div className="sectionHeading"><div><h2>Service Photos</h2><p>Photos recorded for this request.</p></div></div>
   <div className="completionMediaGrid">{before.length?<div><h3>Before</h3><div className="requestPhotoRow">{before.map(m=><img className="requestPhoto" key={m.id} src={m.url||''} alt="Before service"/>)}</div></div>:null}{after.length?<div><h3>After</h3><div className="requestPhotoRow">{after.map(m=><img className="requestPhoto" key={m.id} src={m.url||''} alt="After service"/>)}</div></div>:null}</div>
  </section>:null}

  {request.assigned_provider_label?<section className="screenCard">
   <div className="sectionHeading"><div><h2>Messages</h2><p>Conversation with {request.assigned_provider_label}</p></div></div>
   <div className="chatList">{messages.map(m=><div key={m.id} className={`chatBubble ${m.sender_role==='CUSTOMER'?'customer':''}`}><strong>{m.sender_label||pretty(m.sender_role)}</strong><p>{m.message_text}</p><time>{when(m.created_at)}</time></div>)}{!messages.length?<div className="emptyState">No messages yet.</div>:null}</div>
   <div className="messageComposer"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message"/><button className="blueButton" onClick={()=>void send()} disabled={busy||!text.trim()}>Send</button></div>
  </section>:null}

  {request.status==='COMPLETED'?<section className="screenCard serviceReport">
   <div className="sectionHeading"><div><h2>Completion Summary</h2><p>Completed {when(request.completed_at)}</p></div></div>
   <div className="requestInfoGrid"><div><span>Service</span><strong>{request.service_name}</strong></div><div><span>Provider</span><strong>{request.assigned_provider_label||'Provider'}</strong></div><div><span>Location</span><strong>{request.service_location_text}</strong></div><div><span>Status</span><strong>Completed</strong></div></div>
  </section>:null}

  {canCancel?<section className="screenCard">
   <div className="sectionHeading"><div><h2>Request Options</h2><p>Cancel this request if you no longer need the service.</p></div></div>
   <button className="dangerOutline" onClick={()=>void cancelRequest()} disabled={busy}>{busy?'Please wait…':'Cancel request'}</button>
  </section>:null}
 </div></main>;
}
