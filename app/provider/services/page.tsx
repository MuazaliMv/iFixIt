'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useProviderMode } from '../useProviderMode';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';

type Category={id:string;name:string};

const SERVICE_ICONS:Record<string,string>={
 'AC Services':'❄',
 'Plumbing':'⌁',
 'Electrical':'ϟ',
 'Carpentry':'⌁',
 'Painting':'▰',
 'Appliance Installation & Repair':'⚒',
 'CCTV / Networking / Wi-Fi':'⌁',
 'Door & Lock Services':'▣',
 'Aluminium & Glass':'▦',
 'Furniture Assembly':'▤',
 'Water Pump & Tank Maintenance':'◫',
 'General Handyman':'⚒',
 'Cleaning':'✦',
 'Moving & Loading':'▰',
 'Small Renovation':'⌂',
};

function sameSelection(a:string[],b:string[]){
 if(a.length!==b.length)return false;
 const aa=[...a].sort();
 const bb=[...b].sort();
 return aa.every((id,index)=>id===bb[index]);
}

export default function ProviderServicesPage(){
 const mode=useProviderMode(true);
 const[selected,setSelected]=useState<string[]>([]);
 const[savedSelected,setSavedSelected]=useState<string[]>([]);
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');

 useEffect(()=>{
  if(mode.ready){
   setSelected(mode.selectedCategoryIds);
   setSavedSelected(mode.selectedCategoryIds);
  }
 },[mode.ready,mode.selectedCategoryIds]);

 const hasChanges=!sameSelection(selected,savedSelected);

 async function save(){
  if(!hasChanges||busy)return;
  setBusy(true);setMessage('');
  try{
   const{data}=await supabase.auth.getSession();
   if(!data.session)throw new Error('Sign in required');
   if(!selected.length)throw new Error('Keep at least one active service.');
   const p=mode.profile||{};
   const hours=(mode.hours||[]).map((h:any)=>({dayOfWeek:Number(h.day_of_week),isWorking:Boolean(h.is_working),startTime:h.start_time?String(h.start_time).slice(0,5):'',endTime:h.end_time?String(h.end_time).slice(0,5):''}));
   const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'save',providerType:p.provider_type||'INDIVIDUAL',publicName:p.public_name||mode.name,businessName:p.business_name||'',description:p.description||'',experienceYears:Number(p.experience_years||0),availabilityStatus:p.availability_status||'BY_APPOINTMENT',categoryIds:selected,hours,serviceAreas:mode.serviceAreas.map((a:any)=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null}))})});
   const out=await r.json();
   if(!r.ok)throw new Error(out?.error||'Unable to save services');
   setSavedSelected(selected);
   await mode.reload();
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save services.');}
  finally{setBusy(false);}
 }

 if(mode.loading)return <main className="providerServicesPage"><div className="providerServicesShell"><div className="providerServicesLoading">Loading services…</div></div></main>;

 const categories:Category[]=mode.categories;
 const toggle=(id:string)=>setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);

 return <main className="providerServicesPage">
  <div className="providerServicesShell">
   <header className="providerServicesHeader">
    <a className="providerServicesBack" href="/provider/menu" aria-label="Back to menu">←</a>
    <div className="providerServicesHeading">
     <h1>Manage Services</h1>
     <p>Choose and manage the services you offer.</p>
    </div>
    <div className="providerServicesCount"><strong>{selected.length}</strong><span>Active</span></div>
   </header>

   <section className="providerServicesSection" aria-labelledby="active-services-title">
    <div className="providerServicesSectionHead">
     <h2 id="active-services-title">Your active services</h2>
     <span>{selected.length} selected</span>
    </div>

    <div className="providerServicesGrid">
     {categories.map(c=>{
      const isSelected=selected.includes(c.id);
      return <button
       type="button"
       key={c.id}
       className={`providerServiceTile${isSelected?' selected':''}`}
       aria-pressed={isSelected}
       onClick={()=>toggle(c.id)}
      >
       <span className="providerServiceIcon" aria-hidden="true">{SERVICE_ICONS[c.name]||'⚒'}</span>
       <span className="providerServiceName">{c.name}</span>
       <span className="providerServiceCheck" aria-hidden="true">{isSelected?'✓':''}</span>
      </button>;
     })}
    </div>
   </section>

   {message?<p className="providerServicesMessage" role="alert">{message}</p>:null}
  </div>

  <div className="providerServicesBottomBar">
   <div className="providerServicesBottomInner">
    <button className="providerServicesSaveButton" style={{width:'100%',gridColumn:'1 / -1'}} disabled={busy||!hasChanges} onClick={()=>void save()}><span aria-hidden="true">▣</span>{busy?'Saving…':'Save services'}</button>
   </div>
  </div>
 </main>;
}
