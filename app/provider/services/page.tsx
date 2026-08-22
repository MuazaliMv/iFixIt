'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';
import { useProviderMode } from '../useProviderMode';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';

type Category={id:string;name:string};
export default function ProviderServicesPage(){
 const mode=useProviderMode(true);const[selected,setSelected]=useState<string[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 useEffect(()=>{if(mode.ready)setSelected(mode.selectedCategoryIds);},[mode.ready,mode.selectedCategoryIds]);
 async function save(){setBusy(true);try{const{data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in required');if(!selected.length)throw new Error('Keep at least one active service.');const p=mode.profile||{};const hours=(mode.hours||[]).map((h:any)=>({dayOfWeek:Number(h.day_of_week),isWorking:Boolean(h.is_working),startTime:h.start_time?String(h.start_time).slice(0,5):'',endTime:h.end_time?String(h.end_time).slice(0,5):''}));const r=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'save',providerType:p.provider_type||'INDIVIDUAL',publicName:p.public_name||mode.name,businessName:p.business_name||'',description:p.description||'',experienceYears:Number(p.experience_years||0),availabilityStatus:p.availability_status||'BY_APPOINTMENT',categoryIds:selected,hours,serviceAreas:mode.serviceAreas.map((a:any)=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null}))})});const out=await r.json();if(!r.ok)throw new Error(out?.error||'Unable to save services');setMessage('Services updated.');await mode.reload();}catch(e){setMessage(e instanceof Error?e.message:'Unable to save services.');}finally{setBusy(false);}}
 if(mode.loading)return <main className="providerModePage"><div className="providerModeShell"><div className="providerModeCard">Loading services…</div></div></main>;
 const categories:Category[]=mode.categories;
 return <main className="providerModePage"><div className="providerModeShell"><header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider</span><h1>Services</h1><p>Choose the services you want FixIt to match with customer requests.</p></div><AppModeSwitch mode="provider" compact/></header><section className="providerModeCard"><div className="providerSectionHead"><div><h2>Active services</h2><p>This is the single place to manage the categories you offer.</p></div><span className="modeBadge provider">{selected.length} active</span></div><div className="providerSetupChoices">{categories.map(c=><button type="button" key={c.id} className={selected.includes(c.id)?'selected':''} onClick={()=>setSelected(v=>v.includes(c.id)?v.filter(x=>x!==c.id):[...v,c.id])}>{c.name}</button>)}</div><div className="providerSetupActions"><a className="secondary" href="/provider/menu">Back to Menu</a><button className="primary" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save services'}</button></div>{message?<p className="muted" role="status">{message}</p>:null}</section></div></main>;
}
