'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const DISPATCH_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/dispatch-control';
type DispatchState='SEARCHING'|'EXTENDED'|'AWAITING_CUSTOMER'|'SECURED'|'EXHAUSTED'|'CUSTOMER_TIMEOUT'|'CANCELLED'|'NOT_REQUIRED';
type Row={ticket_number:string;status:string;dispatch_state?:DispatchState|null;dispatch_initial_deadline_at?:string|null;dispatch_extension_deadline_at?:string|null;dispatch_customer_response_deadline_at?:string|null;available_provider_count?:number;assigned_provider_user_id?:string|null};

function deadline(row:Row){
 if(row.dispatch_state==='AWAITING_CUSTOMER')return row.dispatch_customer_response_deadline_at||null;
 if(row.dispatch_state==='EXTENDED')return row.dispatch_extension_deadline_at||null;
 if(row.dispatch_state==='SEARCHING')return row.dispatch_initial_deadline_at||null;
 return null;
}
function remaining(value:string,now:number){
 const end=new Date(value).getTime();
 if(!Number.isFinite(end)||end<=now)return null;
 const seconds=Math.max(0,Math.floor((end-now)/1000));
 const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
 return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function GlobalRunningTimer(){
 const path=usePathname();
 const[now,setNow]=useState(()=>Date.now());
 const[rows,setRows]=useState<Row[]>([]);
 const refresh=useCallback(async()=>{
  try{
   const{data}=await supabase.auth.getSession();
   if(!data.session){setRows([]);return;}
   const response=await fetch(DISPATCH_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'status'})});
   if(!response.ok){setRows([]);return;}
   const payload=await response.json();
   setRows(Array.isArray(payload?.requests)?payload.requests:[]);
  }catch{setRows([]);}
 },[]);
 useEffect(()=>{void refresh();const poll=window.setInterval(()=>void refresh(),15000);return()=>window.clearInterval(poll);},[refresh,path]);
 useEffect(()=>{const tick=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(tick);},[]);
 const active=useMemo(()=>rows
  .filter(r=>!r.assigned_provider_user_id&&['PENDING','RESPONDED'].includes(String(r.status))&&['SEARCHING','EXTENDED','AWAITING_CUSTOMER'].includes(String(r.dispatch_state)))
  .map(r=>({row:r,end:deadline(r)}))
  .filter((x):x is {row:Row;end:string}=>Boolean(x.end)&&new Date(x.end as string).getTime()>now)
  .sort((a,b)=>new Date(a.end).getTime()-new Date(b.end).getTime()),[rows,now]);
 if(!active.length)return null;
 const current=active[0];const time=remaining(current.end,now);if(!time)return null;
 const count=Math.min(5,current.row.available_provider_count||0);
 const label=current.row.dispatch_state==='AWAITING_CUSTOMER'?'Provider selection time remaining':'Provider search time remaining';
 const detailPath=`/requests/${encodeURIComponent(current.row.ticket_number)}`;
 return <div className="globalRunningTimer" role="status" aria-live="polite">
  <button type="button" onClick={()=>{if(path!==detailPath)window.location.href=detailPath;}} aria-label={`${label}: ${time}. Open request ${current.row.ticket_number}`}>
   <span className="globalRunningTimerDot"/><span className="globalRunningTimerText"><small>{label}</small><strong>{time}</strong></span>{count>0?<span className="globalRunningTimerMeta">{count}/5 providers</span>:null}<span className="globalRunningTimerOpen">Open</span>
  </button>
  <style jsx global>{`
   .globalRunningTimer{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:85;width:min(94vw,620px);pointer-events:none}
   .globalRunningTimer>button{pointer-events:auto;width:100%;min-height:58px;border:1px solid #bfdbfe;border-radius:18px;background:rgba(239,246,255,.97);box-shadow:0 12px 30px rgba(37,99,235,.16);backdrop-filter:blur(14px);display:flex;align-items:center;gap:12px;padding:9px 12px;color:#0f172a;text-align:left}
   .globalRunningTimerDot{width:10px;height:10px;border-radius:50%;background:#2563eb;box-shadow:0 0 0 5px rgba(37,99,235,.12);flex:0 0 auto}
   .globalRunningTimerText{display:grid;gap:1px;min-width:0;flex:1}.globalRunningTimerText small{font-size:11px;color:#64748b;font-weight:750}.globalRunningTimerText strong{font-size:19px;line-height:1;font-variant-numeric:tabular-nums;color:#1d4ed8}
   .globalRunningTimerMeta{font-size:11px;color:#475569;font-weight:700;white-space:nowrap}.globalRunningTimerOpen{padding:7px 10px;border-radius:10px;background:#2563eb;color:#fff;font-size:12px;font-weight:800}
   @media(max-width:520px){.globalRunningTimer{top:70px;width:calc(100vw - 20px)}.globalRunningTimer>button{min-height:54px;border-radius:15px;padding:8px 10px;gap:9px}.globalRunningTimerMeta{display:none}.globalRunningTimerText strong{font-size:18px}}
  `}</style>
 </div>;
}
