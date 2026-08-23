'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';
const SETUP_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-setup-data';
const UPLOAD_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-document-upload';

type ProviderType='INDIVIDUAL'|'BUSINESS';
type DocumentType='ID_CARD'|'BUSINESS_LICENSE';
type VerificationDocument={id:string;document_type:string;document_label?:string|null;review_status:string;review_note?:string|null;submitted_at:string};

function pretty(value:string){return value.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());}

export default function ProviderProfilePage(){
 const[providerType,setProviderType]=useState<ProviderType>('INDIVIDUAL');
 const[documents,setDocuments]=useState<VerificationDocument[]>([]);
 const[loadingDocs,setLoadingDocs]=useState(true);
 const[uploading,setUploading]=useState<DocumentType|null>(null);
 const[docMessage,setDocMessage]=useState('');

 useEffect(()=>{void loadVerification();},[]);

 async function session(){const{data}=await supabase.auth.getSession();return data.session;}
 async function postJson(url:string,body:Record<string,unknown>){
  const s=await session();
  if(!s)throw new Error('Sign in required');
  let r:Response;
  try{
   r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  }catch(error){
   const timedOut=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');
   throw new Error(timedOut?'Provider verification service timed out. Tap Retry to try again.':'Unable to reach provider verification service.');
  }
  const p=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(p?.error||'Unable to load provider verification');
  return p;
 }
 async function loadVerification(){
  setLoadingDocs(true);
  setDocMessage('');
  try{
   const onboarding=await postJson(ONBOARDING_URL,{action:'get'});
   const type=String(onboarding?.profile?.provider_type||'INDIVIDUAL').toUpperCase()==='BUSINESS'?'BUSINESS':'INDIVIDUAL';
   setProviderType(type);
   const setup=await postJson(SETUP_URL,{action:'get'});
   setDocuments((setup?.documents||[]) as VerificationDocument[]);
  }catch(e){setDocMessage(e instanceof Error?e.message:'Unable to load verification documents.');}
  finally{setLoadingDocs(false);}
 }

 async function uploadDocument(type:DocumentType,file:File){setUploading(type);setDocMessage('Uploading document…');try{const s=await session();if(!s)throw new Error('Sign in required');const form=new FormData();form.set('file',file);form.set('documentType',type);form.set('documentLabel',type==='ID_CARD'?'ID Card':'Business Permit');const r=await fetch(UPLOAD_URL,{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`},body:form,signal:AbortSignal.timeout(20000)});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||'Unable to upload document');await loadVerification();setDocMessage(`${type==='ID_CARD'?'ID Card':'Business Permit'} uploaded and sent for admin review.`);}catch(e){setDocMessage(e instanceof Error?e.message:'Unable to upload document.');}finally{setUploading(null);}}
 function pick(type:DocumentType,e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(file)void uploadDocument(type,file);}

 const latestByType=useMemo(()=>{const map=new Map<string,VerificationDocument>();for(const d of documents){if(!map.has(d.document_type))map.set(d.document_type,d);}return map;},[documents]);
 const idCard=latestByType.get('ID_CARD');
 const businessPermit=latestByType.get('BUSINESS_LICENSE');
 const idApproved=idCard?.review_status==='APPROVED';
 const permitApproved=businessPermit?.review_status==='APPROVED';
 const ready=providerType==='BUSINESS'?idApproved&&permitApproved:idApproved;

 function DocumentField({type,label,description,doc}:{type:DocumentType;label:string;description:string;doc?:VerificationDocument}){const status=doc?.review_status||'NOT_SUBMITTED';return <div style={{border:'1px solid #e5e7eb',borderRadius:16,padding:16,display:'grid',gap:10,background:'#fff'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><strong style={{fontSize:16}}>{label}</strong><p className="muted" style={{margin:'5px 0 0'}}>{description}</p></div><span className="pill">{pretty(status)}</span></div>{doc?.review_note?<div className="formMessage">Admin note: {doc.review_note}</div>:null}<label className="secondary" style={{cursor:uploading?'wait':'pointer',width:'fit-content',minHeight:42,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{uploading===type?'Uploading…':doc?'Replace / Re-upload':'Upload'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={e=>pick(type,e)} style={{display:'none'}}/></label><small className="muted">PDF, JPG, PNG or WebP • maximum 10 MB</small></div>}

 return <main className="shell accountApp">
  <section className="profileSection">
   <div className="profileSectionHeader">
    <div>
     <h3>Subscription</h3>
     <p className="sectionLead">Manage your provider subscription, renewal and payment history.</p>
    </div>
    <a className="secondary" href="/provider/subscription">Manage Subscription</a>
   </div>
  </section>

  <section className="profileSection">
   <div className="profileSectionHeader">
    <div>
     <h3>Verification Documents</h3>
     <p className="sectionLead">Documents required before your provider account can be approved.</p>
    </div>
    <span className={ready?'profileBadge verified':'profileBadge warning'}>{ready?'Requirements Complete':'Action Required'}</span>
   </div>
   <div style={{marginBottom:14,padding:12,borderRadius:14,background:'#f8fafc',border:'1px solid #e5e7eb'}}><strong>Provider type: {pretty(providerType)}</strong><p className="muted" style={{margin:'5px 0 0'}}>{providerType==='BUSINESS'?'Required: approved ID Card and approved Business Permit.':'Required: approved ID Card.'}</p></div>
   {loadingDocs?<p className="formMessage">Loading verification documents…</p>:docMessage?<div style={{display:'grid',gap:10}}><p className="formMessage" role="alert">{docMessage}</p><button className="secondary" type="button" onClick={()=>void loadVerification()}>Retry</button></div>:<div style={{display:'grid',gap:12}}><DocumentField type="ID_CARD" label="ID Card" description={providerType==='BUSINESS'?'ID Card of the business owner or authorized person.':'Your government-issued ID Card.'} doc={idCard}/>{providerType==='BUSINESS'?<DocumentField type="BUSINESS_LICENSE" label="Business Permit" description="Valid business permit / registration document." doc={businessPermit}/>:null}</div>}
  </section>
 </main>;
}
