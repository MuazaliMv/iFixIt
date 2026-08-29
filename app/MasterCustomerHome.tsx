'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const[loadError,setLoadError]=useState('');
  const[reloadKey,setReloadKey]=useState(0);

  useEffect(()=>{let live=true;void(async()=>{
    setReady(false);
    setLoadError('');
    try{
      const[profileResult,serviceResult]=await Promise.allSettled([getJson('/api/user/profile'),getJson('/api/services/catalog')]);
      if(!live)return;

      if(profileResult.status==='fulfilled')setProfile(profileResult.value?.profile||null);
      if(serviceResult.status==='fulfilled')setServices(serviceResult.value?.services||[]);

      const errors=[profileResult,serviceResult]
        .filter((result):result is PromiseRejectedResult=>result.status==='rejected')
        .map(result=>result.reason instanceof Error?result.reason.message:'Unable to load customer workspace.')
        .filter(message=>message!=='Authentication required.');
      if(errors.length)setLoadError(errors[0]);

      try{const raw=localStorage.getItem('fixit:last-request');if(raw)setLastRequest(JSON.parse(raw));}catch{}
    }finally{if(live)setReady(true);}
  })();return()=>{live=false;};},[reloadKey]);

  const firstName=(profile?.full_name||'there').split(' ')[0];
  const start=()=>window.location.assign('/home?new=1');
  const retry=useCallback(()=>setReloadKey(value=>value+1),[]);

  if(!ready)return <div className="masterHome masterHomeLoading" aria-busy="true" aria-label="Loading customer workspace"/>;

  return <div className="masterHome">
    <header className="masterTopbar">
      <div>
        <span className="masterEyebrow">FIXIT MALDIVES</span>
        <h1>Hi {firstName}</h1>
      </div>
      <button className="masterAvatar" onClick={()=>window.location.assign('/profile')} aria-label="Profile">{(profile?.full_name||profile?.role||'U').slice(0,2).toUpperCase()}</button>
    </header>

    {loadError?<section className="masterRequestCard" role="alert">
      <div><span>Connection issue</span><h3>Some home information could not be loaded</h3><p>{loadError}</p></div>
      <button className="masterPrimary" onClick={retry}>Try again</button>
    </section>:null}

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
      {services.length?<div className="masterServiceGrid">
        {services.slice(0,8).map(service=><button key={service.id} className="masterServiceCard" onClick={start}>
          <div className="masterServiceIcon"><ServiceIcon name={service.name}/></div>
          <strong>{service.name}</strong>
          <span>Request service</span>
        </button>)}
      </div>:<div className="masterRequestCard">
        <div><span>Services</span><h3>No services are available right now</h3><p>You can retry loading the catalogue or continue to the request flow.</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={retry}>Retry</button><button className="masterPrimary" onClick={start}>Continue</button></div>
      </div>}
    </section>

    <section className="masterQuickGrid">
      <button onClick={()=>window.location.assign('/requests')}><span>Requests</span><strong>Track your jobs</strong></button>
      <button onClick={()=>window.location.assign('/profile')}><span>Account</span><strong>Profile & settings</strong></button>
    </section>

    {lastRequest?.id?<section className="masterRequestCard" onClick={()=>window.location.assign(`/requests/${encodeURIComponent(String(lastRequest.id))}`)} role="link" tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')window.location.assign(`/requests/${encodeURIComponent(String(lastRequest.id))}`)}}>
      <div><span>Latest request</span><h3>{lastRequest.service||'Service request'}</h3><p>{lastRequest.location||'Open request details'}</p></div>
      <div className="masterStatus">{String(lastRequest.status||'NEW').replaceAll('_',' ')}</div>
    </section>:null}
  </div>;
}
