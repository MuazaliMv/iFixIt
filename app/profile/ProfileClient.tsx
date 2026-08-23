'use client';

import { FormEvent, useEffect, useState } from 'react';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type Address={line1?:string|null;line2?:string|null;city?:string|null;stateRegion?:string|null;postalCode?:string|null;country?:string|null};
type ServiceAddress={id?:string;label?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;access_instructions?:string|null;is_default?:boolean|null};
type Profile={user_id:string;email?:string|null;full_name?:string|null;role:Role;provider_approved?:boolean;phone_number?:string|null;is_phone_verified?:boolean;profile_photo_url?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;created_at?:string|null;primaryAddress?:Address;providerAddress?:Address;serviceAddresses?:ServiceAddress[]};

function localPhone(value?:string|null){const raw=(value||'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;}
function value(v?:string|null){return String(v||'').trim()||'Not provided';}
function addressLine(a?:Address|null){if(!a)return'Not provided';return [a.line1,a.line2,a.city,a.stateRegion,a.postalCode,a.country].filter(Boolean).join(', ')||'Not provided';}

async function profileRequest(){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(payload?.error||'Unable to load profile.'),{status:response.status});
  return payload.profile as Profile;
 }finally{clearTimeout(timer);}
}

export default function ProfileClient(){
 const[profile,setProfile]=useState<Profile|null>(null);
 const[loading,setLoading]=useState(true);
 const[editing,setEditing]=useState(false);
 const[saving,setSaving]=useState(false);
 const[message,setMessage]=useState('Loading profile…');
 const[name,setName]=useState('');
 const[phone,setPhone]=useState('');

 useEffect(()=>{void load();},[]);

 async function load(){
  setLoading(true);
  setMessage('Loading profile…');
  try{
   const next=await profileRequest();
   const normalized={...next,phone_number:localPhone(next.phone_number)};
   setProfile(normalized);
   setName(normalized.full_name||'');
   setPhone(normalized.phone_number||'');
   setMessage('Profile is up to date.');
  }catch(error:any){
   if(error?.status===401){window.location.replace('/login?next=%2Fprofile');return;}
   const timedOut=error instanceof Error&&(error.name==='AbortError'||error.name==='TimeoutError');
   setMessage(timedOut?'Profile took too long to load. Tap Refresh Profile to try again.':error instanceof Error?error.message:'Unable to load profile details.');
  }finally{setLoading(false);}
 }

 async function save(e:FormEvent){
  e.preventDefault();
  setSaving(true);
  setMessage('Saving profile…');
  try{
   const form=new FormData();
   form.set('fullName',name.trim());
   if(phone.trim())form.set('phoneNumber',phone.trim());
   const response=await fetch('/api/user/profile',{method:'PUT',body:form,credentials:'same-origin'});
   const payload=await response.json().catch(()=>({}));
   if(response.status===401){window.location.replace('/login?next=%2Fprofile');return;}
   if(!response.ok)throw new Error(payload?.error||'Unable to update profile.');
   setEditing(false);
   await load();
   setMessage('Profile updated.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update profile.');}
  finally{setSaving(false);}
 }

 async function signOut(){
  await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});
  window.location.href='/login';
 }

 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();
 const a=profile?.primaryAddress||{line1:profile?.address_line1,line2:profile?.address_line2,city:profile?.city,stateRegion:profile?.state_region,postalCode:profile?.postal_code,country:profile?.country||'Maldives'};
 const providerAddress=profile?.providerAddress;
 const serviceAddresses=profile?.serviceAddresses||[];

 return <main className="shell accountApp">
  <section className="profileHeroCard"><div className="profileIdentity">{profile?.profile_photo_url?<img className="profileAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileAvatar">{initial}</div>}<div className="profileIdentityCopy"><h2>{loading?'Loading…':profile?.full_name||'Your FixIt profile'}</h2><p>{loading?'Loading account…':profile?.email||'Email not provided'}</p><div className="profileBadges">{profile?.role?<span className="profileBadge">{profile.role}</span>:null}{profile?.role==='PROVIDER'?<span className="profileBadge">{profile.provider_approved?'Approved Provider':'Provider Pending'}</span>:null}</div></div></div><button className="secondary profileEditButton" type="button" disabled={!profile||loading} onClick={()=>setEditing(v=>!v)}>{editing?'Close':'Edit Profile'}</button></section>

  {editing?<section className="profileSection"><form className="authForm" onSubmit={save}><label>Full name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Phone number<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXX"/></label><button className="primary" disabled={saving}>{saving?'Saving…':'Save Profile'}</button></form></section>:null}

  <section className="profileSection"><div className="profileSectionHeader"><div><h3>Personal information</h3><p className="sectionLead">Your main FixIt account details.</p></div></div><div className="profileDetailList">
   <div className="profileDetailRow"><span>Full name</span><strong>{loading?'Loading…':value(profile?.full_name)}</strong></div>
   <div className="profileDetailRow"><span>Email address</span><strong>{loading?'Loading…':value(profile?.email)}</strong></div>
   <div className="profileDetailRow"><span>Phone number</span><strong>{loading?'Loading…':value(profile?.phone_number)}</strong></div>
   <div className="profileDetailRow"><span>Phone verification</span><strong className={profile?.is_phone_verified?'positiveText':'warningText'}>{loading?'Loading…':profile?.phone_number?(profile.is_phone_verified?'Verified':'Not verified'):'Not applicable'}</strong></div>
   <div className="profileDetailRow"><span>Account type</span><strong>{loading?'Loading…':profile?.role||'Not available'}</strong></div>
   {profile?.role==='PROVIDER'?<div className="profileDetailRow"><span>Provider status</span><strong className={profile.provider_approved?'positiveText':'warningText'}>{profile.provider_approved?'Approved':'Pending approval'}</strong></div>:null}
   {profile?.created_at?<div className="profileDetailRow"><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString(undefined,{day:'2-digit',month:'long',year:'numeric'})}</strong></div>:null}
  </div></section>

  <section className="profileSection"><div className="profileSectionHeader"><div><h3>Primary address</h3><p className="sectionLead">The address linked to your account.</p></div></div><div className="profileDetailList">
   <div className="profileDetailRow"><span>House / building</span><strong>{loading?'Loading…':value(a?.line1)}</strong></div>
   <div className="profileDetailRow"><span>Street / additional address</span><strong>{loading?'Loading…':value(a?.line2)}</strong></div>
   <div className="profileDetailRow"><span>City / island</span><strong>{loading?'Loading…':value(a?.city)}</strong></div>
   <div className="profileDetailRow"><span>Atoll / region</span><strong>{loading?'Loading…':value(a?.stateRegion)}</strong></div>
   <div className="profileDetailRow"><span>Postal code</span><strong>{loading?'Loading…':value(a?.postalCode)}</strong></div>
   <div className="profileDetailRow"><span>Country</span><strong>{loading?'Loading…':value(a?.country||'Maldives')}</strong></div>
   <div className="profileDetailRow"><span>Full address</span><strong>{loading?'Loading…':addressLine(a)}</strong></div>
  </div></section>

  {profile?.role==='PROVIDER'?<section className="profileSection"><div className="profileSectionHeader"><div><h3>Provider information</h3><p className="sectionLead">Service location information for your provider account.</p></div></div><div className="profileDetailList">
   <div className="profileDetailRow"><span>Provider address</span><strong>{loading?'Loading…':addressLine(providerAddress)}</strong></div>
   <div className="profileDetailRow"><span>Service addresses</span><strong>{loading?'Loading…':String(serviceAddresses.length)}</strong></div>
  </div>{serviceAddresses.length?<div className="profileDetailList" style={{marginTop:12}}>{serviceAddresses.map((s,i)=><div className="profileDetailRow" key={s.id||i}><span>{s.label||`Service location ${i+1}`}{s.is_default?' · Default':''}</span><strong>{[s.address_line1,s.address_line2,s.city,s.state_region,s.postal_code,s.country||'Maldives'].filter(Boolean).join(', ')||'Not provided'}</strong></div>)}</div>:null}</section>:null}

  <button className="profileSignOut" type="button" onClick={signOut}>Sign Out</button>
  <p className="muted accountStatusText" role="status">{message}</p>
  <button className="secondary" type="button" onClick={()=>void load()} disabled={loading} style={{width:'100%',marginTop:8}}>{loading?'Loading…':'Refresh Profile'}</button>
 </main>;
}
