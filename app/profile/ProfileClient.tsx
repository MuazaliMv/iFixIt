'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './profile-redesign.css';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type Address={line1?:string|null;line2?:string|null;city?:string|null;stateRegion?:string|null;postalCode?:string|null;country?:string|null};
type ServiceAddress={id?:string;label?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;access_instructions?:string|null;is_default?:boolean|null};
type Profile={user_id:string;email?:string|null;full_name?:string|null;role:Role;provider_approved?:boolean;phone_number?:string|null;is_phone_verified?:boolean;profile_photo_url?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;account_status?:string|null;created_at?:string|null;updated_at?:string|null;last_active_at?:string|null;primaryAddress?:Address;providerAddress?:Address;serviceAddresses?:ServiceAddress[]};
type ProviderProfile={provider_type?:string;public_name?:string|null;business_name?:string|null;description?:string|null;experience_years?:number|null;service_area_text?:string|null;availability_status?:string|null;accepting_leads?:boolean;onboarding_status?:string|null;submitted_at?:string|null;approved_at?:string|null};
type Category={id:string;name:string};
type ProviderHour={day_of_week:number;is_working:boolean;start_time?:string|null;end_time?:string|null};
type ProviderArea={id?:string;islandName?:string|null;locationUnitName?:string|null};
type ProviderData={profile?:ProviderProfile|null;categories?:Category[];selectedCategoryIds?:string[];hours?:ProviderHour[];serviceAreas?:ProviderArea[]};

function localPhone(v?:string|null){const raw=(v||'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw.replace(/\D/g,'').slice(-7);}
function value(v?:string|null){return String(v||'').trim()||'Not provided';}
function pretty(v?:string|null){const raw=String(v||'').trim();return raw?raw.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):'Not available';}
function dateTime(v?:string|null){return v?new Date(v).toLocaleString():'Not available';}
function addressText(a?:Address|null){if(!a)return'Not provided';return[a.line1,a.line2,a.city,a.stateRegion,a.postalCode,a.country].filter(Boolean).join(', ')||'Not provided';}

async function profileRequest(){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store',signal:controller.signal});const payload=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(payload?.error||'Unable to load profile.'),{status:response.status});if(!payload?.profile)throw new Error('Profile data was not returned.');return payload.profile as Profile;}finally{clearTimeout(timer);}
}

async function providerRequest(){
 const{data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)return null;
 const response=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'get'}),cache:'no-store'});
 if(!response.ok)return null;return await response.json() as ProviderData;
}

export default function ProfileClient(){
 const[profile,setProfile]=useState<Profile|null>(null);const[providerData,setProviderData]=useState<ProviderData|null>(null);const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('Loading profile…');const[name,setName]=useState('');const[phone,setPhone]=useState('');const[line1,setLine1]=useState('');const[line2,setLine2]=useState('');const[city,setCity]=useState('');const[stateRegion,setStateRegion]=useState('');const[postalCode,setPostalCode]=useState('');
 useEffect(()=>{void load();},[]);

 function populate(p:Profile){
  const a=p.primaryAddress||{line1:p.address_line1,line2:p.address_line2,city:p.city,stateRegion:p.state_region,postalCode:p.postal_code,country:p.country||'Maldives'};
  setName(p.full_name||'');setPhone(localPhone(p.phone_number));setLine1(a?.line1||'');setLine2(a?.line2||'');setCity(a?.city||'');setStateRegion(a?.stateRegion||'');setPostalCode(a?.postalCode||'');
 }

 async function load(){setLoading(true);setMessage('Loading profile…');try{const next=await profileRequest();const normalized={...next,phone_number:localPhone(next.phone_number)};setProfile(normalized);populate(normalized);if(normalized.role==='PROVIDER')setProviderData(await providerRequest());else setProviderData(null);setMessage('Profile is up to date.');}catch(error:any){if(error?.status===401){window.location.replace('/login?next=%2Fprofile');return;}const timedOut=error instanceof Error&&(error.name==='AbortError'||error.name==='TimeoutError');setMessage(timedOut?'Profile service is taking longer than expected. Tap Refresh to retry.':error instanceof Error?error.message:'Unable to load profile details.');}finally{setLoading(false);}}

 async function save(e:FormEvent){
  e.preventDefault();const normalizedPhone=phone.replace(/\D/g,'');if(normalizedPhone&&normalizedPhone.length!==7){setMessage('Enter a valid 7-digit Maldives phone number.');return;}
  setSaving(true);setMessage('Saving profile…');
  try{const form=new FormData();form.set('fullName',name.trim());if(normalizedPhone)form.set('phoneNumber',normalizedPhone);form.set('primaryAddress',JSON.stringify({line1:line1.trim()||null,line2:line2.trim()||null,city:city.trim()||null,stateRegion:stateRegion.trim()||null,postalCode:postalCode.trim()||null,country:'Maldives'}));const response=await fetch('/api/user/profile',{method:'PUT',body:form,credentials:'same-origin'});const payload=await response.json().catch(()=>({}));if(response.status===401){window.location.replace('/login?next=%2Fprofile');return;}if(!response.ok)throw new Error(payload?.error||'Unable to update profile.');await load();setMessage('Profile updated successfully.');window.dispatchEvent(new Event('fixit:profile-updated'));}catch(error){setMessage(error instanceof Error?error.message:'Unable to update profile.');}finally{setSaving(false);}
 }

 function cancelEdit(){if(profile)populate(profile);setMessage('Changes reset.');}
 async function signOut(){await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});window.location.href='/login';}

 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();const serviceAddresses=profile?.serviceAddresses||[];const pp=providerData?.profile;const selectedNames=(providerData?.categories||[]).filter(c=>(providerData?.selectedCategoryIds||[]).includes(c.id)).map(c=>c.name);const areas=providerData?.serviceAreas||[];const hours=providerData?.hours||[];const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const roleLabel=profile?.role==='PROVIDER'?'Service Provider':profile?.role==='ADMIN'?'Administrator':'Customer';

 return <main className="profileRedesignPage">
  <div className="profileRedesignShell">
   <header className="profileRedesignTitlebar"><div><p className="profileBreadcrumb">Account / <span>Profile & Settings</span></p><h1>{roleLabel} Profile & Settings</h1><p>Manage your contact details, service locations and account settings.</p></div><span className={`profileVerified ${profile?.is_phone_verified?'ok':''}`}><i/>{profile?.is_phone_verified?'Phone verified':'Account active'}</span></header>

   <div className="profileRedesignGrid">
    <aside className="profileSidebar">
     <section className="profileSummaryCard"><div className="profileSummaryAvatarWrap">{profile?.profile_photo_url?<img className="profileSummaryAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileSummaryAvatar profileInitial">{initial}</div>}</div><h2>{loading?'Loading…':profile?.full_name||'Your profile'}</h2><p>{loading?'Loading account…':profile?.email||'Email not provided'}</p><div className="profileRoleRow"><span>{profile?.role||'ACCOUNT'}</span><span>Maldives</span></div><div className="profileSummaryStats"><div><small>Saved service addresses</small><strong>{serviceAddresses.length}</strong></div><div><small>Account status</small><strong>{pretty(profile?.account_status)}</strong></div></div></section>
     <nav className="profileSettingsNav" aria-label="Profile settings"><a className="active" href="#profile">Profile Information</a><a href="#service-addresses">Maldives Locations</a><a href="/change-password">Security & Password</a><a href="/notifications">Notifications & Alerts</a></nav>
    </aside>

    <div className="profileContentColumn">
     <section className="profileEditCard" id="profile"><div className="profileEditHeader"><div><h2>Edit {roleLabel} Details</h2><p>Update the information used across your iFixMV account and service requests.</p></div><span className="profileSaveState" role="status">{message}</span></div>
      <form onSubmit={save} className="profileEditForm">
       <div className="profileFormSection"><h3>Personal Information</h3><div className="profileFormGrid"><label>Full Name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required disabled={loading}/></label><label>Email Address<input value={profile?.email||''} readOnly disabled/></label></div></div>
       <div className="profileFormSection"><h3>Contact</h3><div className="profileFormGrid"><label>Phone Number (Maldives)<span className="profilePhoneField"><b>🇲🇻 +960</b><input type="tel" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7XXXXXX" maxLength={7} disabled={loading}/></span></label><label>Country / Region<input value="Maldives" readOnly disabled/></label></div></div>
       <div className="profileFormSection" id="service-addresses"><h3>Primary address</h3><div className="profileFormGrid"><label className="wide">House / Building Name<input value={line1} onChange={e=>setLine1(e.target.value)} placeholder="House or building name" disabled={loading}/></label><label>Street / Additional Address<input value={line2} onChange={e=>setLine2(e.target.value)} placeholder="Street, floor or apartment" disabled={loading}/></label><label>Island / City<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Island or city" disabled={loading}/></label><label>Atoll / Region<input value={stateRegion} onChange={e=>setStateRegion(e.target.value)} placeholder="Atoll or region" disabled={loading}/></label><label>Postal Code<input value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="Postal code" disabled={loading}/></label></div></div>
       <div className="profileFormActions"><button className="secondary" type="button" onClick={cancelEdit} disabled={loading||saving}>Cancel</button><button className="primary" type="submit" disabled={loading||saving}>{saving?'Saving…':'Save Profile Information'}</button></div>
      </form>
     </section>

     <section className="profileInfoCard"><div><p className="profileInfoEyebrow">ACCOUNT DETAILS</p><h2>Account overview</h2></div><div className="profileInfoGrid"><div><small>Role</small><strong>{profile?.role||'—'}</strong></div><div><small>Phone verification</small><strong>{profile?.phone_number?(profile.is_phone_verified?'Verified':'Not verified'):'Not available'}</strong></div><div><small>Joined</small><strong>{dateTime(profile?.created_at)}</strong></div><div><small>Last active</small><strong>{dateTime(profile?.last_active_at)}</strong></div></div></section>

     {serviceAddresses.length?<section className="profileInfoCard"><div><p className="profileInfoEyebrow">SAVED LOCATIONS</p><h2>Saved service addresses</h2></div><div className="profileLocationList">{serviceAddresses.map((s,i)=><div key={s.id||i}><span>{s.label||`Service location ${i+1}`}{s.is_default?' · Default':''}</span><strong>{[s.address_line1,s.address_line2,s.city,s.state_region,s.postal_code,s.country||'Maldives'].filter(Boolean).join(', ')||'Not provided'}</strong></div>)}</div></section>:null}

     {profile?.role==='PROVIDER'?<>
      <section className="profileInfoCard"><div><p className="profileInfoEyebrow">PROVIDER PROFILE</p><h2>Provider information</h2></div><div className="profileInfoGrid"><div><small>Provider type</small><strong>{pretty(pp?.provider_type)}</strong></div><div><small>Public name</small><strong>{value(pp?.public_name)}</strong></div><div><small>Business name</small><strong>{value(pp?.business_name)}</strong></div><div><small>Approval</small><strong>{profile.provider_approved?'Approved':'Pending'}</strong></div><div><small>Availability</small><strong>{pretty(pp?.availability_status)}</strong></div><div><small>Accepting leads</small><strong>{pp?.accepting_leads?'Yes':'No'}</strong></div></div></section>
      <section className="profileInfoCard"><div><p className="profileInfoEyebrow">SERVICES & COVERAGE</p><h2>Provider location & availability</h2></div><div className="profileLocationList"><div><span>Selected services</span><strong>{selectedNames.length?selectedNames.join(', '):'Not provided'}</strong></div><div><span>Service areas</span><strong>{areas.length?areas.map(x=>[x.islandName,x.locationUnitName].filter(Boolean).join(' — ')).join(', '):'Not provided'}</strong></div><div><span>Provider address</span><strong>{addressText(profile.providerAddress)}</strong></div>{hours.map(h=><div key={h.day_of_week}><span>{days[h.day_of_week-1]||`Day ${h.day_of_week}`}</span><strong>{h.is_working?`${(h.start_time||'').slice(0,5)} – ${(h.end_time||'').slice(0,5)}`:'Not working'}</strong></div>)}</div></section>
     </>:null}

     <section className="profileSecurityCard"><div><p className="profileInfoEyebrow">SECURITY & ACCOUNT</p><h2>Account controls</h2><p>Use the dedicated pages for password and notification settings.</p></div><div className="profileSecurityActions"><a className="secondary" href="/change-password">Change Password</a><a className="secondary" href="/notifications">Notifications</a><button className="profileSignOutButton" type="button" onClick={signOut}>Sign Out</button></div></section>
    </div>
   </div>
  </div>
 </main>;
}
