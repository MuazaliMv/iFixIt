'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

const MARKET_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-marketplace';
type Completion={final_amount:number|string;currency:string;status:string;payment_note:string};type Job={id:string;ticket_number:string;service_name:string;service_location_text:string;status:string;completed_at?:string|null;completion?:Completion|null};
function money(v:number,currency='MVR'){return`${currency} ${v.toFixed(2)}`;}
export default function ProviderEarningsPage(){
 const mode=useProviderMode(true);const[jobs,setJobs]=useState<Job[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading completed jobs…');
 useEffect(()=>{if(mode.ready)void load();},[mode.ready]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function load(){setBusy(true);try{const t=await token();if(!t)return;const r=await fetch(MARKET_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'dashboard'})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load provider jobs');setJobs((p.requests||[]).filter((j:Job)=>j.status==='COMPLETED'));setMessage('Completed-job values recorded in FixIt. Your payout setup is managed from Provider Setup.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load completed jobs.');}finally{setBusy(false);}}
 const totals=useMemo(()=>{const withSummary=jobs.filter(j=>j.completion);const total=withSummary.reduce((sum,j)=>sum+Number(j.completion?.final_amount||0),0);const confirmed=withSummary.filter(j=>j.completion?.status==='CONFIRMED').reduce((sum,j)=>sum+Number(j.completion?.final_amount||0),0);return{total,confirmed,count:withSummary.length};},[jobs]);
 if(mode.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Checking provider access…</div></div></main>;
 return <main className="providerModePage"><div className="providerModeShell"><header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Earnings</h1><p>Completed job values and payout setup.</p></div><AppModeSwitch mode="provider" compact/></header>
 <section className="providerModeStats"><div className="providerStat"><span>Recorded value</span><strong>{money(totals.total)}</strong></div><div className="providerStat"><span>Customer confirmed</span><strong>{money(totals.confirmed)}</strong></div><div className="providerStat"><span>Completed summaries</span><strong>{totals.count}</strong></div><div className="providerStat"><span>Payout setup</span><strong><a href="/provider/setup?edit=payout">Manage</a></strong></div></section>
 <section className="providerModeCard"><div className="providerSectionHead"><div><h2>Completed jobs</h2><p>{message}</p></div><button className="secondary" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'Refresh'}</button></div>{jobs.length?<div className="providerList">{jobs.map(j=><div className="providerListItem" key={j.id}><div><h3>{j.service_name}</h3><p>{j.ticket_number} · {j.service_location_text}{j.completed_at?` · ${new Date(j.completed_at).toLocaleDateString()}`:''}</p></div><strong>{j.completion?money(Number(j.completion.final_amount||0),j.completion.currency):'—'}</strong></div>)}</div>:<div className="providerEmptyState"><h3>No completed jobs yet</h3><p>Completed job values will appear here.</p></div>}</section></div></main>;
}
