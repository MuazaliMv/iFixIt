'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import './onboarding.css';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';
const SETUP_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-setup-data';
const UPLOAD_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-document-upload';

type ProviderType='INDIVIDUAL'|'BUSINESS';
type DocumentType='ID_CARD'|'BUSINESS_LICENSE';
type Status='DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'SUSPENDED';
type Category={id:string;name:string};
type Atoll={id:string;code:string;display_name:string};
type Island={id:string;atoll_id:string;display_name:string};
type Unit={id:string;island_id:string;display_name:string};
type ServiceArea={islandId:string;locationUnitId:string|null;atollId:string;islandName:string;locationUnitName?:string|null};
type DocumentRow={id:string;document_type:string;document_label?:string|null;review_status:string;review_note?:string|null};

const pretty=(v:string)=>v.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());

export default function ProviderOnboardingPage(){
 const[providerType,setProviderType]=useState<ProviderType>('INDIVIDUAL');
 const[publicName,setPublicName]=useState('');
 const[businessName,setBusinessName]=useState('');
 const[categories,setCategories]=useState<Category[]>([]);
 const[selected,setSelected]=useState<string[]>([]);
 const[atolls,setAtolls]=useState<Atoll[]>([]);
 const[islands,setIslands]=useState<Island[]>([]);
 const[units,setUnits]=useState<Unit[]>([]);
 const[serviceAreas,setServiceAreas]=useState<ServiceArea[]>([]);
 const[atollId,setAtollId]=useState('');
 const[islandId,setIslandId]=useState('');
 const[unitId,setUnitId]=useState('');
 const[documents,setDocuments]=useState<DocumentRow[]>([]);
 const[status,setStatus]=useState<Status>('DRAFT');
 const[busy,setBusy]=useState(false);
 const[uploading,setUploading]=useState<DocumentType|null>(null);
 const[message,setMessage]=useState('Loading provider application…');

 const locked=status==='SUBMITTED'||status==='APPROVED';
 const islandOptions=useMemo(()=>islands.filter(i=>i.atoll_id===atollId),[islands,atollId]);
 const unitOptions=useMemo(()=>units.filter(u=>u.island_id===islandId),[units,islandId]);
 const latest=useMemo(()=>{const m=new Map<string,DocumentRow>();for(const d of documents){if(!m.has(d.document_type))m.set(d.document_type,d);}return m;},[documents]);
 const idCard=latest.get('ID_CARD');
 const businessLicense=latest.get('BUSINESS_LICENSE');
 const requiredDocsPresent=providerType==='BUSINESS'?Boolean(idCard&&businessLicense):Boolean(idCard);
 const progress=[
  Boolean(publicName.trim().length>=2&&(providerType==='INDIVIDUAL'||businessName.trim().length>=2)),
  selected.length>0,
  serviceAreas.length>0,
  requiredDocsPresent,
  status==='SUBMITTED'||status==='APPROVED',
 ];

 useEffect(()=>{void load();},[]);

 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';throw new Error('Sign in required');}return data.session.access_token;}
 async function post(url:string,body:Record<string,unknown>){const t=await token();const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||'Request failed');return p;}
 async function loadDocuments(){const p=await post(SETUP_URL,{action:'get'});setDocuments(p.documents||[]);}
 async function load(){setBusy(true);try{const [p,loc]=await Promise.all([post(ONBOARDING_URL,{action:'get'}),post(LOCATION_URL,{})]);setCategories(p.categories||[]);setSelected(p.selectedCategoryIds||[]);setServiceAreas((p.serviceAreas||[]).map((a:any)=>({islandId:a.islandId,locationUnitId:a.locationUnitId||null,atollId:a.atollId||'',islandName:a.islandName||'Selected location',locationUnitName:a.locationUnitName||null})));if(p.profile){setProviderType(p.profile.provider_type||'INDIVIDUAL');setPublicName(p.profile.public_name||'');setBusinessName(p.profile.business_name||'');setStatus(p.profile.onboarding_status||'DRAFT');}setAtolls(loc.atolls||[]);setIslands(loc.islands||[]);setUnits(loc.locationUnits||[]);await loadDocuments();setMessage('Complete each step and submit for Admin review.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load provider application.');}finally{setBusy(false);}}

 function toggleCategory(id:string){if(locked)return;setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
 function addArea(){if(!islandId)return setMessage('Select an island or city first.');const island=islands.find(i=>i.id===islandId);if(!island)return;const unit=unitId?units.find(u=>u.id===unitId):null;const key=`${islandId}:${unitId}`;if(serviceAreas.some(a=>`${a.islandId}:${a.locationUnitId||''}`===key))return setMessage('That service location is already added.');setServiceAreas(v=>[...v,{islandId,locationUnitId:unitId||null,atollId:island.atoll_id,islandName:island.display_name,locationUnitName:unit?.display_name||null}]);setUnitId('');}
 function removeArea(index:number){if(!locked)setServiceAreas(v=>v.filter((_,i)=>i!==index));}

 async function upload(type:DocumentType,file:File){setUploading(type);try{const t=await token();const form=new FormData();form.set('file',file);form.set('documentType',type);form.set('documentLabel',type==='ID_CARD'?'ID Card':'Business Registration');const r=await fetch(UPLOAD_URL,{method:'POST',headers:{Authorization:`Bearer ${t}`},body:form,signal:AbortSignal.timeout(20000)});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||'Unable to upload document');await loadDocuments();setMessage(`${type==='ID_CARD'?'ID Card':'Business Registration'} uploaded for Admin review.`);}catch(e){setMessage(e instanceof Error?e.message:'Unable to upload document.');}finally{setUploading(null);}}
 function pick(type:DocumentType,e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];e.target.value='';if(f)void upload(type,f);}

 async function save(submit:boolean){if(locked)return setMessage(status==='APPROVED'?'Provider already approved.':'Application already submitted.');if(publicName.trim().length<2)return setMessage('Enter your provider name.');if(providerType==='BUSINESS'&&businessName.trim().length<2)return setMessage('Enter your business name.');if(submit&&!selected.length)return setMessage('Select at least one service.');if(submit&&!serviceAreas.length)return setMessage('Add at least one service location.');if(submit&&!requiredDocsPresent)return setMessage(providerType==='BUSINESS'?'Upload both the ID Card and Business Registration before submitting.':'Upload your ID Card before submitting.');setBusy(true);try{const p=await post(ONBOARDING_URL,{action:submit?'submit':'save',providerType,publicName:publicName.trim(),businessName:businessName.trim(),description:'',experienceYears:0,availabilityStatus:'BY_APPOINTMENT',categoryIds:selected,hours:[],serviceAreas:serviceAreas.map(a=>({islandId:a.islandId,locationUnitId:a.locationUnitId}))});setStatus(p.onboardingStatus||status);setMessage(submit?'Application submitted. Admin will review your profile, services, locations and documents.':'Draft saved.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to save provider application.');}finally{setBusy(false);}}

 function DocCard({type,label,doc}:{type:DocumentType;label:string;doc?:DocumentRow}){const state=doc?pretty(doc.review_status||'SUBMITTED'):'Not submitted';return <div className="documentCard"><div className="documentHeader"><div><strong className="documentTitle">{label}</strong><p className="muted">Required for {providerType==='BUSINESS'?'business provider verification':'individual provider verification'}.</p></div><span className="pill">{state}</span></div>{doc?.review_note?<p className="formMessage">Admin note: {doc.review_note}</p>:null}<label className="secondary documentUpload">{uploading===type?'Uploading…':doc?'Replace document':'Upload document'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={locked||Boolean(uploading)} onChange={e=>pick(type,e)} style={{display:'none'}}/></label></div>}

 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Service Provider Onboarding</p></div><div className="actions"><a className="secondary" href="/">Customer Home</a></div></header>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROVIDER APPLICATION</p><h2>Become a Service Provider</h2></div><span className="pill">{pretty(status)}</span></div><p className="formMessage" role="status">{message}</p><p className="localNotice">Your Customer account stays active. Provider capability is added only after Admin approval.</p><div className="submitSummary">{['Profile','Services','Locations','Documents','Submit'].map((s,i)=><div key={s}><strong>{progress[i]?'✓':i+1}</strong><span>{s}</span></div>)}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">1 · PROFILE</p><h2>Provider identity</h2></div></div><div className="formGrid onboardingForm"><label>Provider type<select disabled={locked} value={providerType} onChange={e=>setProviderType(e.target.value as ProviderType)}><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></label><label>Provider name<input disabled={locked} value={publicName} onChange={e=>setPublicName(e.target.value)} placeholder="Name customers will see"/></label>{providerType==='BUSINESS'?<label className="full">Business name<input disabled={locked} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Registered business name"/></label>:null}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">2 · SERVICES</p><h2>Services you provide</h2></div><span className="pill">{selected.length} selected</span></div><div className="categoryGrid">{categories.map(c=><button type="button" key={c.id} disabled={locked} aria-pressed={selected.includes(c.id)} className={selected.includes(c.id)?'categoryChoice selected':'categoryChoice'} onClick={()=>toggleCategory(c.id)}>{c.name}</button>)}{!categories.length?<div className="emptyQueue">No services available.</div>:null}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">3 · LOCATIONS</p><h2>Where you provide services</h2></div><span className="pill">{serviceAreas.length} location(s)</span></div><div className="formGrid"><label>Atoll / Region<select disabled={locked} value={atollId} onChange={e=>{setAtollId(e.target.value);setIslandId('');setUnitId('');}}><option value="">Select atoll</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.code} — {a.display_name}</option>)}</select></label><label>Island / City<select disabled={locked||!atollId} value={islandId} onChange={e=>{setIslandId(e.target.value);setUnitId('');}}><option value="">Select island or city</option>{islandOptions.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>{unitOptions.length?<label>Ward / Area<select disabled={locked} value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">Whole island / city</option>{unitOptions.map(u=><option key={u.id} value={u.id}>{u.display_name}</option>)}</select></label>:null}<div className="actions"><button type="button" className="primary" disabled={locked} onClick={addArea}>Add Location</button></div></div><div className="jobList">{serviceAreas.map((a,i)=><div className="jobCard" key={`${a.islandId}:${a.locationUnitId||''}`}><strong>{a.islandName}</strong><p className="jobDescription">{a.locationUnitName||'Whole island / city'}</p><button type="button" className="secondary" disabled={locked} onClick={()=>removeArea(i)}>Remove</button></div>)}</div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">4 · DOCUMENTS</p><h2>Verification documents</h2><p className="sectionLead">Required documents must be uploaded before submission. Admin reviews them before final approval.</p></div><span className="pill">{requiredDocsPresent?'Ready':'Required'}</span></div><div style={{display:'grid',gap:12}}><DocCard type="ID_CARD" label="ID Card" doc={idCard}/>{providerType==='BUSINESS'?<DocCard type="BUSINESS_LICENSE" label="Business Registration" doc={businessLicense}/>:null}</div></section>

  <section className="panel submitPanel"><div className="panelHeader"><div><p className="eyebrow">5 · REVIEW & SUBMIT</p><h2>{status==='SUBMITTED'?'Application under Admin review':status==='APPROVED'?'Provider approved':'Submit application'}</h2><p className="sectionLead">Admin will review your identity, services, locations and required documents.</p></div></div>{status==='SUBMITTED'?<div className="approvalState pendingApproval"><strong>Pending Admin Approval</strong><span>Your Customer account remains available.</span></div>:status==='APPROVED'?<div className="approvalState approvedState"><strong>Provider Approved ✓</strong><span>Service Provider access is enabled.</span></div>:<div className="actions submitActions"><button className="secondary" disabled={busy||Boolean(uploading)} onClick={()=>void save(false)}>Save Draft</button><button className="primary" disabled={busy||Boolean(uploading)||!requiredDocsPresent} onClick={()=>void save(true)}>{busy?'Submitting…':'Submit for Admin Approval'}</button></div>}</section>

  <footer className="footer"><span>FixIt Maldives</span><span>Service Provider Application</span></footer>
 </main>;
}
