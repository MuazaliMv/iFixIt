'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import './dispatch-live.css';

const DISPATCH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/dispatch-control';
type DispatchState='SEARCHING'|'EXTENDED'|'AWAITING_CUSTOMER'|'SECURED'|'EXHAUSTED'|'CUSTOMER_TIMEOUT'|'CANCELLED'|'NOT_REQUIRED';
type Row={ticket_number:string;status:string;dispatch_tier?:'URGENT'|'STANDARD'|'SCHEDULED'|null;dispatch_state?:DispatchState|null;dispatch_initial_deadline_at?:string|null;dispatch_extension_deadline_at?:string|null;dispatch_customer_response_deadline_at?:string|null;dispatch_customer_retry_count:number;dispatch_customer_mode?:'WAITING_MORE'|null;available_provider_count:number;assigned_provider_user_id?:string|null};

function timer(value:string|undefined|null,now:number){if(!value)return'—';const end=new Date(value).getTime();if(!Number.isFinite(end))return'—';const seconds=Math.max(0,Math.floor((end-now)/1000));const h=Math.floor(seconds/3600);const m=Math.floor((seconds%3600)/60);const s=seconds%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}

export default function DispatchLivePanel(){
 const pathname=usePathname();
 const ticket=useMemo(()=>{const m=pathname.match(/^\/requests\/([^/]+)$/);return m?decodeURIComponent(m[1]).toUpperCase():'';},[pathname]);
 const[row,setRow]=useState<Row|null>(null);const[now,setNow]=useState(()=>Date.now());const[busy,setBusy]=useState(false);const[note,setNote]=useState('');
 const call=useCallback(async(body:Record<string,unknown>)=>{const{data}=await supabase.auth.getSession();if(!data.session)return null;const response=await fetch(DISPATCH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Unable to update provider search');return payload;},[]);
 const refresh=useCallback(async()=>{if(!ticket)return;try{const p=await call({action:'status'});const found=(p?.requests||[]).find((r:Row)=>r.ticket_number===ticket)||null;setRow(found);}catch{}},[ticket,call]);
 useEffect(()=>{if(!ticket)return;void refresh();const poll=window.setInterval(()=>void refresh(),15000);return()=>window.clearInterval(poll);},[ticket,refresh]);
 useEffect(()=>{const tick=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(tick);},[]);
 async function waitMore(){if(!row||!ticket)return;setBusy(true);setNote('');try{await call({action:'wait_more',ticketNumber:ticket});setNote('Search will continue for more providers.');await refresh();}catch(e){setNote(e instanceof Error?e.message:'Unable to continue search.');}finally{setBusy(false);}}
 if(!ticket||!row||row.assigned_provider_user_id||!['PENDING','RESPONDED'].includes(row.status))return null;
 const count=Math.min(5,row.available_provider_count||0);const state=row.dispatch_state;const searchDeadline=state==='EXTENDED'?row.dispatch_extension_deadline_at:row.dispatch_initial_deadline_at;const searchTimer=timer(searchDeadline,now);const responseTimer=timer(row.dispatch_customer_response_deadline_at,now);
 const active=['SEARCHING','EXTENDED'].includes(String(state));const waiting=row.dispatch_customer_mode==='WAITING_MORE';const canWait=active&&count>0&&count<5&&!waiting;
 const timerValue=state==='AWAITING_CUSTOMER'?responseTimer:searchTimer;
 const title=state==='AWAITING_CUSTOMER'?`Choose a provider · ${count}/5`:waiting?'Your request is still broadcasting to service providers':count>0?`Your request is broadcasting to service providers · ${count} responded`:'Your request is broadcasting to service providers';
 const subtitle=state==='AWAITING_CUSTOMER'?'Select a provider before the response window closes.':waiting?'We are notifying more matching providers now.':count>0?'Matching providers are being notified now. You can select a provider as soon as you are ready.':'We are notifying matching providers now. You’ll be notified as soon as one responds.';
 if(['EXHAUSTED','CUSTOMER_TIMEOUT','CANCELLED','NOT_REQUIRED','SECURED'].includes(String(state)))return null;
 return <aside className="dispatchLive" aria-label="Live Dispatch" aria-live="polite">
  <div className="dispatchLiveIcon" aria-hidden="true">📣</div>
  <div className="dispatchLiveBody"><span className="dispatchLiveEyebrow">Live provider broadcast</span><strong>{title}</strong><small>{subtitle}</small>{note?<small className="dispatchLiveNote">{note}</small>:null}<div className="dispatchLiveTimer"><span>Responding in</span><b>{timerValue}</b></div></div>
  <div className="dispatchLiveActions">{canWait?<button type="button" onClick={()=>void waitMore()} disabled={busy}>{busy?'Updating…':'Wait for More'}</button>:null}{waiting?<button type="button" disabled>Waiting for More</button>:null}{count>0?<button className="primary" type="button" onClick={()=>document.querySelector('.providerGrid')?.scrollIntoView({behavior:'smooth',block:'center'})}>Select Now</button>:null}</div>
 </aside>;
}
