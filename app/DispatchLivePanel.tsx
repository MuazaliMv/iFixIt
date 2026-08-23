'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import './dispatch-live.css';

const DISPATCH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/dispatch-control';
const MARKET_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-marketplace';
type DispatchState='SEARCHING'|'EXTENDED'|'AWAITING_CUSTOMER'|'SECURED'|'EXHAUSTED'|'CUSTOMER_TIMEOUT'|'CANCELLED'|'NOT_REQUIRED';
type Row={ticket_number:string;status:string;dispatch_tier?:'URGENT'|'STANDARD'|'SCHEDULED'|null;dispatch_state?:DispatchState|null;dispatch_initial_deadline_at?:string|null;dispatch_extension_deadline_at?:string|null;dispatch_customer_response_deadline_at?:string|null;dispatch_customer_retry_count:number;dispatch_customer_mode?:'WAITING_MORE'|null;available_provider_count:number;assigned_provider_user_id?:string|null};
type Position={left:number;top:number};
type DragState={pointerId:number;offsetX:number;offsetY:number}|null;

function timer(value:string|undefined|null,now:number){if(!value)return'—';const end=new Date(value).getTime();if(!Number.isFinite(end))return'—';const seconds=Math.max(0,Math.floor((end-now)/1000));const h=Math.floor(seconds/3600);const m=Math.floor((seconds%3600)/60);const s=seconds%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}

export default function DispatchLivePanel(){
 const pathname=usePathname();
 const ticket=useMemo(()=>{const m=pathname.match(/^\/requests\/([^/]+)$/);return m?decodeURIComponent(m[1]).toUpperCase():'';},[pathname]);
 const[row,setRow]=useState<Row|null>(null);const[now,setNow]=useState(()=>Date.now());const[busy,setBusy]=useState(false);const[note,setNote]=useState('');const[position,setPosition]=useState<Position|null>(null);const[dragging,setDragging]=useState(false);const drag=useRef<DragState>(null);const wasUnassigned=useRef(false);const reloading=useRef(false);
 const call=useCallback(async(body:Record<string,unknown>)=>{const{data}=await supabase.auth.getSession();if(!data.session)return null;const response=await fetch(DISPATCH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Unable to update provider search');return payload;},[]);
 const journeyHasSelectedProvider=useCallback(async()=>{const{data}=await supabase.auth.getSession();if(!data.session||!ticket)return false;const response=await fetch(MARKET_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'journey',ticketNumber:ticket})});if(!response.ok)return false;const payload=await response.json();return Boolean(payload?.selectedProvider);},[ticket]);
 const refresh=useCallback(async()=>{if(!ticket)return;try{const[p,journeySelected]=await Promise.all([call({action:'status'}),journeyHasSelectedProvider()]);const found=(p?.requests||[]).find((r:Row)=>r.ticket_number===ticket)||null;if(found){const assigned=journeySelected||Boolean(found.assigned_provider_user_id)||found.dispatch_state==='SECURED'||['ACCEPTED','INSPECTION_SCHEDULED','PROCESSING','IN_PROGRESS','COMPLETED'].includes(found.status);if(assigned&&wasUnassigned.current&&!reloading.current){reloading.current=true;window.location.reload();return;}if(!assigned)wasUnassigned.current=true;if(journeySelected&&!found.assigned_provider_user_id){setRow({...found,assigned_provider_user_id:'__selected_provider__'});return;}}setRow(found);}catch{}},[ticket,call,journeyHasSelectedProvider]);
 useEffect(()=>{if(!ticket)return;wasUnassigned.current=false;reloading.current=false;void refresh();const poll=window.setInterval(()=>void refresh(),3000);return()=>window.clearInterval(poll);},[ticket,refresh]);
 useEffect(()=>{const tick=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(tick);},[]);
 useEffect(()=>{setPosition(null);drag.current=null;setDragging(false);},[ticket]);
 useEffect(()=>{if(!position)return;const clamp=()=>setPosition(current=>{if(!current)return current;const maxLeft=Math.max(8,window.innerWidth-120);const maxTop=Math.max(8,window.innerHeight-80);return{left:Math.min(Math.max(8,current.left),maxLeft),top:Math.min(Math.max(8,current.top),maxTop)};});window.addEventListener('resize',clamp);return()=>window.removeEventListener('resize',clamp);},[position]);
 async function waitMore(){if(!row||!ticket)return;setBusy(true);setNote('');try{await call({action:'wait_more',ticketNumber:ticket});setNote('Search will continue for more providers.');await refresh();}catch(e){setNote(e instanceof Error?e.message:'Unable to continue search.');}finally{setBusy(false);}}
 function startDrag(e:ReactPointerEvent<HTMLElement>){if((e.target as HTMLElement).closest('button,a'))return;const rect=e.currentTarget.getBoundingClientRect();drag.current={pointerId:e.pointerId,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top};e.currentTarget.setPointerCapture(e.pointerId);setPosition({left:rect.left,top:rect.top});setDragging(true);}
 function moveDrag(e:ReactPointerEvent<HTMLElement>){if(!drag.current||drag.current.pointerId!==e.pointerId)return;const rect=e.currentTarget.getBoundingClientRect();const width=rect.width,height=rect.height;const left=Math.min(Math.max(8,e.clientX-drag.current.offsetX),Math.max(8,window.innerWidth-width-8));const top=Math.min(Math.max(8,e.clientY-drag.current.offsetY),Math.max(8,window.innerHeight-height-8));setPosition({left,top});}
 function endDrag(e:ReactPointerEvent<HTMLElement>){if(!drag.current||drag.current.pointerId!==e.pointerId)return;drag.current=null;setDragging(false);try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}}
 if(!ticket||!row||row.assigned_provider_user_id||!['PENDING','RESPONDED'].includes(row.status))return null;
 const count=Math.min(5,row.available_provider_count||0);const state=row.dispatch_state;const searchDeadline=state==='EXTENDED'?row.dispatch_extension_deadline_at:row.dispatch_initial_deadline_at;const searchTimer=timer(searchDeadline,now);const responseTimer=timer(row.dispatch_customer_response_deadline_at,now);
 const active=['SEARCHING','EXTENDED'].includes(String(state));const waiting=row.dispatch_customer_mode==='WAITING_MORE';const canWait=active&&count>0&&count<5&&!waiting;const canSelect=state==='AWAITING_CUSTOMER'&&count>0;
 const timerValue=state==='AWAITING_CUSTOMER'?responseTimer:searchTimer;
 const timerLabel=state==='AWAITING_CUSTOMER'?'Choose within':'Broadcast ends in';
 const title=state==='AWAITING_CUSTOMER'?`Choose a provider · ${count}/5`:waiting?'Your request is still broadcasting to service providers':count>0?`Your request is broadcasting · ${count} provider${count===1?'':'s'} responded`:'Your request is broadcasting to service providers';
 const subtitle=state==='AWAITING_CUSTOMER'?'The broadcast has ended. You can now select from the providers who responded.':waiting?'We are notifying more matching providers now. Provider selection stays locked until the broadcast timer ends.':count>0?'Matching providers are responding now. Provider selection stays locked until the broadcast timer ends.':'We are notifying matching providers now. Provider selection stays locked until the broadcast timer ends.';
 if(['EXHAUSTED','CUSTOMER_TIMEOUT','CANCELLED','NOT_REQUIRED','SECURED'].includes(String(state)))return null;
 return <aside className={`dispatchLive ${dragging?'isDragging':''}`} aria-label="Live Dispatch" aria-live="polite" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} style={position?{left:position.left,top:position.top,bottom:'auto',transform:'none'}:undefined}>
  <div className="dispatchLiveGrip" aria-hidden="true">•••</div>
  <div className="dispatchLiveIcon" aria-hidden="true">📣</div>
  <div className="dispatchLiveBody"><span className="dispatchLiveEyebrow">Live provider broadcast</span><strong>{title}</strong><small>{subtitle}</small>{note?<small className="dispatchLiveNote">{note}</small>:null}<div className="dispatchLiveTimer"><span>{timerLabel}</span><b>{timerValue}</b></div></div>
  <div className="dispatchLiveActions">{canWait?<button type="button" onClick={()=>void waitMore()} disabled={busy}>{busy?'Updating…':'Wait for More'}</button>:null}{waiting?<button type="button" disabled>Waiting for More</button>:null}{canSelect?<button className="primary" type="button" onClick={()=>document.querySelector('.providerGrid')?.scrollIntoView({behavior:'smooth',block:'center'})}>Select Provider</button>:null}</div>
 </aside>;
}
