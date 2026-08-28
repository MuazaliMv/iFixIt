'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';
import AdminNav from '../../../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
type DocumentRow={id:string;document_type:string;document_label?:string|null;review_status:string;review_note?:string|null;reviewed_at?:string|null;submitted_at:string;signed_url?:string|null;storage_path?:string|null};
type Detail={account:{full_name?:string|null;email?:string|null};onboarding?:{public_name?:string|null;provider_type?:string|null}|null;documents:DocumentRow[]};
type ReviewStatus='APPROVED'|'REQUEST_INFO'|'REJECTED';

function isImageDocument(doc:DocumentRow){return /\.(png|jpe?g|webp)$/i.test(doc.storage_path||'');}
function isPdfDocument(doc:DocumentRow){return /\.pdf$/i.test(doc.storage_path||'');}
function pretty(value:string){return value.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());}
function requiredLabel(type:string){return type==='ID_CARD'?'Required':type==='BUSINESS_LICENSE'?'Required for business':'Verification';}

export default function AdminProviderDocumentsPage(){
 const params=useParams<{userId:string}>();
 const userId=params.userId;
 const[detail,setDetail]=useState<Detail|null>(null);
 const[message,setMessage]=useState('Loading documents…');
 const[openDoc,setOpenDoc]=useState<string|null>(null);
 const[opening,setOpening]=useState('');
 const[reviewing,setReviewing]=useState('');
 useEffect(()=>{if(userId)void load();},[userId]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function callAdmin(body:Record<string,unknown>){const token=await jwt();if(!token)return null;const response=await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)});const text=await response.text();let payload:any={};try{payload=text?JSON.parse(text):{};}catch{payload={error:text||`Admin request failed (${response.status})`};}if(!response.ok)throw new Error(payload?.error||`Admin request failed (${response.status})`);return payload;}
 async function load(){try{const payload=await callAdmin({action:'provider_detail',providerUserId:userId});if(!payload)return;setDetail(payload as Detail);setMessage('Provider verification documents loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load documents.');}}
 async function toggleDocument(doc:DocumentRow){if(openDoc===doc.id){setOpenDoc(null);return;}setOpening(doc.id);try{const payload=await callAdmin({action:'provider_detail',providerUserId:userId});if(!payload)return;const next=payload as Detail;setDetail(next);const refreshed=next.documents.find(d=>d.id===doc.id);if(!refreshed?.signed_url)throw new Error('Document file is unavailable.');setOpenDoc(doc.id);setMessage('Document opened.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to open document.');}finally{setOpening('');}}
 async function reviewDocument(doc:DocumentRow,status:ReviewStatus){if(reviewing)return;let note='';if(status==='REQUEST_INFO'){const value=window.prompt('What additional information or replacement document is required?');if(value===null)return;note=value.trim();if(!note){setMessage('Enter what information is required from the provider.');return;}}if(status==='REJECTED'){const value=window.prompt('Reason for rejecting this document:');if(value===null)return;note=value.trim();if(!note){setMessage('A rejection reason is required.');return;}}setReviewing(doc.id);try{await callAdmin({action:'review_provider_document',providerUserId:userId,documentId:doc.id,status,note});await load();setMessage(status==='APPROVED'?'Document approved.':status==='REQUEST_INFO'?'More information requested from the provider.':'Document rejected.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to review document.');}finally{setReviewing('');}}
 const docs=detail?.documents||[];
 const providerName=detail?.onboarding?.public_name||detail?.account.full_name||'Provider';
 const providerType=String(detail?.onboarding?.provider_type||'INDIVIDUAL').toUpperCase();
 const requiredTypes=providerType==='BUSINESS'?['ID_CARD','BUSINESS_LICENSE']:['ID_CARD'];
 const approvedRequired=requiredTypes.filter(type=>docs.some(doc=>doc.document_type===type&&doc.review_status==='APPROVED')).length;
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Provider Verification</p></div><a className="secondary" href={`/admin/providers/${userId}`}>Back to Provider</a></header><AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROVIDER VERIFICATION DOCUMENTS</p><h2>{providerName}</h2><p className="muted">{detail?.account.email||'No email'}{detail?.onboarding?.provider_type?` • ${detail.onboarding.provider_type.replaceAll('_',' ')}`:''}</p></div><span className="pill">{approvedRequired}/{requiredTypes.length} required approved</span></div><p className="formMessage" role="status">{message}</p><p className="muted">Provider approval requires an approved ID Card. Business providers also require an approved Business Registration.</p></section>
  <section className="panel"><div className="jobList">{docs.map(doc=><article className="jobCard" key={doc.id}><div className="jobTop"><div><strong>{doc.document_label||doc.document_type.replaceAll('_',' ')}</strong><div className="muted">Submitted {new Date(doc.submitted_at).toLocaleString()}</div></div><span className="pill">{pretty(doc.review_status||'SUBMITTED')} • {requiredLabel(doc.document_type)}</span></div>
   {doc.review_note?<p className="jobDescription">Admin note: {doc.review_note}</p>:null}
   <div className="actions">{doc.signed_url?<><button className="secondary" type="button" disabled={opening===doc.id||reviewing===doc.id} onClick={()=>void toggleDocument(doc)}>{opening===doc.id?'Opening…':openDoc===doc.id?'Hide Document':'View Uploaded Document'}</button><a className="secondary" href={doc.signed_url} target="_blank" rel="noreferrer">Open Full Size</a></>:<span className="muted">File unavailable</span>}<button className="primary" type="button" disabled={reviewing===doc.id||doc.review_status==='APPROVED'} onClick={()=>void reviewDocument(doc,'APPROVED')}>{reviewing===doc.id?'Saving…':'Approve'}</button><button className="secondary" type="button" disabled={reviewing===doc.id} onClick={()=>void reviewDocument(doc,'REQUEST_INFO')}>Request More Information</button><button className="secondary" type="button" disabled={reviewing===doc.id||doc.review_status==='REJECTED'} onClick={()=>void reviewDocument(doc,'REJECTED')}>Reject</button></div>
   {openDoc===doc.id&&doc.signed_url?<div style={{marginTop:12,border:'1px solid #dbe2ea',borderRadius:14,overflow:'hidden',background:'#f8fafc',minHeight:180,display:'grid',placeItems:'center'}}>{isImageDocument(doc)?<img src={doc.signed_url} alt={doc.document_label||doc.document_type} style={{display:'block',maxWidth:'100%',width:'100%',height:'auto',maxHeight:'70vh',objectFit:'contain',background:'#fff'}}/>:isPdfDocument(doc)?<object data={doc.signed_url} type="application/pdf" style={{display:'block',width:'100%',height:'min(70vh,680px)',background:'#fff'}}><div style={{padding:18}}><p className="muted">PDF preview is not supported in this browser.</p><a className="secondary" href={doc.signed_url} target="_blank" rel="noreferrer">Open PDF</a></div></object>:<div style={{padding:18}}><p className="muted">Preview is not supported for this file type.</p><a className="secondary" href={doc.signed_url} target="_blank" rel="noreferrer">Open Document</a></div>}</div>:null}</article>)}{!docs.length?<div className="emptyQueue">No verification documents have been submitted by this provider yet.</div>:null}</div></section>
 </main>;
}
