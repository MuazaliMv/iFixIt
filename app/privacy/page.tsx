'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const DELETION_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/data-deletion';

type ServiceAddress={id?:string;label?:string;address_line1?:string;city?:string|null;state_region?:string|null;country?:string|null;is_default?:boolean};
type Profile={full_name?:string|null;email?:string|null;phone_number?:string|null;photoUrl?:string|null;serviceAddresses?:ServiceAddress[]};
type DeletionRequest={id:string;target_type:'PROFILE_PHOTO'|'PHONE'|'ADDRESS'|'ACCOUNT';target_id?:string|null;status:'REQUESTED'|'CONFIRMED'|'CANCELLED'|'COMPLETED'|'EXPIRED';requested_at:string;confirmed_at?:string|null;completed_at?:string|null;recovery_until?:string|null;request_note?:string|null};

function targetLabel(type:DeletionRequest['target_type']){
  if(type==='PROFILE_PHOTO')return 'Profile photo';
  if(type==='PHONE')return 'Phone number';
  if(type==='ADDRESS')return 'Saved address';
  return 'Account';
}

export default function PrivacyPage(){
  const[profile,setProfile]=useState<Profile|null>(null);
  const[requests,setRequests]=useState<DeletionRequest[]>([]);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[password,setPassword]=useState('');

  async function getSession(){
    const{data}=await supabase.auth.getSession();
    if(!data.session){window.location.href='/login';return null;}
    return data.session;
  }

  async function callDeletion(body:Record<string,unknown>){
    const session=await getSession();
    if(!session)throw new Error('Sign in required.');
    const response=await fetch(DELETION_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload?.error||'Unable to process deletion request.');
    return payload;
  }

  async function load(){
    setBusy(true);
    try{
      const session=await getSession();if(!session)return;
      const[profileResponse,deletionPayload]=await Promise.all([
        fetch('/api/user/profile',{headers:{Authorization:`Bearer ${session.access_token}`}}),
        callDeletion({action:'list'})
      ]);
      const profilePayload=await profileResponse.json();
      if(!profileResponse.ok)throw new Error(profilePayload?.error||'Unable to load profile.');
      setProfile(profilePayload.profile||null);
      setRequests(deletionPayload.requests||[]);
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load privacy controls.');}
    finally{setBusy(false);}
  }

  useEffect(()=>{void load();},[]);

  const openRequests=useMemo(()=>requests.filter(r=>r.status==='REQUESTED'||r.status==='CONFIRMED'),[requests]);
  const hasOpen=(type:DeletionRequest['target_type'],targetId?:string)=>openRequests.some(r=>r.target_type===type&&(targetId?r.target_id===targetId:true));

  async function requestDeletion(targetType:DeletionRequest['target_type'],targetId?:string){
    setBusy(true);setMessage('');
    try{
      await callDeletion({action:'request',targetType,targetId:targetId||null});
      setMessage(`${targetLabel(targetType)} deletion requested. Review and confirm below before anything is removed.`);
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to request deletion.');setBusy(false);}
  }

  async function confirmDeletion(item:DeletionRequest){
    if(item.target_type==='ACCOUNT'&&!password){setMessage('Enter your password before confirming account deletion.');return;}
    setBusy(true);setMessage('');
    try{
      await callDeletion({action:'confirm',requestId:item.id,password:item.target_type==='ACCOUNT'?password:undefined});
      if(item.target_type!=='ACCOUNT')await callDeletion({action:'execute',requestId:item.id});
      setPassword('');
      setMessage(item.target_type==='ACCOUNT'?'Account deletion confirmed. You can cancel during the recovery period.':'Deletion confirmed and completed.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to confirm deletion.');setBusy(false);}
  }

  async function cancelDeletion(item:DeletionRequest){
    setBusy(true);setMessage('');
    try{await callDeletion({action:'cancel',requestId:item.id});setMessage('Deletion request cancelled.');await load();}
    catch(error){setMessage(error instanceof Error?error.message:'Unable to cancel deletion.');setBusy(false);}
  }

  return <main className="shell accountApp">
    <header className="accountHeader"><div className="accountTitle"><a className="accountBack" href="/profile">‹</a><div><h1>Data & Privacy</h1><p>You control deletion of your personal data. Nothing below is permanently removed without your confirmation.</p></div></div></header>

    {message?<section className="panel" style={{padding:14,marginBottom:16}}><strong>{message}</strong></section>:null}

    <section className="profileSection">
      <h2>Personal data</h2>
      <p className="muted">Request deletion first. FixIt will ask you to confirm before the data is removed.</p>
      <div className="profileSection" style={{display:'grid',gap:12}}>
        <div className="panel" style={{padding:14}}><strong>Profile photo</strong><p className="muted">{profile?.photoUrl?'A profile photo is stored.':'No profile photo is stored.'}</p><button className="secondary" disabled={busy||!profile?.photoUrl||hasOpen('PROFILE_PHOTO')} onClick={()=>void requestDeletion('PROFILE_PHOTO')}>Request photo deletion</button></div>
        <div className="panel" style={{padding:14}}><strong>Phone number</strong><p className="muted">{profile?.phone_number||'No phone number is stored.'}</p><button className="secondary" disabled={busy||!profile?.phone_number||hasOpen('PHONE')} onClick={()=>void requestDeletion('PHONE')}>Request phone deletion</button></div>
      </div>
    </section>

    <section className="profileSection">
      <h2>Saved addresses</h2>
      <p className="muted">An address linked to active service activity cannot be hard-deleted. Service history is preserved.</p>
      {(profile?.serviceAddresses||[]).length? <div style={{display:'grid',gap:10}}>{(profile?.serviceAddresses||[]).map((address,index)=><div className="panel" style={{padding:14}} key={address.id||index}><strong>{address.label||`Address ${index+1}`}{address.is_default?' · Default':''}</strong><p className="muted">{[address.address_line1,address.city,address.state_region,address.country].filter(Boolean).join(', ')}</p>{address.id?<button className="secondary" disabled={busy||hasOpen('ADDRESS',address.id)} onClick={()=>void requestDeletion('ADDRESS',address.id)}>Request address deletion</button>:null}</div>)}</div>:<p className="muted">No saved service addresses.</p>}
    </section>

    <section className="profileSection">
      <h2>Pending deletion approvals</h2>
      {!openRequests.length?<p className="muted">No deletion is waiting for your approval.</p>:<div style={{display:'grid',gap:12}}>{openRequests.map(item=><div className="panel" style={{padding:14}} key={item.id}><strong>{targetLabel(item.target_type)}</strong><p className="muted">Status: {item.status}. Requested {new Date(item.requested_at).toLocaleString()}.</p>{item.target_type==='ACCOUNT'&&item.status==='REQUESTED'?<label>Password confirmation<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/></label>:null}<div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{item.status==='REQUESTED'?<button disabled={busy} onClick={()=>void confirmDeletion(item)}>{item.target_type==='ACCOUNT'?'Confirm account deletion':'Confirm deletion'}</button>:null}<button className="secondary" disabled={busy} onClick={()=>void cancelDeletion(item)}>Cancel</button></div>{item.target_type==='ACCOUNT'&&item.recovery_until?<p className="muted">Recovery period ends {new Date(item.recovery_until).toLocaleString()}. You may cancel until then.</p>:null}</div>)}</div>}
    </section>

    <section className="profileSection">
      <h2>Delete account</h2>
      <div className="panel" style={{padding:14,border:'1px solid rgba(180,40,40,.35)'}}><strong>Account deletion is protected</strong><p className="muted">You must request deletion, re-enter your password, and confirm it. A 7-day recovery period applies. Service transaction history is retained only as protected/anonymized operational history and is not hard-deleted.</p><button disabled={busy||hasOpen('ACCOUNT')} onClick={()=>void requestDeletion('ACCOUNT')}>Request account deletion</button></div>
    </section>
  </main>;
}
