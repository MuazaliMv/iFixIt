'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import './timeline.css';

const TIMELINE_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-timeline';

type TimelineEvent={event_id:string;event_type:string;title:string;detail?:string|null;actor_role:string;occurred_at:string;source:string;metadata?:Record<string,unknown>|null};

function when(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});}
function icon(type:string){if(type.includes('COMPLET')||type==='RATING_SUBMITTED')return'✓';if(type.includes('ESTIMATE'))return'$';if(type.includes('INSPECTION'))return'⌂';if(type.includes('PROVIDER')||type.includes('DISPATCH'))return'↗';if(type.includes('TIMEOUT')||type.includes('EXHAUSTED')||type.includes('ISSUE'))return'!';return'•';}

export default function RequestTimelinePanel(){
  const params=useParams<{ticket:string}>();
  const ticket=decodeURIComponent(String(params.ticket||'')).toUpperCase();
  const[events,setEvents]=useState<TimelineEvent[]>([]);
  const[open,setOpen]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');

  async function load(){
    if(!ticket)return;
    setLoading(true);setError('');
    try{
      const{data}=await supabase.auth.getSession();
      const jwt=data.session?.access_token;
      if(!jwt)return;
      const r=await fetch(TIMELINE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},body:JSON.stringify({ticketNumber:ticket})});
      const p=await r.json();
      if(!r.ok)throw new Error(p?.error||'Unable to load activity');
      setEvents(Array.isArray(p.timeline)?p.timeline:[]);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load activity');}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[ticket]);
  useEffect(()=>{if(!open)return;const id=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(id);},[open,ticket]);

  return <>
    <button className="timelineFab" type="button" onClick={()=>{setOpen(true);void load();}} aria-label="Open request activity">
      <span>Activity</span><b>{events.length}</b>
    </button>
    {open?<div className="timelineBackdrop" onClick={()=>setOpen(false)}>
      <aside className="timelineDrawer" onClick={e=>e.stopPropagation()} aria-label="Request activity timeline">
        <div className="timelineHeader"><div><p>{ticket}</p><h2>Request Activity</h2><span>One timeline for every stage of this job.</span></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close">×</button></div>
        <div className="timelineToolbar"><span>{events.length} event{events.length===1?'':'s'}</span><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button></div>
        {error?<p className="timelineError">{error}</p>:null}
        <div className="timelineList">
          {events.map((event,index)=><article className="timelineItem" key={event.event_id}>
            <div className="timelineRail"><div className="timelineIcon">{icon(event.event_type)}</div>{index<events.length-1?<i/>:null}</div>
            <div className="timelineBody"><div className="timelineTitle"><strong>{event.title}</strong><span>{when(event.occurred_at)}</span></div>{event.detail?<p>{event.detail}</p>:null}<small>{event.actor_role==='SYSTEM'?'FixIt':event.actor_role.charAt(0)+event.actor_role.slice(1).toLowerCase()}</small></div>
          </article>)}
          {!loading&&!events.length?<div className="timelineEmpty">No activity has been recorded yet.</div>:null}
        </div>
      </aside>
    </div>:null}
  </>;
}
