'use client';

import { FormEvent, useEffect, useState } from 'react';

const SUPABASE_URL='https://yzlhlilxiszefneshatm.supabase.co';
const SUPABASE_KEY='sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';
const STORAGE_KEY='sb-yzlhlilxiszefneshatm-auth-token';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type CachedUser={id:string;email?:string|null;phone?:string|null;phone_confirmed_at?:string|null;created_at?:string|null;user_metadata?:Record<string,unknown>};
type StoredSession={access_token:string;refresh_token?:string;expires_at?:number;user:CachedUser};
type Profile={user_id:string;email?:string|null;full_name?:string|null;role:Role;provider_approved?:boolean;phone_number?:string|null;is_phone_verified?:boolean;profile_photo_url?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;created_at?:string|null};

function localPhone(value?:string|null){const raw=(value||'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;}
function profileFromUser(user:CachedUser):Profile{const meta=user.user_metadata||{};return{user_id:user.id,email:user.email||null,full_name:typeof meta.full_name==='string'?meta.full_name:null,role:(typeof meta.role==='string'&&['CUSTOMER','PROVIDER','ADMIN'].includes(meta.role.toUpperCase())?meta.role.toUpperCase():'CUSTOMER') as Role,provider_approved:false,phone_number:localPhone(user.phone),is_phone_verified:Boolean(user.phone_confirmed_at),country:'Maldives',created_at:user.created_at||null};}

function decodeStored(raw:string):unknown{
 try{return JSON.parse(raw);}catch{}
 if(raw.startsWith('base64-')){
  try{
   const value=raw.slice(7).replace(/-/g,'+').replace(/_/g,'/');
   const padded=value+'='.repeat((4-value.length%4)%4);
   return JSON.parse(decodeURIComponent(Array.from(atob(padded)).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join('')));
  }catch{}
 }
 return null;
}
function findSession(value:any):StoredSession|null{
 if(!value)return null;
 if(typeof value.access_token==='string'&&value.user?.id)return value as StoredSession;
 for(const key of ['session','currentSession','data']){const found=findSession(value?.[key]);if(found)return found;}
 if(Array.isArray(value)){for(const item of value){const found=findSession(item);if(found)return found;}}
 return null;
}
function readStoredSession():StoredSession|null{
 try{
  const direct=window.localStorage.getItem(STORAGE_KEY);
  if(direct){const found=findSession(decodeStored(direct));if(found)return found;}
  const keys=Object.keys(window.localStorage).filter(k=>k.startsWith(STORAGE_KEY)).sort();
  if(keys.length>1){const joined=keys.map(k=>window.localStorage.getItem(k)||'').join('');const found=findSession(decodeStored(joined));if(found)return found;}
 }catch{}
 return null;
}
function saveStoredSession(session:StoredSession){try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(session));}catch{}}

async function refreshSession(session:StoredSession):Promise<StoredSession|null>{
 if(!session.refresh_token)return null;
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),signal:controller.signal});clearTimeout(timer);
  if(!response.ok)return null;
  const next=await response.json();
  if(!next?.access_token||!next?.user?.id)return null;
  const stored:StoredSession={access_token:next.access_token,refresh_token:next.refresh_token||session.refresh_token,expires_at:next.expires_at,user:next.user};
  saveStoredSession(stored);return stored;
 }catch{return null;}
}

async function loadProfile(token:string):Promise<Profile>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch('/api/user/profile',{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(payload?.error||'Unable to load profile.'),{status:response.status});
  return payload.profile as Profile;
 }finally{clearTimeout(timer);}
}

export default function ProfileClient(){
 const[profile,setProfile]=useState<Profile|null>(null);const[loading,setLoading]=useState(false);const[editing,setEditing]=useState(false);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[name,setName]=useState('');const[phone,setPhone]=useState('');
 useEffect(()=>{void load();},[]);

 async function load(){
  setLoading(false);
  let session=readStoredSession();
  if(!session){setProfile(null);setMessage('Your saved sign-in session is unavailable. Please sign in again.');return;}
  const fallback=profileFromUser(session.user);setProfile(fallback);setName(fallback.full_name||'');setPhone(fallback.phone_number||'');setMessage('Loading account details…');
  try{
   let next:Profile;
   try{next=await loadProfile(session.access_token);}catch(error:any){
    if(error?.status===401){const refreshed=await refreshSession(session);if(!refreshed)throw new Error('Your session expired. Please sign in again.');session=refreshed;next=await loadProfile(session.access_token);}else throw error;
   }
   next={...next,phone_number:localPhone(next.phone_number)};setProfile(next);setName(next.full_name||'');setPhone(next.phone_number||'');setMessage('Profile is up to date.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to load profile details.');}
 }

 async function save(e:FormEvent){e.preventDefault();setSaving(true);setMessage('Saving profile…');try{let session=readStoredSession();if(!session)throw new Error('Please sign in again before saving.');const form=new FormData();form.set('fullName',name.trim());if(phone.trim())form.set('phoneNumber',phone.trim());const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);let response=await fetch('/api/user/profile',{method:'PUT',headers:{Authorization:`Bearer ${session.access_token}`},body:form,signal:controller.signal});clearTimeout(timer);if(response.status===401){const refreshed=await refreshSession(session);if(!refreshed)throw new Error('Your session expired. Please sign in again.');session=refreshed;response=await fetch('/api/user/profile',{method:'PUT',headers:{Authorization:`Bearer ${session.access_token}`},body:form});}const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||'Unable to update profile.');setEditing(false);await load();setMessage('Profile updated.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to update profile.');}finally{setSaving(false);}}
 function signOut(){try{window.localStorage.removeItem(STORAGE_KEY);}catch{}window.location.href='/login';}

 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();const address=[profile?.address_line1,profile?.address_line2,profile?.city,profile?.state_region,profile?.postal_code,profile?.country||'Maldives'].filter(Boolean).join(', ')||'Not provided';
 return <main className="shell accountApp">
  <section className="profileHeroCard"><div className="profileIdentity">{profile?.profile_photo_url?<img className="profileAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileAvatar">{initial}</div>}<div className="profileIdentityCopy"><h2>{profile?.full_name||'Your FixIt profile'}</h2><p>{profile?.email||'Email not provided'}</p><div className="profileBadges">{profile?.role?<span className="profileBadge">{profile.role}</span>:null}</div></div></div><button className="secondary profileEditButton" type="button" disabled={!profile} onClick={()=>setEditing(v=>!v)}>{editing?'Close':'Edit Profile'}</button></section>
  {editing?<section className="profileSection"><form className="authForm" onSubmit={save}><label>Full name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Phone number<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXX"/></label><button className="primary" disabled={saving}>{saving?'Saving…':'Save Profile'}</button></form></section>:null}
  <section className="profileSection"><div className="profileSectionHeader"><div><h3>Account details</h3><p className="sectionLead">Your core FixIt identity and verification status.</p></div></div><div className="profileDetailList"><div className="profileDetailRow"><span>Name</span><strong>{profile?.full_name||'Not provided'}</strong></div><div className="profileDetailRow"><span>Email</span><strong>{profile?.email||'Not provided'}</strong></div><div className="profileDetailRow"><span>Phone</span><strong>{profile?.phone_number||'Not provided'}</strong></div><div className="profileDetailRow"><span>Phone verification</span><strong className={profile?.is_phone_verified?'positiveText':'warningText'}>{profile?.phone_number?(profile.is_phone_verified?'Verified':'Not verified'):'Not applicable'}</strong></div><div className="profileDetailRow"><span>Primary address</span><strong>{address}</strong></div><div className="profileDetailRow"><span>Account type</span><strong>{profile?.role||'Not available'}</strong></div>{profile?.created_at?<div className="profileDetailRow"><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong></div>:null}</div></section>
  <button className="profileSignOut" type="button" onClick={signOut}>Sign Out</button><p className="muted accountStatusText" role="status">{message}</p><button className="secondary" type="button" onClick={()=>void load()} disabled={loading} style={{width:'100%',marginTop:8}}>Refresh Profile</button>
 </main>;
}
