'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomerHeader from '../components/customer/CustomerHeader';
import ServiceIcon from '../components/customer/ServiceIcon';
import '../customer-v3.css';
import './requests-redesign.css';
import './request-photos.css';

const API='/api/legacy-edge?service=customer-requests';
const DISPATCH_API='/api/legacy-edge?service=dispatch-control';
const MEDIA_API='/api/legacy-edge?service=request-media';

type RequestRow={id:string;ticket_number:string;service_name:string;service_category_code:string;service_location_text:string;preferred_date?:string|null;problem_description:string;status:string;assigned_provider_label?:string|null;assigned_provider_user_id?:string|null;created_at:string;updated_at:string};
type DispatchState='SEARCHING'|'EXTENDED'|'SECURED'|'EXHAUSTED'|'CANCELLED'|'NOT_REQUIRED';
type DispatchRow={ticket_number:string;status:string;assigned_provider_user_id?:string|null;dispatch_state?:DispatchState|null;dispatch_started_at?:string|null;dispatch_initial_deadline_at?:string|null;dispatch_extension_deadline_at?:string|null;dispatch_secured_at?:string|null;dispatch_exhausted_at?:string|null};
type NotificationRow={id:string;message:string;created_at:string;read_at?:string|null};
type RequestMedia={id:string;request_id:string;media_type:string;sort_order:number;created_at:string;url?:string|null};
type Filter='ACTIVE'|'COMPLETED';

function pretty(value:string){return value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function dateLabel(value?:string|null,plainDate=false){if(!value)return'—';const d=new Date(plainDate?`${value}T00:00:00`:value);if(Number.isNaN(d.getTime()))return value;const day=String(d.getDate()).padStart(2,'0');const month=d.toLocaleDateString('en-US',{month:'short'});return `${day} - ${month} - ${d.getFullYear()}`;}
function canCancel(r:RequestRow,assigned:boolean){return !assigned&&['PENDING','RESPONDED'].includes(String(r.status).toUpperCase());}
function displayStatus(r:RequestRow,assigned:boolean){const status=String(r.status||'PENDING').toUpperCase();if(assigned&&['PENDING','RESPONDED'].includes(status))return'ACCEPTED';if(status==='RESPONDED')return'SEARCHING';return status;}
function statusClass(status:string){return `status-${status.toLowerCase().replace(/[^a-z0-9_]+/g,'_')}`;}
function dispatchCopy(d:DispatchRow|undefined,assigned:boolean){
 if(assigned||d?.dispatch_state==='SECURED')return{title:'Provider assigned',body:'A service provider has accepted your request. Open the request to continue.',tone:'secured'};
 if(d?.dispatch_state==='EXHAUSTED')return{title:'No provider available yet',body:'No eligible provider accepted this request. You can cancel it or leave it open while availability changes.',tone:'exhausted'};
 if(d?.dispatch_state==='EXTENDED')return{title:'Provider search continuing',body:'We are continuing to match this request with eligible providers. The first provider who accepts will be assigned automatically.',tone:'extended'};
 return{title:'Searching for a provider',body:'Eligible providers are being notified. The first provider who accepts will be assigned automatically.',tone:'search'};
}
async function post(url:string,body:Record<string,unknown>){
 const r=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const p=await r.json().catch(()=>({}));
 if(r.status===401){const next=`${window.location.pathname}${window.location.search}`;window.location.replace(`/login?next=${encodeURIComponent(next)}`);throw new Error('Authentication required.');}
 if(!r.ok)throw new Error(p?.error||'Request failed');
 return p;
}

export default function MyRequestsPage(){
 const searchParams=useSearchParams();
 const bookingsMode=searchParams.get('view')==='bookings';
 const[requests,setRequests]=useState<RequestRow[]>([]);
 const[dispatch,setDispatch]=useState<Record<string,DispatchRow>>({});
 const[media,setMedia]=useState<Record<string,RequestMedia[]>>({});
 const[notifications,setNotifications]=useState<NotificationRow[]>([]);
 const[filter,setFilter]=useState<Filter>('ACTIVE');
 const[busy,setBusy]=useState(false);
 const[cancelling,setCancelling]=useState('');
 const[message,setMessage]=useState('Loading…');
 const[viewer,setViewer]=useState<{ticket:string;index:number}|null>(null);

 useEffect(()=>{let active=true;let poll:number|undefined;void(async()=>{await load(false);if(active)poll=window.setInterval(()=>void load(true),5000);})();return()=>{active=false;if(poll)window.clearInterval(poll);};},[]);

 async function load(silent=false){
  if(!silent)setBusy(true);
  try{
   const[p,d]=await Promise.all([post(API,{action:'list'}),post(DISPATCH_API,{action:'status'})]);
   const rows:RequestRow[]=p.requests||[];
   setRequests(rows);
   const map:Record<string,DispatchRow>={};for(const row of d.requests||[])map[row.ticket_number]=row;setDispatch(map);
   setNotifications((d.notifications||[]).filter((n:NotificationRow)=>!String(n.message||'').toLowerCase().includes('choose provider')));
   try{const m=await post(MEDIA_API,{action:'list',ticketNumbers:rows.map(r=>r.ticket_number)});setMedia(m.mediaByTicket||{});}catch{}
   if(!silent)setMessage(rows.length?'Up to date':bookingsMode?'No bookings yet':'No requests yet');
  }catch(e){if(!silent&&!(e instanceof Error&&e.message==='Authentication required.'))setMessage(e instanceof Error?e.message:'Unable to load requests');}
  finally{if(!silent)setBusy(false);}
 }

 async function cancelRequest(r:RequestRow,assigned:boolean){
  if(!canCancel(r,assigned))return;
  if(!window.confirm(`Cancel request ${r.ticket_number}?`))return;
  setCancelling(r.ticket_number);setMessage('Cancelling request…');
  try{
   const response=await fetch(`/api/service-requests/${encodeURIComponent(r.ticket_number)}`,{method:'DELETE',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'Cancelled by customer before provider assignment'})});
   const p=await response.json().catch(()=>({}));
   if(response.status===401){window.location.replace(`/login?next=${encodeURIComponent('/requests')}`);return;}
   if(!response.ok)throw new Error(p?.error||'Unable to cancel request.');
   setRequests(current=>current.filter(item=>item.ticket_number!==r.ticket_number));
   setMessage(`${r.ticket_number} cancelled.`);
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to cancel request.');}
  finally{setCancelling('');}
 }

 async function markNotificationRead(id:string){try{await post(DISPATCH_API,{action:'mark_read',notificationId:id});setNotifications(v=>v.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));}catch{}}

 function assignedFor(r:RequestRow){const d=dispatch[r.ticket_number];return Boolean(r.assigned_provider_label||r.assigned_provider_user_id||d?.assigned_provider_user_id||d?.dispatch_state==='SECURED');}
 const visible=useMemo(()=>requests.filter(r=>{
  const status=String(r.status).toUpperCase();
  if(status==='CANCELLED')return false;
  if(bookingsMode)return assignedFor(r);
  return filter==='COMPLETED'?status==='COMPLETED':status!=='COMPLETED';
 }),[requests,dispatch,filter,bookingsMode]);
 const counts=useMemo(()=>({active:requests.filter(r=>!['COMPLETED','CANCELLED'].includes(String(r.status).toUpperCase())).length,completed:requests.filter(r=>String(r.status).toUpperCase()==='COMPLETED').length,bookings:requests.filter(r=>String(r.status).toUpperCase()!=='CANCELLED'&&assignedFor(r)).length}),[requests,dispatch]);
 const unreadNotifications=notifications.filter(n=>!n.read_at);
 const viewerItems=viewer?(media[viewer.ticket]||[]).filter(x=>x.url):[];
 const viewerItem=viewer?viewerItems[viewer.index]:null;

 return <main className="c3Page"><CustomerHeader title={bookingsMode?'Bookings':'Requests'} backHref="/"/><div className="c3Shell c3Requests">
  {unreadNotifications.length?<section className="c3Notice c3DispatchNotice" aria-label="Provider updates"><strong>Request update</strong>{unreadNotifications.slice(0,3).map(n=><div key={n.id}><span>{n.message}</span><button className="c3Secondary" type="button" onClick={()=>void markNotificationRead(n.id)}>Dismiss</button></div>)}</section>:null}
  {bookingsMode?<div className="c3Notice" role="status"><strong>Bookings {counts.bookings}</strong><span>Requests with an assigned provider appear here.</span></div>:<div className="c3Filters"><button className={filter==='ACTIVE'?'active':''} onClick={()=>setFilter('ACTIVE')}>Active {counts.active}</button><button className={filter==='COMPLETED'?'active':''} onClick={()=>setFilter('COMPLETED')}>Completed {counts.completed}</button><a className="c3NewRequest" href="/home?new=1"><span aria-hidden="true">+</span> New Request</a></div>}
  {message&&message!=='Up to date'?<div className="c3Notice" role="status">{message}</div>:null}
  <section className="c3RequestList">{visible.map(r=>{const d=dispatch[r.ticket_number];const assigned=assignedFor(r);const info=dispatchCopy(d,assigned);const status=displayStatus(r,assigned);const photos=(media[r.ticket_number]||[]).filter(x=>x.url);return <article key={r.id} className={`c3RequestCard ${status==='COMPLETED'?'completed':''}`}>
   <div className="c3RequestMain"><div className="c3RequestIcon"><ServiceIcon name={r.service_name}/></div><div className="c3RequestIdentity"><span className={`c3Status ${statusClass(status)}`}>{pretty(status)}</span><h2>{r.service_name}</h2><p className="c3ProviderLine">{r.assigned_provider_label||(assigned?'Provider assigned':'Waiting for first provider acceptance')}</p><p className="c3Ticket">Request ID: <strong>{r.ticket_number}</strong></p></div></div>
   {status!=='COMPLETED'?<div className={`c3SearchPanel ${info.tone}`}><div className="c3SearchCopy"><strong>{info.title}</strong><p>{info.body}</p></div></div>:null}
   <div className="c3RequestMeta"><div><div><small>Location</small><strong>{r.service_location_text}</strong></div></div><div><div><small>Preferred date</small><strong>{dateLabel(r.preferred_date,true)}</strong></div></div><div><div><small>Created on</small><strong>{dateLabel(r.created_at)}</strong></div></div></div>
   {photos.length?<section className="c3PhotoCard"><div className="c3PhotoHead"><div><strong>Attached Photos ({photos.length})</strong><span>Photos uploaded with this request</span></div><button type="button" onClick={()=>setViewer({ticket:r.ticket_number,index:0})}>View All</button></div><div className={`c3PhotoGrid count${photos.length}`}>{photos.slice(0,3).map((photo,index)=><button type="button" key={photo.id} className="c3PhotoThumb" onClick={()=>setViewer({ticket:r.ticket_number,index})}><img src={photo.url||''} alt={`Request photo ${index+1}`}/><span>{index+1} / {photos.length}</span></button>)}</div></section>:null}
   <a className="c3NextPanel" href={`/requests/${encodeURIComponent(r.ticket_number)}`}><div><small>Action</small><strong>{status==='COMPLETED'?'View completed request':assigned?'Continue with assigned provider':'View request details'}</strong></div><span aria-hidden="true">›</span></a>
   {canCancel(r,assigned)?<div className="c3RequestAction"><button className="c3Secondary" type="button" disabled={cancelling===r.ticket_number} onClick={()=>void cancelRequest(r,assigned)}>{cancelling===r.ticket_number?'Cancelling…':'Cancel Request'}</button></div>:null}
  </article>})}{!visible.length?<div className="c3Notice">{bookingsMode?'No provider bookings yet.':filter==='COMPLETED'?'No completed requests yet.':'No active requests.'}</div>:null}</section>
  {viewer&&viewerItem?<div className="c3PhotoViewer" role="dialog" aria-modal="true" aria-label="Request photo"><button className="c3PhotoViewerClose" type="button" onClick={()=>setViewer(null)}>×</button><img src={viewerItem.url||''} alt={`Request photo ${viewer.index+1}`}/><div className="c3PhotoViewerNav"><button type="button" disabled={viewer.index===0} onClick={()=>setViewer(v=>v?{...v,index:Math.max(0,v.index-1)}:v)}>‹</button><span>{viewer.index+1} / {viewerItems.length}</span><button type="button" disabled={viewer.index>=viewerItems.length-1} onClick={()=>setViewer(v=>v?{...v,index:Math.min(viewerItems.length-1,v.index+1)}:v)}>›</button></div></div>:null}
  <p className="muted" role="status">{busy?'Refreshing…':''}</p>
 </div></main>;
}
