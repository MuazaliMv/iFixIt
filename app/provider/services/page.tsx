'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useProviderMode } from '../useProviderMode';
import './service-locations.css';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';
const PAGE_SIZE=10;
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

type Category={id:string;name:string};
type Atoll={id:string;code:string;display_name:string};
type Island={id:string;atoll_id:string;display_name:string};
type Unit={id:string;island_id:string;display_name:string};
type Area={islandId:string;locationUnitId:string|null;islandName:string;locationUnitName?:string|null};
type Hour={dayOfWeek:number;isWorking:boolean;startTime:string;endTime:string};

const SERVICE_ICONS:Record<string,string>={
 'AC Services':'❄','Plumbing':'⌁','Electrical':'ϟ','Carpentry':'⌁','Painting':'▰',
 'Appliance Installation & Repair':'⚒','CCTV / Networking / Wi-Fi':'⌁','Door & Lock Services':'▣',
 'Aluminium & Glass':'▦','Furniture Assembly':'▤','Water Pump & Tank Maintenance':'◫',
 'General Handyman':'⚒','Cleaning':'✦','Moving & Loading':'▰','Small Renovation':'⌂',
};

function sameSelection(a:string[],b:string[]){if(a.length!==b.length)return false;const aa=[...a].sort();const bb=[...b].sort();return aa.every((id,index)=>id===bb[index]);}
function areaKey(a:{islandId:string;locationUnitId?:string|null}){return `${a.islandId}:${a.locationUnitId||''}`;}
function sameAreas(a:Area[],b:Area[]){if(a.length!==b.length)return false;const aa=a.map(areaKey).sort();const bb=b.map(areaKey).sort();return aa.every((id,index)=>id===bb[index]);}
function sameHours(a:Hour[],b:Hour[]){return JSON.stringify(a)===JSON.stringify(b);}

export default function ProviderServicesPage(){
 const mode=useProviderMode(true);
 const[selected,setSelected]=useState<string[]>([]);
 const[savedSelected,setSavedSelected]=useState<string[]>([]);
 const[atolls,setAtolls]=useState<Atoll[]>([]);
 const[islands,setIslands]=useState<Island[]>([]);
 const[units,setUnits]=useState<Unit[]>([]);
 const[areas,setAreas]=useState<Area[]>([]);
 const[savedAreas,setSavedAreas]=useState<Area[]>([]);
 const[availability,setAvailability]=useState('BY_APPOINTMENT');
 const[savedAvailability,setSavedAvailability]=useState('BY_APPOINTMENT');
 const[hours,setHours]=useState<Hour[]>([]);
 const[savedHours,setSavedHours]=useState<Hour[]>([]);
 const[atollId,setAtollId]=useState('');
 const[islandId,setIslandId]=useState('');
 const[unitId,setUnitId]=useState('');
 const[locationQuery,setLocationQuery]=useState('');
 const[locationPage,setLocationPage]=useState(1);
 const[openLocationKey,setOpenLocationKey]=useState<string|null>(null);
 const[locationsLoading,setLocationsLoading]=useState(true);
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');

 useEffect(()=>{
  if(mode.ready){
   setSelected(mode.selectedCategoryIds);setSavedSelected(mode.selectedCategoryIds);
   const current=(mode.serviceAreas||[]).map((a:any)=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null,islandName:a.islandName||'Selected island',locationUnitName:a.locationUnitName||null}));
   setAreas(current);setSavedAreas(current);
   const currentAvailability=mode.profile?.availability_status||'BY_APPOINTMENT';
   setAvailability(currentAvailability);setSavedAvailability(currentAvailability);
   const currentHours=days.map((_,i)=>{const h=mode.hours.find((x:any)=>Number(x.day_of_week)===i+1);return{dayOfWeek:i+1,isWorking:Boolean(h?.is_working),startTime:String(h?.start_time||'08:00').slice(0,5),endTime:String(h?.end_time||'17:00').slice(0,5)}});
   setHours(currentHours);setSavedHours(currentHours);
  }
 },[mode.ready,mode.selectedCategoryIds,mode.serviceAreas,mode.hours,mode.profile]);
 useEffect(()=>{void loadLocations();},[]);

 const islandOptions=useMemo(()=>islands.filter(i=>i.atoll_id===atollId),[islands,atollId]);
 const unitOptions=useMemo(()=>units.filter(u=>u.island_id===islandId),[units,islandId]);
 const hasChanges=!sameSelection(selected,savedSelected)||!sameAreas(areas,savedAreas)||availability!==savedAvailability||!sameHours(hours,savedHours);
 const visibleAreas=useMemo(()=>{const q=locationQuery.trim().toLowerCase();return areas.filter(a=>!q||`${a.islandName} ${a.locationUnitName||'whole island'}`.toLowerCase().includes(q));},[areas,locationQuery]);
 const locationPages=Math.max(1,Math.ceil(visibleAreas.length/PAGE_SIZE));
 const pagedAreas=useMemo(()=>visibleAreas.slice((locationPage-1)*PAGE_SIZE,locationPage*PAGE_SIZE),[visibleAreas,locationPage]);
 useEffect(()=>{setLocationPage(1);setOpenLocationKey(null);},[locationQuery]);
 useEffect(()=>{if(locationPage>locationPages)setLocationPage(locationPages);},[locationPage,locationPages]);

 async function loadLocations(){setLocationsLoading(true);try{const{data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in required');const r=await fetch(LOCATION_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:'{}'});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load service locations');setAtolls(p.atolls||[]);setIslands(p.islands||[]);setUnits(p.locationUnits||[]);}catch(e){setMessage(e instanceof Error?e.message:'Unable to load service locations.');}finally{setLocationsLoading(false);}}
 function addArea(){const island=islands.find(i=>i.id===islandId);if(!island){setMessage('Choose an island or city first.');return;}const unit=units.find(u=>u.id===unitId);const next:Area={islandId,locationUnitId:unitId||null,islandName:island.display_name,locationUnitName:unit?.display_name||null};if(areas.some(a=>areaKey(a)===areaKey(next))){setMessage('That service location is already added.');return;}setAreas(v=>[next,...v]);setUnitId('');setLocationPage(1);setMessage('Service location added. Save changes to apply it.');}
 function removeArea(key:string){setAreas(v=>v.filter(a=>areaKey(a)!==key));if(openLocationKey===key)setOpenLocationKey(null);setMessage('Service location removed. Save changes to apply it.');}
 function patchHour(day:number,p:Partial<Hour>){setHours(v=>v.map(h=>h.dayOfWeek===day?{...h,...p}:h));}

 async function save(){if(!hasChanges||busy)return;setBusy(true);setMessage('');try{const{data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in required');if(!selected.length)throw new Error('Keep at least one active service.');if(!areas.length)throw new Error('Keep at least one service location.');const p=mode.profile||{};const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'save',providerType:p.provider_type||'INDIVIDUAL',publicName:p.public_name||mode.name,businessName:p.business_name||'',description:p.description||'',experienceYears:Number(p.experience_years||0),availabilityStatus:availability,categoryIds:selected,hours,serviceAreas:areas.map(a=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null}))})});const out=await r.json();if(!r.ok)throw new Error(out?.error||'Unable to save services, locations and availability');setSavedSelected(selected);setSavedAreas(areas);setSavedAvailability(availability);setSavedHours(hours);await mode.reload();setMessage('Services, locations and availability saved.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to save provider settings.');}finally{setBusy(false);}}

 if(mode.loading)return <main className="providerServicesPage"><div className="providerServicesShell"><div className="providerServicesLoading">Loading services…</div></div></main>;
 const categories:Category[]=mode.categories;
 const toggle=(id:string)=>setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);

 return <main className="providerServicesPage"><div className="providerServicesShell">
  <header className="providerServicesHeader"><a className="providerServicesBack" href="/provider/menu" aria-label="Back to menu">←</a><div className="providerServicesHeading"><h1>Services & Locations</h1><p>Manage what you offer, where you work, and when you are available.</p></div><div className="providerServicesCount"><strong>{selected.length}</strong><span>Active</span></div></header>

  <section className="providerServicesSection" aria-labelledby="active-services-title"><div className="providerServicesSectionHead"><h2 id="active-services-title">Your active services</h2><span>{selected.length} selected</span></div><div className="providerServicesGrid">{categories.map(c=>{const isSelected=selected.includes(c.id);return <button type="button" key={c.id} className={`providerServiceTile${isSelected?' selected':''}`} aria-pressed={isSelected} onClick={()=>toggle(c.id)}><span className="providerServiceIcon" aria-hidden="true">{SERVICE_ICONS[c.name]||'⚒'}</span><span className="providerServiceName">{c.name}</span><span className="providerServiceCheck" aria-hidden="true">{isSelected?'✓':''}</span></button>;})}</div></section>

  <section className="providerServicesSection providerLocationsSection" aria-labelledby="service-locations-title"><div className="providerServicesSectionHead"><div><h2 id="service-locations-title">Manage service locations</h2><p>Choose the islands, cities, wards or areas where customers can request your services.</p></div><span>{areas.length} active</span></div>
   <div className="providerLocationToolbar"><div className="providerLocationStatus"><span className="providerLocationStatusIcon">✓</span><span><b>{areas.length} service location{areas.length===1?'':'s'}</b><small>{hasChanges?'Unsaved changes are ready to save.':'All location changes are saved.'}</small></span></div><label className="providerLocationSearch">Search locations<input value={locationQuery} onChange={e=>setLocationQuery(e.target.value)} placeholder="Island, city, ward or area" /></label><div className="providerSetupForm providerLocationAddForm"><label>Atoll<select value={atollId} disabled={locationsLoading||!atolls.length} onChange={e=>{setAtollId(e.target.value);setIslandId('');setUnitId('');}}><option value="">{locationsLoading?'Loading atolls…':atolls.length?'Select atoll':'No atolls available'}</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label><label>Island / City<select value={islandId} disabled={!atollId||!islandOptions.length} onChange={e=>{setIslandId(e.target.value);setUnitId('');}}><option value="">{!atollId?'Select atoll first':islandOptions.length?'Select island / city':'No islands available'}</option>{islandOptions.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>{unitOptions.length?<label>Ward / Area<select value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">Whole island</option>{unitOptions.map(u=><option key={u.id} value={u.id}>{u.display_name}</option>)}</select></label>:null}<button className="providerLocationAddButton" type="button" disabled={!islandId} onClick={addArea}>+ Add location</button></div></div>
   <div className="providerLocationList">{pagedAreas.map(a=>{const key=areaKey(a);const isSaved=savedAreas.some(s=>areaKey(s)===key);const open=openLocationKey===key;return <div className="providerLocationCardGroup" key={key}><article className={`providerLocationCard ${isSaved?'saved':'pending'}`}><div className="providerLocationCardTop"><div><strong>{a.islandName}</strong><span>{a.locationUnitName||'Whole island'}</span></div><div style={{display:'flex',alignItems:'center',gap:8}}><span className={`providerLocationBadge ${isSaved?'saved':'pending'}`}>{isSaved?'Saved':'Pending save'}</span><button type="button" aria-label={`Remove ${a.islandName}`} title="Remove location" onClick={()=>removeArea(key)} style={{width:34,height:34,borderRadius:'50%',border:'1px solid #fecaca',background:'#fff7f7',color:'#b42318',fontSize:21,lineHeight:1,fontWeight:700,display:'grid',placeItems:'center',padding:0,cursor:'pointer',flex:'0 0 auto'}}>×</button></div></div><div className="providerLocationMeta"><span><b>Coverage</b>{a.locationUnitName?'Specific area':'Whole island'}</span><span><b>Availability</b>Customers can request active services here</span></div><div className="providerLocationActions"><button className="providerLocationOpenButton" type="button" onClick={()=>setOpenLocationKey(open?null:key)}>{open?'Close Details':'Open Location'}</button></div></article>{open?<div className="providerLocationDetail"><div><p className="providerLocationEyebrow">SERVICE LOCATION DETAIL</p><h3>{a.islandName}</h3><p>{a.locationUnitName||'Whole island coverage'}</p></div><div className="providerLocationDetailActions"><span className={`providerLocationBadge ${isSaved?'saved':'pending'}`}>{isSaved?'Active after last save':'Will activate when saved'}</span><button className="providerLocationRemoveButton" type="button" onClick={()=>removeArea(key)}>Remove location</button></div></div>:null}</div>;})}{!visibleAreas.length?<div className="providerLocationEmpty">No service locations match your search.</div>:null}</div>{visibleAreas.length>PAGE_SIZE?<div className="providerLocationPagination"><button type="button" disabled={locationPage===1} onClick={()=>setLocationPage(p=>Math.max(1,p-1))}>Previous</button><span>Page {locationPage} of {locationPages} · {visibleAreas.length} locations</span><button type="button" disabled={locationPage===locationPages} onClick={()=>setLocationPage(p=>Math.min(locationPages,p+1))}>Next</button></div>:null}
  </section>

  <section id="availability" className="providerServicesSection providerLocationsSection providerAvailabilitySection" aria-labelledby="provider-availability-title"><div className="providerServicesSectionHead"><div><h2 id="provider-availability-title">Update availability</h2><p>Set whether you can receive new requests and your normal weekly working hours.</p></div><span>{availability.replaceAll('_',' ')}</span></div><div className="providerAvailabilityStatusGrid"><label>Availability status<select value={availability} onChange={e=>setAvailability(e.target.value)}><option value="AVAILABLE_NOW">Available now</option><option value="AVAILABLE_TODAY">Available today</option><option value="BY_APPOINTMENT">By appointment</option><option value="UNAVAILABLE">Unavailable</option></select></label></div><div className="providerAvailabilityEditor">{hours.map((h,i)=><div className="providerAvailabilityRow" key={h.dayOfWeek}><label><input type="checkbox" checked={h.isWorking} onChange={e=>patchHour(h.dayOfWeek,{isWorking:e.target.checked})}/><strong>{days[i]}</strong></label><input type="time" disabled={!h.isWorking} value={h.startTime} onChange={e=>patchHour(h.dayOfWeek,{startTime:e.target.value})}/><span>to</span><input type="time" disabled={!h.isWorking} value={h.endTime} onChange={e=>patchHour(h.dayOfWeek,{endTime:e.target.value})}/></div>)}</div></section>

  {message?<p className="providerServicesMessage" role="alert">{message}</p>:null}
 </div><div className="providerServicesBottomBar"><div className="providerServicesBottomInner"><button className="providerServicesSaveButton" style={{width:'100%',gridColumn:'1 / -1'}} disabled={busy||!hasChanges} onClick={()=>void save()}><span aria-hidden="true">▣</span>{busy?'Saving…':'Save services, locations & availability'}</button></div></div></main>;
}
