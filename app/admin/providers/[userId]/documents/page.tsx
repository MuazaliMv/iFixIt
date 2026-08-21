'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';
import AdminNav from '../../../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
type DocumentRow={id:string;document_type:string;document_label?:string|null;review_status:string;review_note?:string|null;reviewed_at?:string|null;submitted_at:string;signed_url?:string|null};
type Detail={account:{full_name?:string|null;email?:string|null};onboarding?:{public_name?:string|null}|null;documents:DocumentRow[]};

export default function AdminProviderDocumentsPage(){
 const params=useParams<{userId:string}>();const userId=params.userId;const[detail,setDetail]=useState<Detail|null>(null);const[message,setMessage]=useState('Loading documents…');const[busy,setBusy]=useState('');const[notes,setNotes]=useState<Record<string,string>>({});
 useEffect(()=>{if(userId)void load();},[userId]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function callAdmin(body:Record<string,unknown>){const token=await jwt();if(!token)return null;const response=await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const payload=await callAdmin({action:'provider_detail',providerUserId:userId});if(!payload)return;setDetail(payload as Detail);setMessage('Provider documents loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load documents.');}}
 async function review(doc:DocumentRow,status:'APPROVED'|'REQUEST_INFO'|'REJECTED'){setBusy(doc.id);try{await callAdmin({action:'review_provider_document',providerUserId:userId,documentId:doc.id,status,note:notes[doc.id]||''});await load();setMessage(`${doc.document_type.replaceAll('_',' ')} marked ${status.replaceAll('_',' ')}.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to review document.');}finally{setBusy('');}}
 const docs=detail?.documents||[];const providerName=detail?.onboarding?.public_name||detail?.account.full_name||'Provider';
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Provider Documents</p></div><a className="secondary" href={`/admin/providers/${userId}`}>Back to Provider</a></header><AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">VERIFICATION DOCUMENTS</p><h2>{providerName}</h2><p className="muted">{detail?.account.email||'No email'}</p></div><span className="pill">{docs.filter(d=>d.review_status==='PENDING').length} pending</span></div><p className="formMessage" role="status">{message}</p></section>
  <section className="panel"><div className="jobList">{docs.map(doc=><article className="jobCard" key={doc.id}><div className="jobTop"><div><strong>{doc.document_label||doc.document_type.replaceAll('_',' ')}</strong><div className="muted">Submitted {new Date(doc.submitted_at).toLocaleString()}</div></div><span className="pill">{doc.review_status.replaceAll('_',' ')}</span></div><div className="actions">{doc.signed_url?<a className="secondary" href={doc.signed_url} target="_blank" rel="noreferrer">View Document</a>:<span className="muted">File unavailable</span>}</div><div className="providerAccessRow"><input placeholder="Review note / information requested" value={notes[doc.id]??doc.review_note??''} onChange={e=>setNotes(v=>({...v,[doc.id]:e.target.value}))}/></div><div className="actions"><button className="primary" disabled={busy===doc.id} onClick={()=>review(doc,'APPROVED')}>Approve</button><button className="secondary" disabled={busy===doc.id} onClick={()=>review(doc,'REQUEST_INFO')}>Request Info</button><button className="secondary" disabled={busy===doc.id} onClick={()=>review(doc,'REJECTED')}>Reject</button></div>{doc.reviewed_at?<div className="muted">Last reviewed {new Date(doc.reviewed_at).toLocaleString()}</div>:null}</article>)}{!docs.length?<div className="emptyQueue">No verification documents have been submitted by this provider yet.</div>:null}</div></section>
 </main>;
}
