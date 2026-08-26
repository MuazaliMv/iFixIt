'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import './timeline.css';

const TIMELINE_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-timeline';

type TimelineEvent={event_id:string;event_type:string;title:string;detail?:string|null;actor_role:string;occurred_at:string;source:string;metadata?:Record<string,unknown>|null};

function when(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});}
function icon(type:string){if(type.includes('COMPLET')||type==='RATING_SUBMITTED')return'✓';if(type.includes('TIMEOUT')||type.includes('EXHAUSTED')||type.includes('ISSUE'))return'!';return'•';}
function customerCopy(event:TimelineEvent){
  switch(event.event_type){
    case 'REQUEST_CREATED': return {title:'Request submitted',detail:'Your service request was received.'};
    case 'DISPATCH_STARTED': return {title:'Provider search started',detail:'We started looking for an available service provider.'};
    case 'DISPATCH_EXTENDED': return {title:'Search expanded',detail:'We expanded the provider search automatically.'};
    case 'DISPATCH_EXHAUSTED': return {title:'No provider available',detail:'The provider search finished without an available provider.'};
    case 'DISPATCH_SECURED': return {title:'Provider assigned',detail:event.detail||'A service provider has been assigned.'};
    case 'PROVIDER_SELECTED': return {title:'Provider accepted',detail:event.detail||'A provider accepted your request.'};
    case 'CUSTOMER_RESPONSE_TIMEOUT': return {title:'Response window ended',detail:'The provider-selection response window ended.'};
    default: return {title:event.title,detail:event.detail||''};
  }
}

export default function RequestTimelinePanel(){
  const params=useParams<{ticket:string}>();
  const ticket=decodeURIComponent(String(params.ticket||'')).toUpperCase();
  const[events,setEvents]=useState<TimelineEvent[]>([]);
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

  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(id);},[ticket]);
  const visibleEvents=useMemo(()=>[...events].reverse(),[events]);

  return <details className="screenCard requestActivityInline">
    <summary className="activitySummary" aria-label="Show request activity">
      <div><strong>Activity</strong><span>{loading&&!events.length?'Loading updates…':events.length?`${events.length} update${events.length===1?'':'s'}`:'No updates yet'}</span></div>
      <span className="activitySummaryAction">View</span>
    </summary>
    {error?<p className="timelineError">{error}</p>:null}
    <div className="timelineList">
      {visibleEvents.map((event,index)=>{const copy=customerCopy(event);return <article className="timelineItem" key={event.event_id}>
        <div className="timelineRail"><div className="timelineIcon">{icon(event.event_type)}</div>{index<visibleEvents.length-1?<i/>:null}</div>
        <div className="timelineBody"><div className="timelineTitle"><strong>{copy.title}</strong><span>{when(event.occurred_at)}</span></div>{copy.detail?<p>{copy.detail}</p>:null}</div>
      </article>;})}
      {loading&&!events.length?<div className="timelineEmpty">Loading activity…</div>:null}
      {!loading&&!events.length?<div className="timelineEmpty">No activity has been recorded yet.</div>:null}
    </div>
  </details>;
}
