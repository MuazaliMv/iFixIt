'use client';

import { useEffect, useState } from 'react';
import ServiceIcon from './components/customer/ServiceIcon';
import './master-customer-home.css';

type Profile={full_name?:string|null;role?:string|null};
type Service={id:string;code:string;name:string};
type LastRequest={id?:string;service?:string;location?:string;status?:string};

async function getJson(url:string){
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){window.location.replace('/login?next=%2Fhome');throw new Error('Authentication required.');}
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload?.error||'Unable to load.');
  return payload;
}

export default function MasterCustomerHome(){
  const[profile,setProfile]=useState<Profile|null>(null);
  const[services,setServices]=useState<Service[]>([]);
  const[lastRequest,setLastRequest]=useState<LastRequest|null>(null);
  const[ready,setReady]=useState(false);

  useEffect(()=>{let live=true;void(async()=>{
    try{
      const[profilePayload,servicePayload]=await Promise.all([getJson('/api/user/profile'),getJson('/api/services/catalog')]);
      if(!live)return;
      setProfile(profilePayload?.profile||null);
      setServices(servicePayload?.services||[]);
      try{const raw=localStorage.getItem('fixit:last-request');if(raw)setLastRequest(JSON.parse(raw));}catch{}
    }finally{if(live)setReady(true);}
  })();return()=>{live=false;};},[]);

  const firstName=(profile?.full_name||'there').split(' ')[0];
  const start=()=>window.location.assign('/home?new=1');

  if(!ready)return <div className="masterHome masterHomeLoading" aria-busy="true"/>;

  return <div className="masterHome">
    <header className="masterTopbar">
      <div>
        <span className="masterEyebrow">FIXIT MALDIVES</span>
        <h1>Hi {firstName}</h1>
      </div>
      <button className="masterAvatar" onClick={()=>window.location.assign('/profile')} aria-label="Profile">{(profile?.full_name||profile?.role||'U').slice(0,2).toUpperCase()}</button>
    </header>

    <section className="masterHero">
      <div>
        <span className="masterHeroLabel">VERIFIED EXPERT NETWORK</span>
        <h2>What needs fixing today?</h2>
        <p>Choose a service and send your request in a few simple steps.</p>
      </div>
      <button className="masterPrimary" onClick={start}>Request a Service</button>
    </section>

    <section className="masterSection">
      <div className="masterSectionTitle">
        <div><span>Services</span><h3>Choose a service</h3></div>
        <button onClick={start}>View all</button>
      </div>
      <div className="masterServiceGrid">
        {services.slice(0,8).map(service=><button key={service.id} className="masterServiceCard" onClick={start}>
          <div className="masterServiceIcon"><ServiceIcon name={service.name}/></div>
          <strong>{service.name}</strong>
          <span>Request service</span>
        </button>)}
      </div>
    </section>

    <section className="masterQuickGrid">
      <button onClick={()=>window.location.assign('/requests')}><span>Requests</span><strong>Track your jobs</strong></button>
      <button onClick={()=>window.location.assign('/profile')}><span>Account</span><strong>Profile & settings</strong></button>
    </section>

    {lastRequest?.id?<section className="masterRequestCard" onClick={()=>window.location.assign(`/requests/${encodeURIComponent(String(lastRequest.id))}`)}>
      <div><span>Latest request</span><h3>{lastRequest.service||'Service request'}</h3><p>{lastRequest.location||'Open request details'}</p></div>
      <div className="masterStatus">{String(lastRequest.status||'NEW').replaceAll('_',' ')}</div>
    </section>:null}
  </div>;
}
