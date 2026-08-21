'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const services = ['AC Repair', 'Plumbing', 'Electrical', 'Appliance Repair', 'Cleaning', 'Handyman'];
const SUBMIT_REQUEST_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/submit-request';
const TRACK_REQUEST_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/track-request';
const MESSAGE_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-messages';
const workflow = ['New', 'Accepted', 'Processing', 'Completed'] as const;

type RequestStatus = (typeof workflow)[number];
type ChatMessage = { id: string; sender_role: string; sender_label?: string | null; message_text: string; created_at: string };
type RequestSummary = { id: string; service: string; location: string; preferredDate: string; description: string; status: RequestStatus; createdAt: string; trackingToken?: string; updatedAt?: string };

function normalizeStatus(value: string): RequestStatus {
  if (value === 'ACCEPTED') return 'Accepted';
  if (value === 'PROCESSING') return 'Processing';
  if (value === 'COMPLETED') return 'Completed';
  return 'New';
}

export default function HomePage() {
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [lastRequest, setLastRequest] = useState<RequestSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('fixit:last-request');
    if (saved) { try { setLastRequest(JSON.parse(saved)); } catch { window.localStorage.removeItem('fixit:last-request'); } }
  }, []);

  const activeStep = useMemo(() => !lastRequest ? 0 : Math.max(0, workflow.indexOf(lastRequest.status)), [lastRequest]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('');
    if (!service) return setMessage('Please select a service.');
    if (!location.trim()) return setMessage('Please enter the service location.');
    if (!preferredDate) return setMessage('Please choose a preferred date.');
    if (description.trim().length < 10) return setMessage('Please describe the issue in at least 10 characters.');
    setSubmitting(true);
    try {
      const response = await fetch(SUBMIT_REQUEST_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceName:service,location:location.trim(),preferredDate,description:description.trim(),clientRequestId:crypto.randomUUID()})});
      const payload = await response.json();
      if (!response.ok || !payload?.request?.ticket_number) throw new Error(payload?.error || 'Unable to submit request');
      const request: RequestSummary = {id:payload.request.ticket_number,service:payload.request.service_name||service,location:payload.request.service_location_text||location.trim(),preferredDate:payload.request.preferred_date||preferredDate,description:payload.request.problem_description||description.trim(),status:normalizeStatus(payload.request.status),createdAt:payload.request.created_at||new Date().toISOString(),trackingToken:payload.trackingToken};
      window.localStorage.setItem('fixit:last-request',JSON.stringify(request)); setLastRequest(request); setChat([]);
      setMessage(`Request ${request.id} submitted successfully to FixIt.`); setService(''); setLocation(''); setPreferredDate(''); setDescription('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to submit request. Please try again.'); }
    finally { setSubmitting(false); }
  }

  async function refreshRequest() {
    if (!lastRequest?.trackingToken) return setMessage('This older request cannot be refreshed securely. Submit a new request to enable live tracking.');
    setRefreshing(true); setMessage('');
    try {
      const response=await fetch(TRACK_REQUEST_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticketNumber:lastRequest.id,trackingToken:lastRequest.trackingToken})});
      const payload=await response.json(); if(!response.ok||!payload?.request) throw new Error(payload?.error||'Unable to refresh request');
      const updated={...lastRequest,service:payload.request.service_name,location:payload.request.service_location_text,preferredDate:payload.request.preferred_date,description:payload.request.problem_description,status:normalizeStatus(payload.request.status),updatedAt:payload.request.updated_at};
      window.localStorage.setItem('fixit:last-request',JSON.stringify(updated)); setLastRequest(updated); setMessage(`Request ${updated.id} is currently ${updated.status}.`);
    } catch(error){setMessage(error instanceof Error?error.message:'Unable to refresh request.');} finally{setRefreshing(false);}
  }

  async function loadMessages(send = false) {
    if (!lastRequest?.trackingToken) return setMessage('Submit a new request to enable secure messaging.');
    if (send && !chatText.trim()) return;
    setChatBusy(true);
    try {
      const response=await fetch(MESSAGE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'customer',action:send?'send':'list',ticketNumber:lastRequest.id,trackingToken:lastRequest.trackingToken,message:chatText.trim()})});
      const payload=await response.json(); if(!response.ok) throw new Error(payload?.error||'Unable to load messages');
      setChat(payload.messages||[]); if(send)setChatText('');
    } catch(error){setMessage(error instanceof Error?error.message:'Unable to process messages.');} finally{setChatBusy(false);}
  }

  return <main className="shell">
    <header className="topbar"><div><div className="brand">FixIt</div><p className="tagline">Local help. Fixed right.</p></div><div className="actions"><a className="secondary" href="/provider">Provider</a><a className="secondary" href="/admin">Admin</a></div></header>

    <section className="hero"><div><p className="eyebrow">CUSTOMER</p><h1>Request a service in a few simple steps.</h1><p className="lead">Create a request, let a provider accept it, follow the work, and message about the job from one place.</p><div className="actions"><a className="primary" href="#request">Request a Service</a><a className="secondary" href="#tracking">Track Request</a></div></div><div className="statusCard"><p className="smallLabel">LIVE REQUEST WORKFLOW</p><div className="statusRow">{workflow.map((item,index)=><div className="statusStep" key={item}><span className={index<=activeStep?'dot active':'dot'}>{index+1}</span><strong>{item}</strong></div>)}</div><p className="muted">Payment processing remains outside the MVP scope.</p></div></section>

    <section className="panel" id="request"><div className="panelHeader"><div><p className="eyebrow">SERVICE REQUEST</p><h2>What do you need fixed?</h2></div><span className="pill">New</span></div><form onSubmit={submitRequest}><div className="serviceGrid">{services.map(item=><button className={service===item?'serviceCard selected':'serviceCard'} key={item} type="button" onClick={()=>setService(item)}><span className="serviceIcon">•</span>{item}</button>)}</div><div className="formGrid"><label>Service location<input placeholder="Select island / city" value={location} onChange={e=>setLocation(e.target.value)}/></label><label>Preferred date<input type="date" value={preferredDate} onChange={e=>setPreferredDate(e.target.value)}/></label><label className="full">Describe the issue<textarea rows={4} placeholder="Tell the provider what needs to be fixed..." value={description} onChange={e=>setDescription(e.target.value)}/></label></div><button className="primary button" disabled={submitting}>{submitting?'Submitting…':'Submit Request'}</button>{message?<p className="formMessage" role="status">{message}</p>:null}<p className="localNotice">Connected to FixIt Supabase. Requests, status changes and messages are stored centrally.</p></form></section>

    <section className="panel" id="tracking"><div className="panelHeader"><div><p className="eyebrow">CUSTOMER TRACKING</p><h2>Your latest request</h2></div>{lastRequest?<span className="pill">{lastRequest.status}</span>:null}</div>{lastRequest?<div className="trackingGrid"><div className="requestSummary"><strong className="ticket">{lastRequest.id}</strong><p><b>Service:</b> {lastRequest.service}</p><p><b>Location:</b> {lastRequest.location}</p><p><b>Preferred date:</b> {lastRequest.preferredDate}</p><p><b>Status:</b> {lastRequest.status}</p><button className="secondary refreshButton" type="button" onClick={refreshRequest} disabled={refreshing}>{refreshing?'Refreshing…':'Refresh Live Status'}</button></div><div className="miniTimeline">{workflow.map((item,index)=><div className={index<=activeStep?'timelineItem done':'timelineItem'} key={item}><span>{index+1}</span><div><strong>{item}</strong><small>{index<activeStep?'Completed stage':index===activeStep?'Current stage':'Pending'}</small></div></div>)}</div></div>:<p className="muted emptyTrack">Submit a service request and it will appear here.</p>}</section>

    {lastRequest?<section className="panel"><div className="panelHeader"><div><p className="eyebrow">COMMUNICATION</p><h2>Request Messages</h2></div><button className="secondary" type="button" onClick={()=>loadMessages(false)} disabled={chatBusy}>{chatBusy?'Loading…':'Refresh Messages'}</button></div><div className="jobList">{chat.map(m=><div className="jobCard" key={m.id}><strong>{m.sender_label||m.sender_role}</strong><p className="jobDescription">{m.message_text}</p><span className="muted">{new Date(m.created_at).toLocaleString()}</span></div>)}{!chat.length?<div className="emptyQueue">No messages yet.</div>:null}</div><div className="providerAccessRow"><input placeholder="Write a message about this request" value={chatText} onChange={e=>setChatText(e.target.value)}/><button className="primary" type="button" onClick={()=>loadMessages(true)} disabled={chatBusy||!chatText.trim()}>Send Message</button></div></section>:null}

    <section className="threeCol"><article className="infoCard"><p className="eyebrow">CUSTOMER</p><h3>Track centrally</h3><p>Live status and request-linked communication are now available.</p></article><article className="infoCard"><p className="eyebrow">PROVIDER</p><h3>Operational workflow</h3><p>Providers can accept, process and complete jobs from the live queue.</p></article><article className="infoCard"><p className="eyebrow">ADMIN</p><h3>Central oversight</h3><p>Admin now has a live operational dashboard for all requests.</p></article></section>
    <footer className="footer"><span>FixIt Maldives</span><span>Railway + Supabase</span></footer>
  </main>;
}
