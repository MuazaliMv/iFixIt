'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useProviderMode } from '../useProviderMode';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';

type Category={id:string;name:string};
type Atoll={id:string;code:string;display_name:string};
type Island={id:string;atoll_id:string;display_name:string};
type Unit={id:string;island_id:string;display_name:string};
type Area={islandId:string;locationUnitId:string|null;islandName:string;locationUnitName?:string|null};

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
function areaKey(a:{islandId:string;locationUnitId?:string|null}){return `${a.islandId}:${a.locationUnitId||''}`;}
function sameAreas(a:Area[],b:Area[]){
 if(a.length!==b.length)return false;
 const aa=a.map(areaKey).sort();
 const bb=b.map(areaKey).sort();
 return aa.every((id,index)=>id===bb[index]);
}

export default function ProviderServicesPage(){
 const mode=useProviderMode(true);
 const[selected,setSelected]=useState<string[]>([]);
 const[savedSelected,setSavedSelected]=useState<string[]>([]);
 const[atolls,setAtolls]=useState<Atoll[]>([]);
 const[islands,setIslands]=useState<Island[]>([]);
 const[units,setUnits]=useState<Unit[]>([]);
 const[areas,setAreas]=useState<Area[]>([]);
 const[savedAreas,setSavedAreas]=useState<Area[]>([]);
 const[atollId,setAtollId]=useState('');
 const[islandId,setIslandId]=useState('');
 const[unitId,setUnitId]=useState('');
 const[locationsLoading,setLocationsLoading]=useState(true);
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');

 useEffect(()=>{
  if(mode.ready){
   setSelected(mode.selectedCategoryIds);
   setSavedSelected(mode.selectedCategoryIds);
   const current=(mode.serviceAreas||[]).map((a:any)=>({
    islandId:a.islandId,
    locationUnitId:a.locationUnitId||null,
    islandName:a.islandName||'Selected island',
    locationUnitName:a.locationUnitName||null,
   }));
   setAreas(current);
   setSavedAreas(current);
  }
 },[mode.ready,mode.selectedCategoryIds,mode.serviceAreas]);

 useEffect(()=>{void loadLocations();},[]);

 const islandOptions=useMemo(()=>islands.filter(i=>i.atoll_id===atollId),[islands,atollId]);
 const unitOptions=useMemo(()=>units.filter(u=>u.island_id===islandId),[units,islandId]);
 const hasChanges=!sameSelection(selected,savedSelected)||!sameAreas(areas,savedAreas);

 async function loadLocations(){
  setLocationsLoading(true);
  try{
   const{data}=await supabase.auth.getSession();
   if(!data.session)throw new Error('Sign in required');
   const r=await fetch(LOCATION_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:'{}'});
   const p=await r.json();
   if(!r.ok)throw new Error(p?.error||'Unable to load service locations');
   setAtolls(p.atolls||[]);
   setIslands(p.islands||[]);
   setUnits(p.locationUnits||[]);
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load service locations.');}
  finally{setLocationsLoading(false);}
 }

 function addArea(){
  const island=islands.find(i=>i.id===islandId);
  if(!island){setMessage('Choose an island or city first.');return;}
  const unit=units.find(u=>u.id===unitId);
  const next:Area={islandId,locationUnitId:unitId||null,islandName:island.display_name,locationUnitName:unit?.display_name||null};
  if(areas.some(a=>areaKey(a)===areaKey(next))){setMessage('That service location is already added.');return;}
  setAreas(v=>[...v,next]);
  setUnitId('');
  setMessage('Service location added. Save changes to apply it.');
 }

 async function save(){
  if(!hasChanges||busy)return;
  setBusy(true);setMessage('');
  try{
   const{data}=await supabase.auth.getSession();
   if(!data.session)throw new Error('Sign in required');
   if(!selected.length)throw new Error('Keep at least one active service.');
   if(!areas.length)throw new Error('Keep at least one service location.');
   const p=mode.profile||{};
   const hours=(mode.hours||[]).map((h:any)=>({dayOfWeek:Number(h.day_of_week),isWorking:Boolean(h.is_working),startTime:h.start_time?String(h.start_time).slice(0,5):'',endTime:h.end_time?String(h.end_time).slice(0,5):''}));
   const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'save',providerType:p.provider_type||'INDIVIDUAL',publicName:p.public_name||mode.name,businessName:p.business_name||'',description:p.description||'',experienceYears:Number(p.experience_years||0),availabilityStatus:p.availability_status||'BY_APPOINTMENT',categoryIds:selected,hours,serviceAreas:areas.map(a=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null}))})});
   const out=await r.json();
   if(!r.ok)throw new Error(out?.error||'Unable to save services and locations');
   setSavedSelected(selected);
   setSavedAreas(areas);
   await mode.reload();
   setMessage('Services and service locations saved.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save services and locations.');}
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
     <p>Choose the services you offer and the locations where they are available.</p>
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

   <section className="providerServicesSection" aria-labelledby="service-locations-title">
    <div className="providerServicesSectionHead">
     <div><h2 id="service-locations-title">Service locations</h2><p>Where customers can request your services.</p></div>
     <span>{areas.length} selected</span>
    </div>

    <div className="providerSetupForm">
     <label>Atoll
      <select value={atollId} disabled={locationsLoading||!atolls.length} onChange={e=>{setAtollId(e.target.value);setIslandId('');setUnitId('');}}>
       <option value="">{locationsLoading?'Loading atolls…':atolls.length?'Select atoll':'No atolls available'}</option>
       {atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}
      </select>
     </label>
     <label>Island / City
      <select value={islandId} disabled={!atollId||!islandOptions.length} onChange={e=>{setIslandId(e.target.value);setUnitId('');}}>
       <option value="">{!atollId?'Select atoll first':islandOptions.length?'Select island / city':'No islands available'}</option>
       {islandOptions.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}
      </select>
     </label>
     {unitOptions.length?<label>Ward / Area
      <select value={unitId} onChange={e=>setUnitId(e.target.value)}>
       <option value="">Whole island</option>
       {unitOptions.map(u=><option key={u.id} value={u.id}>{u.display_name}</option>)}
      </select>
     </label>:null}
     <button className="secondary" type="button" disabled={!islandId} onClick={addArea}>Add location</button>
    </div>

    <div className="providerAreaChips">
     {areas.map((a,i)=><button type="button" key={areaKey(a)} onClick={()=>setAreas(v=>v.filter((_,n)=>n!==i))}>{a.islandName}{a.locationUnitName?` · ${a.locationUnitName}`:' · Whole island'} ×</button>)}
    </div>
   </section>

   {message?<p className="providerServicesMessage" role="alert">{message}</p>:null}
  </div>

  <div className="providerServicesBottomBar">
   <div className="providerServicesBottomInner">
    <button className="providerServicesSaveButton" style={{width:'100%',gridColumn:'1 / -1'}} disabled={busy||!hasChanges} onClick={()=>void save()}><span aria-hidden="true">▣</span>{busy?'Saving…':'Save services & locations'}</button>
   </div>
  </div>
 </main>;
}
