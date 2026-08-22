'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AppModeSwitch from '../../AppModeSwitch';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';
const SETUP_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-setup-data';
const DOC_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-document-upload';
type Category={id:string;code:string;name:string};
type Atoll={id:string;code:string;display_name:string};
type Island={id:string;atoll_id:string;display_name:string};
type Unit={id:string;island_id:string;display_name:string};
type Area={islandId:string;locationUnitId:string|null;islandName:string;locationUnitName?:string|null};
type ProviderType='INDIVIDUAL'|'BUSINESS';
const defaultHours=Array.from({length:7},(_,i)=>({dayOfWeek:i+1,isWorking:i<6,startTime:'08:00',endTime:'17:00'}));

export default function ProviderSetupPage(){
 const[step,setStep]=useState(1);
 const[busy,setBusy]=useState(true);
 const[message,setMessage]=useState('Loading provider setup…');
 const[categories,setCategories]=useState<Category[]>([]);
 const[selected,setSelected]=useState<string[]>([]);
 const[providerType,setProviderType]=useState<ProviderType>('INDIVIDUAL');
 const[publicName,setPublicName]=useState('');
 const[businessName,setBusinessName]=useState('');
 const[description,setDescription]=useState('');
 const[experienceYears,setExperienceYears]=useState(0);
 const[availability,setAvailability]=useState('BY_APPOINTMENT');
 const[atolls,setAtolls]=useState<Atoll[]>([]);
 const[islands,setIslands]=useState<Island[]>([]);
 const[units,setUnits]=useState<Unit[]>([]);
 const[areas,setAreas]=useState<Area[]>([]);
 const[atollId,setAtollId]=useState('');
 const[islandId,setIslandId]=useState('');
 const[unitId,setUnitId]=useState('');
 const[docs,setDocs]=useState<any[]>([]);
 const[doc,setDoc]=useState<File|null>(null);
 const[bankName,setBankName]=useState('');
 const[accountHolder,setAccountHolder]=useState('');
 const[accountNumber,setAccountNumber]=useState('');
 const[payoutSaved,setPayoutSaved]=useState(false);
 const[submitted,setSubmitted]=useState(false);
 const islandOptions=useMemo(()=>islands.filter(i=>i.atoll_id===atollId),[islands,atollId]);
 const unitOptions=useMemo(()=>units.filter(u=>u.island_id===islandId),[units,islandId]);

 useEffect(()=>{void load();},[]);

 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return'';}return data.session.access_token;}
 async function post(url:string,body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Request failed');return p;}

 async function load(){
  setBusy(true);
  try{
   const t=await token();if(!t)return;
   const locationPromise=fetch(LOCATION_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:'{}'}).then(async r=>{const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to load locations');return p;});
   const[onResult,locResult,extraResult]=await Promise.allSettled([post(ONBOARDING_URL,{action:'get'}),locationPromise,post(SETUP_URL,{action:'get'})]);
   if(locResult.status==='fulfilled'){
    const loc=locResult.value;
    setAtolls(loc.atolls||[]);setIslands(loc.islands||[]);setUnits(loc.locationUnits||[]);
    if(onResult.status==='rejected')setCategories(loc.serviceCategories||[]);
   }else setMessage(locResult.reason instanceof Error?locResult.reason.message:'Unable to load locations.');
   if(onResult.status==='fulfilled'){
    const on=onResult.value;
    setCategories(on.categories?.length?on.categories:(locResult.status==='fulfilled'?locResult.value.serviceCategories||[]:[]));
    setSelected(on.selectedCategoryIds||[]);
    setProviderType(on.profile?.provider_type==='BUSINESS'?'BUSINESS':'INDIVIDUAL');
    setPublicName(on.profile?.public_name||on.authProfile?.full_name||'');
    setBusinessName(on.profile?.business_name||'');
    setDescription(on.profile?.description||'');
    setExperienceYears(Number(on.profile?.experience_years||0));
    setAvailability(on.profile?.availability_status||'BY_APPOINTMENT');
    setAreas((on.serviceAreas||[]).map((a:any)=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null,islandName:a.islandName||'Selected island',locationUnitName:a.locationUnitName||null})));
    if(extraResult.status==='fulfilled'){
     const extra=extraResult.value;
     setDocs(extra.documents||[]);
     if(extra.payout){setBankName(extra.payout.bankName||'');setAccountHolder(extra.payout.accountHolderName||'');setPayoutSaved(true);}
    }
    if(on.profile?.onboarding_status==='APPROVED'&&on.authProfile?.provider_approved){setSubmitted(true);setStep(5);}else setMessage('Set up provider mode in a few steps.');
   }else if(locResult.status==='fulfilled'){
    const reason=onResult.reason instanceof Error?onResult.reason.message:'Provider profile is not available.';
    setMessage(`${reason} Service and location choices are still available.`);
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load provider setup.');}finally{setBusy(false);}
 }

 function toggleCategory(id:string){setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
 function addArea(){const island=islands.find(i=>i.id===islandId);if(!island){setMessage('Choose an island or city first.');return;}const unit=units.find(u=>u.id===unitId);if(areas.some(a=>a.islandId===islandId&&(a.locationUnitId||'')===(unitId||''))){setMessage('That service area is already added.');return;}setAreas(v=>[...v,{islandId,locationUnitId:unitId||null,islandName:island.display_name,locationUnitName:unit?.display_name||null}]);setUnitId('');setMessage('Service area added.');}
 async function saveCore(submit=false){
  if(publicName.trim().length<2)throw new Error('Enter the provider name customers will see.');
  if(providerType==='BUSINESS'&&businessName.trim().length<2)throw new Error('Enter the business name.');
  if(!selected.length)throw new Error('Select at least one service.');
  if(!areas.length)throw new Error('Add at least one service area.');
  return post(ONBOARDING_URL,{action:submit?'submit':'save',providerType,publicName:publicName.trim(),businessName:providerType==='BUSINESS'?businessName.trim():'',description:description.trim(),experienceYears,availabilityStatus:availability,categoryIds:selected,hours:defaultHours,serviceAreas:areas.map(a=>({islandId:a.islandId,locationUnitId:a.locationUnitId}))});
 }
 async function nextFromServices(){setBusy(true);try{await saveCore(false);setMessage('Provider profile saved.');setStep(3);}catch(e){setMessage(e instanceof Error?e.message:'Unable to save provider profile.');}finally{setBusy(false);}}
 async function uploadDocument(){if(!doc){setMessage('Choose an ID or verification document first.');return;}setBusy(true);try{const t=await token();const form=new FormData();form.append('file',doc);form.append('documentType',providerType==='BUSINESS'?'BUSINESS_VERIFICATION':'IDENTITY');form.append('documentLabel',providerType==='BUSINESS'?'Business / authorized person verification document':'Provider identity document');const r=await fetch(DOC_URL,{method:'POST',headers:{Authorization:`Bearer ${t}`},body:form});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to upload document');setDocs(v=>[p.document,...v]);setDoc(null);setMessage('Verification document uploaded.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to upload document.');}finally{setBusy(false);}}
 async function savePayout(){if(!bankName.trim()||!accountHolder.trim()||accountNumber.trim().length<4){setMessage('Complete your bank payout details.');return;}setBusy(true);try{await post(SETUP_URL,{action:'save_payout',bankName:bankName.trim(),accountHolderName:accountHolder.trim(),accountNumber:accountNumber.trim()});setPayoutSaved(true);setAccountNumber('');setMessage('Payout account saved securely.');setStep(5);}catch(e){setMessage(e instanceof Error?e.message:'Unable to save payout setup.');}finally{setBusy(false);}}
 async function finish(){setBusy(true);try{await saveCore(true);setSubmitted(true);try{localStorage.setItem('fixit:app-mode','provider');localStorage.setItem('fixit:mobile-nav-role','provider');sessionStorage.setItem('fixit:mode-toast',"Provider setup submitted. You'll be able to receive jobs after approval.");}catch{}setMessage('Provider setup submitted for verification and approval.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to submit provider setup.');}finally{setBusy(false);}}

 const stepLabels=['Type & Services','Verification','Payout','Review','Finish'];
 return <main className="providerModePage"><div className="providerModeShell providerSetupShell">
  <header className="providerModeTop"><div><span className="modeBadge provider"><span className="modeDot provider"/>Provider setup</span><h1>Offer your services</h1><p>Build your provider profile without leaving your customer account.</p></div><AppModeSwitch mode="provider" compact/></header>
  <div className="providerSetupProgress">{stepLabels.map((label,i)=><button key={label} className={step===i+1?'active':step>i+1?'done':''} onClick={()=>{if(i+1<step)setStep(i+1);}}><span>{i+1}</span><small>{label}</small></button>)}</div>
  {message?<div className="providerSetupMessage" role="status">{busy?'Working… ':''}{message}</div>:null}

  {step===1?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>Provider type, services & service area</h2><p>Choose how you provide services, what you do, and where you work.</p></div></div>
   <h3>Provider type</h3><div className="providerSetupChoices"><button type="button" className={providerType==='INDIVIDUAL'?'selected':''} onClick={()=>setProviderType('INDIVIDUAL')}><strong>Individual</strong><span>Offer services personally</span></button><button type="button" className={providerType==='BUSINESS'?'selected':''} onClick={()=>setProviderType('BUSINESS')}><strong>Business</strong><span>Offer services as a company or business</span></button></div>
   <div className="providerSetupForm"><label>Public provider name<input value={publicName} onChange={e=>setPublicName(e.target.value)} placeholder="Name customers will see"/></label>{providerType==='BUSINESS'?<label>Business name<input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Registered or trading business name"/></label>:null}<label>Years of experience<input type="number" min="0" max="80" value={experienceYears} onChange={e=>setExperienceYears(Number(e.target.value||0))}/></label><label className="full">About your services<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Experience, specialties and what customers can expect"/></label><label>Availability<select value={availability} onChange={e=>setAvailability(e.target.value)}><option value="AVAILABLE_NOW">Available now</option><option value="AVAILABLE_TODAY">Available today</option><option value="BY_APPOINTMENT">By appointment</option><option value="UNAVAILABLE">Unavailable</option></select></label></div>
   <h3>Select services</h3><div className="providerSetupChoices">{categories.map(c=><button type="button" key={c.id} className={selected.includes(c.id)?'selected':''} onClick={()=>toggleCategory(c.id)}>{c.name}</button>)}</div>
   <h3>Service areas</h3><div className="providerSetupForm"><label>Atoll<select value={atollId} disabled={!atolls.length} onChange={e=>{setAtollId(e.target.value);setIslandId('');setUnitId('');}}><option value="">{atolls.length?'Select atoll':'Loading atolls…'}</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label><label>Island / City<select value={islandId} disabled={!atollId||!islandOptions.length} onChange={e=>{setIslandId(e.target.value);setUnitId('');}}><option value="">{!atollId?'Select atoll first':islandOptions.length?'Select island':'No islands available'}</option>{islandOptions.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>{unitOptions.length?<label>Ward / Area<select value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">Whole island</option>{unitOptions.map(u=><option key={u.id} value={u.id}>{u.display_name}</option>)}</select></label>:null}<button className="secondary" type="button" disabled={!islandId} onClick={addArea}>Add area</button></div><div className="providerAreaChips">{areas.map((a,i)=><button type="button" key={`${a.islandId}-${a.locationUnitId||''}`} onClick={()=>setAreas(v=>v.filter((_,n)=>n!==i))}>{a.islandName}{a.locationUnitName?` · ${a.locationUnitName}`:''} ×</button>)}</div>
   <div className="providerSetupActions"><button className="primary" disabled={busy} onClick={()=>void nextFromServices()}>Save & continue</button></div>
  </section>:null}

  {step===2?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>{providerType==='BUSINESS'?'Verify your business':'Verify your identity'}</h2><p>{providerType==='BUSINESS'?'Upload a business or authorized-person supporting document.':'Upload an ID or supporting document.'} Files stay private and are reviewed by Admin.</p></div></div><label className="providerDocDrop"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setDoc(e.target.files?.[0]||null)}/><span>{doc?doc.name:'Choose PDF, JPG, PNG or WebP · max 10 MB'}</span></label><button className="primary" disabled={!doc||busy} onClick={()=>void uploadDocument()}>Upload document</button>{docs.length?<div className="providerList">{docs.slice(0,4).map(d=><div className="providerListItem" key={d.id}><div><h3>{d.document_label||d.document_type}</h3><p>Submitted for private review</p></div><span className="modeBadge provider">{d.review_status}</span></div>)}</div>:null}<div className="providerSetupActions"><button className="secondary" onClick={()=>setStep(1)}>Back</button><button className="primary" disabled={!docs.length} onClick={()=>setStep(3)}>Continue</button></div></section>:null}

  {step===3?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>Payment setup</h2><p>Add the bank account FixIt can use for future provider payouts. The full account number is never returned to the browser after saving.</p></div></div><div className="providerSetupForm"><label>Bank name<input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="Bank of Maldives"/></label><label>Account holder<input value={accountHolder} onChange={e=>setAccountHolder(e.target.value)} placeholder="Account holder name"/></label><label className="full">Account number<input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} placeholder={payoutSaved?'Saved — enter only to replace':'Account number'}/></label></div><div className="providerSetupActions"><button className="secondary" onClick={()=>setStep(2)}>Back</button>{payoutSaved&&!accountNumber?<button className="primary" onClick={()=>setStep(4)}>Continue with saved account</button>:<button className="primary" disabled={busy} onClick={()=>void savePayout()}>Save payout account</button>}</div></section>:null}

  {step===4?<section className="providerModeCard"><div className="providerSectionHead"><div><h2>Review provider setup</h2><p>Confirm the details before submitting for Admin verification.</p></div></div><div className="providerBenefitGrid"><div><strong>Provider type</strong><span>{providerType==='BUSINESS'?'Business':'Individual'}</span></div>{providerType==='BUSINESS'?<div><strong>Business</strong><span>{businessName||'Not provided'}</span></div>:null}<div><strong>Public name</strong><span>{publicName||'Not provided'}</span></div><div><strong>Services</strong><span>{selected.length} selected</span></div><div><strong>Service areas</strong><span>{areas.length} selected</span></div><div><strong>Verification</strong><span>{docs.length} document{docs.length===1?'':'s'} submitted</span></div></div><div className="providerSetupActions"><button className="secondary" onClick={()=>setStep(3)}>Back</button><button className="primary" onClick={()=>setStep(5)}>Continue</button></div></section>:null}

  {step===5?<section className="providerModeCard providerSetupSuccess"><div className="providerSetupIcon success">✓</div><h2>{submitted?'Provider setup complete':'Ready to submit'}</h2><p>{submitted?'Your provider profile is submitted. Once approved, Provider Mode opens your service workspace.':'Submit your provider profile for Admin verification. Your 30-day provider trial starts only after approval.'}</p>{submitted?<><span className="modeBadge provider">Approval / verification status will update here</span><a className="primary" href="/">Return to Customer Mode</a></>:<div className="providerSetupActions"><button className="secondary" onClick={()=>setStep(4)}>Back</button><button className="primary" disabled={busy||!docs.length||!payoutSaved} onClick={()=>void finish()}>Submit provider setup</button></div>}</section>:null}
 </div></main>;
}
