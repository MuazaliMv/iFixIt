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

function timeout<T>(promise:PromiseLike<T>,ms:number,label:string):Promise<T>{
 return Promise.race([
  Promise.resolve(promise),
  new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out.`)),ms)),
 ]);
}

function localPhone(value?:string|null){
 const raw=(value||'').trim();
 return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw;
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
   const sessionResult=await timeout(supabase.auth.getSession(),5000,'Session');
   const session=sessionResult.data.session;
   if(!session){window.location.href='/login';return;}

   const user=session.user;
   const fallback:Profile={
    user_id:user.id,
    email:user.email||null,
    full_name:(user.user_metadata?.full_name as string|undefined)||null,
    role:((user.user_metadata?.role as Role|undefined)||'CUSTOMER'),
    provider_approved:false,
    phone_number:(user.phone||null),
    is_phone_verified:Boolean(user.phone_confirmed_at),
    country:'Maldives',
    created_at:user.created_at||null,
   };

   // Show authenticated identity immediately; richer profile data can follow.
   setProfile(fallback);
   setName(fallback.full_name||'');
   setPhone(localPhone(fallback.phone_number));
   setMessage('Loading account details…');
   setLoading(false);

   const query=supabase
    .from('auth_profiles')
    .select('user_id,email,full_name,role,provider_approved,phone_number,is_phone_verified,profile_photo_url,address_line1,address_line2,city,state_region,postal_code,country,created_at')
    .eq('user_id',user.id)
    .maybeSingle();
   const result=await timeout(query,6000,'Profile');
   if(result.error)throw result.error;
   if(result.data){
    const next={...fallback,...result.data,phone_number:localPhone(result.data.phone_number)} as Profile;
    setProfile(next);
    setName(next.full_name||'');
    setPhone(next.phone_number||'');
    setMessage('Profile is up to date.');
   }else{
    setMessage('Signed-in account loaded. Complete your profile to add more details.');
   }
  }catch(error){
   setLoading(false);
   setMessage(error instanceof Error?error.message:'Unable to load profile details.');
  }
 }

 async function save(e:FormEvent){
  e.preventDefault();
  setSaving(true);
  setMessage('Saving profile…');
  try{
   const {data}=await supabase.auth.getSession();
   const session=data.session;
   if(!session){window.location.href='/login';return;}
   const form=new FormData();
   form.set('fullName',name.trim());
   if(phone.trim())form.set('phoneNumber',phone.trim());
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   const response=await fetch('/api/user/profile',{method:'PUT',headers:{Authorization:`Bearer ${session.access_token}`},body:form,signal:controller.signal});
   clearTimeout(timer);
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload?.error||'Unable to update profile.');
   setEditing(false);
   await load();
   setMessage('Profile updated.');
  }catch(error){
   setMessage(error instanceof Error?error.message:'Unable to update profile.');
  }finally{setSaving(false);}
 }

 async function signOut(){await supabase.auth.signOut();window.location.href='/login';}

 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();
 const address=[profile?.address_line1,profile?.address_line2,profile?.city,profile?.state_region,profile?.postal_code,profile?.country||'Maldives'].filter(Boolean).join(', ')||'Not provided';

 return <main className="shell accountApp">
  <section className="profileHeroCard">
   <div className="profileIdentity">
    {profile?.profile_photo_url?<img className="profileAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileAvatar">{initial}</div>}
    <div className="profileIdentityCopy">
     <h2>{profile?.full_name||'Your FixIt profile'}</h2>
     <p>{profile?.email||'Email not provided'}</p>
     <div className="profileBadges">{profile?.role?<span className="profileBadge">{profile.role}</span>:null}</div>
    </div>
   </div>
   <button className="secondary profileEditButton" type="button" disabled={!profile||loading} onClick={()=>setEditing(v=>!v)}>{editing?'Close':'Edit Profile'}</button>
  </section>

  {editing?<section className="profileSection">
   <form className="authForm" onSubmit={save}>
    <label>Full name<input value={name} onChange={e=>setName(e.target.value)} required/></label>
    <label>Phone number<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXX"/></label>
    <button className="primary" disabled={saving}>{saving?'Saving…':'Save Profile'}</button>
   </form>
  </section>:null}

  <section className="profileSection">
   <div className="profileSectionHeader"><div><h3>Account details</h3><p className="sectionLead">Your core FixIt identity and verification status.</p></div></div>
   <div className="profileDetailList">
    <div className="profileDetailRow"><span>Name</span><strong>{loading?'Loading…':profile?.full_name||'Not provided'}</strong></div>
    <div className="profileDetailRow"><span>Email</span><strong>{loading?'Loading…':profile?.email||'Not provided'}</strong></div>
    <div className="profileDetailRow"><span>Phone</span><strong>{loading?'Loading…':profile?.phone_number||'Not provided'}</strong></div>
    <div className="profileDetailRow"><span>Phone verification</span><strong className={profile?.is_phone_verified?'positiveText':'warningText'}>{loading?'Loading…':profile?.phone_number?(profile.is_phone_verified?'Verified':'Not verified'):'Not applicable'}</strong></div>
    <div className="profileDetailRow"><span>Primary address</span><strong>{loading?'Loading…':address}</strong></div>
    <div className="profileDetailRow"><span>Account type</span><strong>{loading?'Loading…':profile?.role||'Not available'}</strong></div>
    {profile?.created_at?<div className="profileDetailRow"><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong></div>:null}
   </div>
  </section>

  <button className="profileSignOut" type="button" onClick={signOut}>Sign Out</button>
  <p className="muted accountStatusText" role="status">{message}</p>
  <button className="secondary" type="button" onClick={()=>void load()} disabled={loading} style={{width:'100%',marginTop:8}}>Refresh Profile</button>
 </main>;
}
