'use client';

import { FormEvent, useEffect, useState } from 'react';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type Profile={user_id:string;email?:string|null;full_name?:string|null;role:Role;provider_approved?:boolean;phone_number?:string|null;is_phone_verified?:boolean;profile_photo_url?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;created_at?:string|null;primaryAddress?:{line1?:string;line2?:string;city?:string;stateRegion?:string;postalCode?:string;country?:string}};

function localPhone(value?:string|null){const raw=(value||'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;}

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
 const a=profile?.primaryAddress;
 const address=[a?.line1||profile?.address_line1,a?.line2||profile?.address_line2,a?.city||profile?.city,a?.stateRegion||profile?.state_region,a?.postalCode||profile?.postal_code,a?.country||profile?.country||'Maldives'].filter(Boolean).join(', ')||'Not provided';

 return <main className="shell accountApp">
  <section className="profileHeroCard"><div className="profileIdentity">{profile?.profile_photo_url?<img className="profileAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileAvatar">{initial}</div>}<div className="profileIdentityCopy"><h2>{profile?.full_name||'Your FixIt profile'}</h2><p>{profile?.email||'Email not provided'}</p><div className="profileBadges">{profile?.role?<span className="profileBadge">{profile.role}</span>:null}</div></div></div><button className="secondary profileEditButton" type="button" disabled={!profile||loading} onClick={()=>setEditing(v=>!v)}>{editing?'Close':'Edit Profile'}</button></section>
  {editing?<section className="profileSection"><form className="authForm" onSubmit={save}><label>Full name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Phone number<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXX"/></label><button className="primary" disabled={saving}>{saving?'Saving…':'Save Profile'}</button></form></section>:null}
  <section className="profileSection"><div className="profileSectionHeader"><div><h3>Account details</h3><p className="sectionLead">Your core FixIt identity and verification status.</p></div></div><div className="profileDetailList"><div className="profileDetailRow"><span>Name</span><strong>{loading?'Loading…':profile?.full_name||'Not provided'}</strong></div><div className="profileDetailRow"><span>Email</span><strong>{loading?'Loading…':profile?.email||'Not provided'}</strong></div><div className="profileDetailRow"><span>Phone</span><strong>{loading?'Loading…':profile?.phone_number||'Not provided'}</strong></div><div className="profileDetailRow"><span>Phone verification</span><strong className={profile?.is_phone_verified?'positiveText':'warningText'}>{loading?'Loading…':profile?.phone_number?(profile.is_phone_verified?'Verified':'Not verified'):'Not applicable'}</strong></div><div className="profileDetailRow"><span>Primary address</span><strong>{loading?'Loading…':address}</strong></div><div className="profileDetailRow"><span>Account type</span><strong>{loading?'Loading…':profile?.role||'Not available'}</strong></div>{profile?.created_at?<div className="profileDetailRow"><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong></div>:null}</div></section>
  <button className="profileSignOut" type="button" onClick={signOut}>Sign Out</button>
  <p className="muted accountStatusText" role="status">{message}</p>
  <button className="secondary" type="button" onClick={()=>void load()} disabled={loading} style={{width:'100%',marginTop:8}}>{loading?'Loading…':'Refresh Profile'}</button>
 </main>;
}
