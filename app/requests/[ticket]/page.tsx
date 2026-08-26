'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import RequestTimelinePanel from './RequestTimelinePanel';
import './marketplace.css';
import './completion-media.css';
import './request-tabs.css';

const DETAIL_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
const MESSAGE_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-messages';
const MEDIA_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/completion-media';
const CANCEL_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-cancel-request';

type RequestRow={id:string;ticket_number:string;service_name:string;service_location_text:string;preferred_date:string;problem_description:string;urgency?:string|null;customer_notes?:string|null;status:string;assigned_provider_label?:string|null;created_at:string;updated_at:string;accepted_at?:string|null;processing_at?:string|null;completed_at?:string|null};
type MessageRow={id:string;sender_role:string;sender_label?:string|null;message_text:string;created_at:string};
type CompletionMedia={id:string;media_type:'BEFORE'|'AFTER';url?:string|null;created_at:string};
type RequestTab='overview'|'activity'|'messages';

function when(v?:string|null){
 if(!v)return'Not set';
 const d=new Date(v);
 return Number.isNaN(d.getTime())?v:d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
}
function pretty(v?:string|null){return String(v||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function isNoProviderState(status:string){return ['NO_PROVIDER','NO_PROVIDER_AVAILABLE','EXPIRED','SEARCH_EXHAUSTED','FAILED'].includes(status);}
function customerStatus(status:string){
 if(status==='COMPLETED')return'Completed';
 if(status==='PROCESSING'||status==='IN_PROGRESS')return'Work in progress';
 if(status==='ACCEPTED')return'Provider accepted';
 if(isNoProviderState(status))return'No provider available';
 return'Searching for provider';
}
function statusCopy(status:string,provider?:string|null){
 if(status==='COMPLETED')return{title:'Service completed',detail:'Your service request has been completed.',action:'Your service is complete.'};
 if(status==='PROCESSING'||status==='IN_PROGRESS')return{title:'Service in progress',detail:provider?`${provider} is currently working on your request.`:'Your provider is currently working on your request.',action:'You can follow progress here.'};
 if(status==='ACCEPTED')return{title:'Provider accepted your request',detail:provider?`${provider} accepted your request.`:'A provider accepted your request.',action:'No confirmation is needed from you.'};
 if(isNoProviderState(status))return{title:'No provider available right now',detail:'We could not find an available provider for this request.',action:'You can cancel the request or return to your requests list.'};
 return{title:'Finding a service provider',detail:'We’re looking for an available provider near your location.',action:'No action is needed from you.'};
}

export default function RequestDetailPage(){
 const params=useParams<{ticket:string}>();
 const router=useRouter();
 const ticket=decodeURIComponent(String(params.ticket||'')).toUpperCase();
 const[request,setRequest]=useState<RequestRow|null>(null);
 const[messages,setMessages]=useState<MessageRow[]>([]);
 const[media,setMedia]=useState<CompletionMedia[]>([]);
 const[busy,setBusy]=useState(false);
 const[notice,setNotice]=useState('Loading request…');
 const[text,setText]=useState('');
 const[activeTab,setActiveTab]=useState<RequestTab>('overview');

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
 const hasProvider=Boolean(request?.assigned_provider_label);
 const photoCount=before.length+after.length;

 if(!request)return <main className="ifixPage"><div className="ifixLoading"><div className="ifixLogo"><span>Fix</span><b>It</b></div><p>{notice}</p></div></main>;

 return <main className="ifixPage"><div className="requestAppPanel requestModel">
  <div className="requestTopBar">
   <button type="button" className="requestBackButton" onClick={()=>router.push('/requests')} aria-label="Back to service requests"><span aria-hidden="true">←</span><span>Back to requests</span></button>
  </div>

  <header className="requestModelHeader">
   <div className="requestServiceIcon" aria-hidden="true">🔧</div>
   <div className="requestModelTitle">
    <h1>{request.service_name}</h1>
    <p>{request.ticket_number} <span>·</span> {when(request.created_at)}</p>
    <span className="heroStatus modelStatus">⌕ {customerStatus(status)}</span>
   </div>
  </header>

  {notice?<p className="statusNotice">{notice}</p>:null}

  <nav className="requestTabs modelTabs" role="tablist" aria-label="Service request sections">
   <button type="button" role="tab" aria-selected={activeTab==='overview'} className={`requestTab ${activeTab==='overview'?'active':''}`} onClick={()=>setActiveTab('overview')}>Overview</button>
   <button type="button" role="tab" aria-selected={activeTab==='activity'} className={`requestTab ${activeTab==='activity'?'active':''}`} onClick={()=>setActiveTab('activity')}>Activity</button>
   {hasProvider?<button type="button" role="tab" aria-selected={activeTab==='messages'} className={`requestTab ${activeTab==='messages'?'active':''}`} onClick={()=>setActiveTab('messages')}>Messages{messages.length?<span className="tabCount">{messages.length}</span>:null}</button>:null}
  </nav>

  {activeTab==='overview'?<div className="requestTabPanel" role="tabpanel">
   <section className="activeHero modelHero">
    <div className="modelHeroIcon" aria-hidden="true">⌕</div>
    <div className="modelHeroCopy">
     <h1>{current.title}</h1>
     <p>{current.detail}</p>
     <div className="heroMeta"><span>◷ Updated {when(request.updated_at)}</span></div>
     <div className="modelActionNote"><span aria-hidden="true">i</span><div><strong>{current.action}</strong>{!isNoProviderState(status)&&status!=='COMPLETED'?<p>We’ll notify you as soon as your request moves forward.</p>:null}</div></div>
    </div>
   </section>

   <section className="modelSection">
    <h2>Request progress</h2>
    <div className="modelProgress" aria-label="Request progress">
     {progressSteps.map((step,index)=><div className={`modelProgressStep ${index<progressIndex?'done':index===progressIndex?'current':''}`} key={step}>
      <div className="modelProgressTrack"><span className="modelDot">{index<progressIndex?'✓':''}</span>{index<progressSteps.length-1?<i/>:null}</div>
      <strong>{step}</strong>
     </div>)}
    </div>
   </section>

   {request.assigned_provider_label?<section className="screenCard modelProviderCard">
    <div className="modelDetailRow"><span className="modelRowIcon">👤</span><div><small>Service provider</small><strong>{request.assigned_provider_label}</strong></div><span className="providerState">{customerStatus(status)}</span></div>
   </section>:null}

   <section className="modelSection">
    <h2>Request details</h2>
    <div className="screenCard modelDetailsCard">
     <div className="modelDetailRow"><span className="modelRowIcon">🔧</span><strong>Service</strong><span>{request.service_name}</span></div>
     <div className="modelDetailRow"><span className="modelRowIcon">⌖</span><strong>Location</strong><span>{request.service_location_text||'Not provided'}</span></div>
     <div className="modelDetailRow"><span className="modelRowIcon">▤</span><strong>Description</strong><span>{request.problem_description||'No description provided.'}</span></div>
     {request.urgency?<div className="modelDetailRow"><span className="modelRowIcon">⚑</span><strong>Priority</strong><span className="priorityPill">{pretty(request.urgency)}</span></div>:null}
     <div className="modelDetailRow"><span className="modelRowIcon">▣</span><strong>Created</strong><span>{when(request.created_at)}</span></div>
     {photoCount?<div className="modelDetailRow photoRow"><span className="modelRowIcon">▧</span><strong>Photos ({photoCount})</strong><div className="modelThumbs">{[...before,...after].slice(0,3).map(m=><img key={m.id} src={m.url||''} alt="Service request"/>)}</div></div>:null}
     {request.customer_notes?<div className="modelDetailRow notesRow"><span className="modelRowIcon">✎</span><strong>Notes</strong><span>{request.customer_notes}</span></div>:null}
    </div>
   </section>

   {request.status==='COMPLETED'?<section className="screenCard serviceReport">
    <div className="sectionHeading"><div><h2>Completion Summary</h2><p>Completed {when(request.completed_at)}</p></div></div>
    <div className="requestInfoGrid"><div><span>Service</span><strong>{request.service_name}</strong></div><div><span>Provider</span><strong>{request.assigned_provider_label||'Provider'}</strong></div><div><span>Location</span><strong>{request.service_location_text}</strong></div><div><span>Status</span><strong>Completed</strong></div></div>
   </section>:null}

   {canCancel?<button type="button" className="modelCancelCard" onClick={()=>void cancelRequest()} disabled={busy}>
    <span className="cancelIcon">⌫</span><span><strong>{busy?'Please wait…':'Cancel request'}</strong><small>You can cancel this request while it is still eligible.</small></span><span className="cancelChevron">›</span>
   </button>:null}
  </div>:null}

  {activeTab==='activity'?<div className="requestTabPanel" role="tabpanel"><RequestTimelinePanel/></div>:null}

  {activeTab==='messages'&&hasProvider?<div className="requestTabPanel" role="tabpanel">
   <section className="screenCard">
    <div className="sectionHeading"><div><h2>Messages</h2><p>Conversation with {request.assigned_provider_label}</p></div></div>
    <div className="chatList">{messages.map(m=><div key={m.id} className={`chatBubble ${m.sender_role==='CUSTOMER'?'customer':''}`}><strong>{m.sender_label||pretty(m.sender_role)}</strong><p>{m.message_text}</p><time>{when(m.created_at)}</time></div>)}{!messages.length?<div className="emptyState">No messages yet.</div>:null}</div>
    <div className="messageComposer"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message"/><button className="blueButton" onClick={()=>void send()} disabled={busy||!text.trim()}>Send</button></div>
   </section>
  </div>:null}
 </div></main>;
}
