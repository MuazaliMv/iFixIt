'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type Profile={
 user_id:string;
 email?:string|null;
 full_name?:string|null;
 role:Role;
 provider_approved?:boolean;
 phone_number?:string|null;
 is_phone_verified?:boolean;
 profile_photo_url?:string|null;
 address_line1?:string|null;
 address_line2?:string|null;
 city?:string|null;
 state_region?:string|null;
 postal_code?:string|null;
 country?:string|null;
 created_at?:string|null;
};
type CachedUser={id:string;email?:string|null;phone?:string|null;phone_confirmed_at?:string|null;created_at?:string|null;user_metadata?:Record<string,unknown>};

const PROJECT_REF='yzlhlilxiszefneshatm';
const STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;

function timeout<T>(promise:PromiseLike<T>,ms:number,label:string):Promise<T>{
 return Promise.race([
  Promise.resolve(promise),
  new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out.`)),ms)),
 ]);
}
function localPhone(value?:string|null){const raw=(value||'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;}
function profileFromUser(user:CachedUser):Profile{
 const meta=user.user_metadata||{};
 return {
  user_id:user.id,
  email:user.email||null,
  full_name:typeof meta.full_name==='string'?meta.full_name:null,
  role:(typeof meta.role==='string'&&['CUSTOMER','PROVIDER','ADMIN'].includes(meta.role.toUpperCase())?meta.role.toUpperCase():'CUSTOMER') as Role,
  provider_approved:false,
  phone_number:localPhone(user.phone),
  is_phone_verified:Boolean(user.phone_confirmed_at),
  country:'Maldives',
  created_at:user.created_at||null,
 };
}
function readCachedUser():CachedUser|null{
 try{
  const raw=window.localStorage.getItem(STORAGE_KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw);
  const user=parsed?.user||parsed?.currentSession?.user||parsed?.session?.user;
  return user?.id?user as CachedUser:null;
 }catch{return null;}
}

export default function ProfileClient(){
 const[profile,setProfile]=useState<Profile|null>(null);
 const[loading,setLoading]=useState(true);
 const[editing,setEditing]=useState(false);
 const[saving,setSaving]=useState(false);
 const[message,setMessage]=useState('Loading profile…');
 const[name,setName]=useState('');
 const[phone,setPhone]=useState('');

 useEffect(()=>{
  const cached=readCachedUser();
  if(cached){
   const fallback=profileFromUser(cached);
   setProfile(fallback);setName(fallback.full_name||'');setPhone(fallback.phone_number||'');setLoading(false);setMessage('Signed-in account loaded. Refreshing profile details…');
  }
  void load(cached);
 },[]);

 async function load(cachedUser?:CachedUser|null){
  if(!cachedUser&&!profile)setLoading(true);
  try{
   let user=cachedUser||readCachedUser();
   if(!user){
    try{
     const sessionResult=await timeout(supabase.auth.getSession(),3500,'Session');
     user=sessionResult.data.session?.user as CachedUser|undefined||null;
    }catch{}
   }
   if(!user){
    setLoading(false);setMessage('Your sign-in session could not be read. Please sign in again.');return;
   }

   const fallback=profileFromUser(user);
   setProfile(current=>current||fallback);
   setName(current=>current||fallback.full_name||'');
   setPhone(current=>current||fallback.phone_number||'');
   setLoading(false);

   try{
    const query=supabase.from('auth_profiles')
     .select('user_id,email,full_name,role,provider_approved,phone_number,is_phone_verified,profile_photo_url,address_line1,address_line2,city,state_region,postal_code,country,created_at')
     .eq('user_id',user.id).maybeSingle();
    const result=await timeout(query,5000,'Profile');
    if(result.error)throw result.error;
    if(result.data){
     const next={...fallback,...result.data,phone_number:localPhone(result.data.phone_number)} as Profile;
     setProfile(next);setName(next.full_name||'');setPhone(next.phone_number||'');setMessage('Profile is up to date.');
    }else setMessage('Signed-in account loaded. Complete your profile to add more details.');
   }catch(error){
    setMessage(error instanceof Error?`Account loaded. Profile details unavailable: ${error.message}`:'Account loaded. Some profile details are unavailable.');
   }
  }finally{setLoading(false);}
 }

 async function save(e:FormEvent){
  e.preventDefault();setSaving(true);setMessage('Saving profile…');
  try{
   const cached=readCachedUser();
   let accessToken='';
   try{const s=await timeout(supabase.auth.getSession(),3500,'Session');accessToken=s.data.session?.access_token||'';}catch{}
   if(!accessToken){setMessage('Please sign in again before saving.');return;}
   const form=new FormData();form.set('fullName',name.trim());if(phone.trim())form.set('phoneNumber',phone.trim());
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   const response=await fetch('/api/user/profile',{method:'PUT',headers:{Authorization:`Bearer ${accessToken}`},body:form,signal:controller.signal});clearTimeout(timer);
   const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||'Unable to update profile.');
   setEditing(false);await load(cached);setMessage('Profile updated.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update profile.');}finally{setSaving(false);}
 }
 async function signOut(){await supabase.auth.signOut();window.location.href='/login';}

 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();
 const address=[profile?.address_line1,profile?.address_line2,profile?.city,profile?.state_region,profile?.postal_code,profile?.country||'Maldives'].filter(Boolean).join(', ')||'Not provided';

 return <main className="shell accountApp">
  <section className="profileHeroCard"><div className="profileIdentity">{profile?.profile_photo_url?<img className="profileAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileAvatar">{initial}</div>}<div className="profileIdentityCopy"><h2>{profile?.full_name||'Your FixIt profile'}</h2><p>{profile?.email||'Email not provided'}</p><div className="profileBadges">{profile?.role?<span className="profileBadge">{profile.role}</span>:null}</div></div></div><button className="secondary profileEditButton" type="button" disabled={!profile||loading} onClick={()=>setEditing(v=>!v)}>{editing?'Close':'Edit Profile'}</button></section>
  {editing?<section className="profileSection"><form className="authForm" onSubmit={save}><label>Full name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Phone number<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXX"/></label><button className="primary" disabled={saving}>{saving?'Saving…':'Save Profile'}</button></form></section>:null}
  <section className="profileSection"><div className="profileSectionHeader"><div><h3>Account details</h3><p className="sectionLead">Your core FixIt identity and verification status.</p></div></div><div className="profileDetailList"><div className="profileDetailRow"><span>Name</span><strong>{loading?'Loading…':profile?.full_name||'Not provided'}</strong></div><div className="profileDetailRow"><span>Email</span><strong>{loading?'Loading…':profile?.email||'Not provided'}</strong></div><div className="profileDetailRow"><span>Phone</span><strong>{loading?'Loading…':profile?.phone_number||'Not provided'}</strong></div><div className="profileDetailRow"><span>Phone verification</span><strong className={profile?.is_phone_verified?'positiveText':'warningText'}>{loading?'Loading…':profile?.phone_number?(profile.is_phone_verified?'Verified':'Not verified'):'Not applicable'}</strong></div><div className="profileDetailRow"><span>Primary address</span><strong>{loading?'Loading…':address}</strong></div><div className="profileDetailRow"><span>Account type</span><strong>{loading?'Loading…':profile?.role||'Not available'}</strong></div>{profile?.created_at?<div className="profileDetailRow"><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong></div>:null}</div></section>
  <button className="profileSignOut" type="button" onClick={signOut}>Sign Out</button><p className="muted accountStatusText" role="status">{message}</p><button className="secondary" type="button" onClick={()=>void load(readCachedUser())} disabled={loading} style={{width:'100%',marginTop:8}}>Refresh Profile</button>
 </main>;
}
