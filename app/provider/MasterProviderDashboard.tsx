'use client';

import { useEffect, useMemo, useState } from 'react';
import AppModeSwitch from '../AppModeSwitch';
import { useProviderMode } from './useProviderMode';

const OFFERS_URL='/api/legacy-edge?service=provider-offers';
const MARKET_URL='/api/legacy-edge?service=provider-marketplace';

type Offer={id:string;request?:{ticket_number?:string;service_name?:string;service_location_text?:string}|null};
type Job={ticket_number:string;service_name:string;service_location_text:string;status:string};

async function post(url:string,body:Record<string,unknown>){
 const response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));
 if(response.status===401){window.location.replace('/login?next=%2Fprovider');throw new Error('Authentication required.');}
 if(!response.ok)throw new Error(payload?.error||'Unable to load provider workspace.');
 return payload;
}

export default function MasterProviderDashboard(){
 const mode=useProviderMode(true);
 const[offers,setOffers]=useState<Offer[]>([]);
 const[jobs,setJobs]=useState<Job[]>([]);
 const[message,setMessage]=useState('Loading provider workspace…');
 const[busy,setBusy]=useState(true);

 useEffect(()=>{if(mode.ready)void load();},[mode.ready]);
 async function load(){setBusy(true);try{const[o,m]=await Promise.all([post(OFFERS_URL,{action:'list'}),post(MARKET_URL,{action:'dashboard'})]);setOffers(o.offers||[]);setJobs(m.requests||[]);setMessage('');}catch(e){if(!(e instanceof Error&&e.message==='Authentication required.'))setMessage(e instanceof Error?e.message:'Unable to load provider workspace.');}finally{setBusy(false);}}

 const active=useMemo(()=>jobs.filter(j=>['ACCEPTED','PROCESSING','IN_PROGRESS','INSPECTION_SCHEDULED'].includes(String(j.status).toUpperCase())),[jobs]);
 const completed=useMemo(()=>jobs.filter(j=>String(j.status).toUpperCase()==='COMPLETED'),[jobs]);
 const next=active[0]||null;
 if(mode.loading)return <main className="masterRolePage"><div className="masterRoleShell"><div className="masterRoleCard">Checking provider access…</div></div></main>;

 return <main className="masterRolePage masterProviderPage"><div className="masterRoleShell">
  <header className="masterRoleTop"><div><span className="masterRoleEyebrow">PROVIDER WORKSPACE</span><h1>Service Provider</h1><p>Manage new requests, active work and availability from one place.</p></div><AppModeSwitch mode="provider" compact/></header>
  {message?<div className="masterRoleNotice" role="status">{message}</div>:null}
  <section className="masterRoleHero providerHero"><div><span>READY FOR WORK</span><h2>{offers.length?`${offers.length} new request${offers.length===1?'':'s'} waiting`:'Your provider workspace is ready'}</h2><p>Accepting a request assigns it to you immediately. Customer confirmation is not required.</p></div><a className="masterRolePrimary" href="/provider/jobs?tab=new">View new requests</a></section>
  <section className="masterMetricGrid"><a href="/provider/jobs?tab=new"><span>New requests</span><strong>{offers.length}</strong><small>Eligible offers</small></a><a href="/provider/jobs?tab=active"><span>Active jobs</span><strong>{active.length}</strong><small>Accepted & processing</small></a><a href="/provider/jobs?tab=completed"><span>Completed</span><strong>{completed.length}</strong><small>Finished work</small></a></section>
  <section className="masterRoleSection"><div className="masterRoleSectionHead"><div><span>OPERATIONS</span><h2>Provider tools</h2></div></div><div className="masterActionGrid"><a href="/provider/jobs"><b>Customer Work</b><span>New, active and completed jobs</span></a><a href="/provider/location"><b>Location & Availability</b><span>Manage service coverage and availability</span></a><a href="/provider/messages"><b>Messages</b><span>Conversations for assigned jobs</span></a><a href="/profile"><b>Provider Profile</b><span>Account and onboarding information</span></a></div></section>
  {next?<section className="masterRoleCard masterNextJob"><div><span>NEXT ACTIVE JOB</span><h2>{next.service_name}</h2><p>{next.service_location_text}</p></div><a className="masterRoleSecondary" href={`/provider/jobs/${encodeURIComponent(next.ticket_number)}`}>Open job</a></section>:null}
  <p className="masterRoleMuted">{busy?'Refreshing provider data…':''}</p>
 </div></main>;
}
