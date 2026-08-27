'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './profile-redesign.css';

const ONBOARDING_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-onboarding';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type Address={line1?:string|null;line2?:string|null;city?:string|null;ward?:string|null;stateRegion?:string|null;postalCode?:string|null;country?:string|null};
type ServiceAddress={id?:string;label?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;ward?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;access_instructions?:string|null;is_default?:boolean|null};
type Profile={user_id:string;email?:string|null;full_name?:string|null;role:Role;provider_approved?:boolean;phone_number?:string|null;is_phone_verified?:boolean;profile_photo_url?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;ward?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;account_status?:string|null;created_at?:string|null;updated_at?:string|null;last_active_at?:string|null;primaryAddress?:Address;providerAddress?:Address;serviceAddresses?:ServiceAddress[]};
type ProviderProfile={provider_type?:string;public_name?:string|null;business_name?:string|null;description?:string|null;experience_years?:number|null;service_area_text?:string|null;availability_status?:string|null;accepting_leads?:boolean;onboarding_status?:string|null;submitted_at?:string|null;approved_at?:string|null};
type Category={id:string;name:string};
type ProviderHour={day_of_week:number;is_working:boolean;start_time?:string|null;end_time?:string|null};
type ProviderArea={id?:string;islandName?:string|null;locationUnitName?:string|null};
type ProviderData={profile?:ProviderProfile|null;categories?:Category[];selectedCategoryIds?:string[];hours?:ProviderHour[];serviceAreas?:ProviderArea[]};
type AtollLookup={id:string;official_name:string;display_name:string;sort_order:number};
type IslandLookup={id:string;atoll_id:string;canonical_name:string;display_name:string;location_kind:'ISLAND'|'CITY';sort_order:number};
type PostalChoice={postalCode:string;matchedAddress?:string|null};

function localPhone(v?:string|null){const raw=(v||'').trim();return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw.replace(/\D/g,'').slice(-7);}
function value(v?:string|null){return String(v||'').trim()||'Not provided';}
function pretty(v?:string|null){const raw=String(v||'').trim();return raw?raw.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):'Not available';}
function addressText(a?:Address|null){if(!a)return'Not provided';return[a.line1,a.line2,a.city,a.ward,a.stateRegion,a.postalCode,a.country].filter(Boolean).join(', ')||'Not provided';}

async function profileRequest(){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store',signal:controller.signal});const payload=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(payload?.error||'Unable to load profile.'),{status:response.status});if(!payload?.profile)throw new Error('Profile data was not returned.');return payload.profile as Profile;}finally{clearTimeout(timer);}
}

async function providerRequest(){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const{data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)return null;
  const response=await fetch(ONBOARDING_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'get'}),cache:'no-store',signal:controller.signal});
  if(!response.ok)return null;return await response.json() as ProviderData;
 }catch(error){if(error instanceof Error&&error.name==='AbortError')return null;return null;}finally{clearTimeout(timer);}
}

async function locationLookupRequest(){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('/api/locations/catalogue',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||'Unable to load Maldives location list.');
  const atolls=(Array.isArray(payload?.atolls)?payload.atolls:[]) as AtollLookup[];
  const islands=(Array.isArray(payload?.islands)?payload.islands:[]) as IslandLookup[];
  if(!atolls.length)throw new Error('No active Atoll / Region records were returned.');
  return {atolls,islands};
 }finally{clearTimeout(timer);}
}

export default function ProfileClient(){
 const[profile,setProfile]=useState<Profile|null>(null);const[providerData,setProviderData]=useState<ProviderData|null>(null);const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[loggingOut,setLoggingOut]=useState(false);const[message,setMessage]=useState('Loading profile…');const[name,setName]=useState('');const[email,setEmail]=useState('');const[phone,setPhone]=useState('');const[line1,setLine1]=useState('');const[line2,setLine2]=useState('');const[city,setCity]=useState('');const[ward,setWard]=useState('');const[stateRegion,setStateRegion]=useState('');const[postalCode,setPostalCode]=useState('');const[postalChoices,setPostalChoices]=useState<PostalChoice[]>([]);const[atolls,setAtolls]=useState<AtollLookup[]>([]);const[islands,setIslands]=useState<IslandLookup[]>([]);const[locationLookupLoading,setLocationLookupLoading]=useState(true);const[locationError,setLocationError]=useState('');const[postalLookupLoading,setPostalLookupLoading]=useState(false);
 useEffect(()=>{void load();void loadLocationLookups();},[]);

 function populate(p:Profile){
  const a=p.primaryAddress||{line1:p.address_line1,line2:p.address_line2,city:p.city,ward:p.ward,stateRegion:p.state_region,postalCode:p.postal_code,country:p.country||'Maldives'};
  setName(p.full_name||'');setEmail(p.email||'');setPhone(localPhone(p.phone_number));setLine1(a?.line1||'');setLine2(a?.line2||'');setCity(a?.city||'');setWard(a?.ward||'');setStateRegion(a?.stateRegion||'');setPostalCode(a?.postalCode||'');setPostalChoices(a?.postalCode?[{postalCode:a.postalCode}]:[]);
 }

 async function loadLocationLookups(){
  setLocationLookupLoading(true);setLocationError('');
  try{const lookups=await locationLookupRequest();setAtolls(lookups.atolls);setIslands(lookups.islands);}
  catch(error){setAtolls([]);setIslands([]);setLocationError(error instanceof Error?error.message:'Unable to load Maldives location list.');}
  finally{setLocationLookupLoading(false);}
 }

 async function lookupPostalCode(cityValue=city,stateValue=stateRegion,wardValue=ward){
  if(!cityValue||!stateValue){setPostalCode('');setPostalChoices([]);return;}
  setPostalLookupLoading(true);
  try{
   const params=new URLSearchParams({city:cityValue,atoll:stateValue,ward:wardValue,line1:line1.trim(),line2:line2.trim()});
   const response=await fetch(`/api/locations/postal-code?${params.toString()}`,{credentials:'same-origin',cache:'no-store'});
   const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||'Unable to look up postal code.');
   const choices=(Array.isArray(payload?.postalCodes)?payload.postalCodes:[]).map((item:any)=>({postalCode:String(item?.postalCode||'').trim(),matchedAddress:item?.matchedAddress||null})).filter((item:PostalChoice)=>item.postalCode);
   const fallback=String(payload?.postalCode||'').trim();const normalizedChoices=choices.length?choices:(fallback?[{postalCode:fallback,matchedAddress:payload?.matchedAddress||null}]:[]);
   setPostalChoices(normalizedChoices);setPostalCode(current=>normalizedChoices.some((item:PostalChoice)=>item.postalCode===current)?current:(normalizedChoices[0]?.postalCode||''));
   setMessage(normalizedChoices.length>1?`${normalizedChoices.length} postal codes found. Select the correct one.`:normalizedChoices.length===1?'Postal code found.':'Postal code was not found for this location.');
  }catch(error){setPostalCode('');setPostalChoices([]);setMessage(error instanceof Error?error.message:'Unable to look up postal code.');}finally{setPostalLookupLoading(false);}
 }

 async function refreshProviderData(){const nextProvider=await providerRequest();setProviderData(nextProvider);}

 async function load(){
  setLoading(true);setMessage('Loading profile…');
  try{
   const next=await profileRequest();const normalized={...next,phone_number:localPhone(next.phone_number)};
   setProfile(normalized);populate(normalized);setMessage('Profile is up to date.');setLoading(false);
   if(normalized.provider_approved)void refreshProviderData();else setProviderData(null);
  }catch(error:any){if(error?.status===401){window.location.replace('/login?next=%2Fprofile');return;}const timedOut=error instanceof Error&&(error.name==='AbortError'||error.name==='TimeoutError');setMessage(timedOut?'Profile service is taking longer than expected. Tap Refresh to retry.':error instanceof Error?error.message:'Unable to load profile details.');setLoading(false);}
 }

 async function saveProfile(){
  if(loading||saving)return;const trimmedName=name.trim();const trimmedEmail=email.trim().toLowerCase();
  if(trimmedEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)){setMessage('Enter a valid email address or leave it blank to remove it.');return;}
  setSaving(true);setMessage('Saving profile…');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const form=new FormData();form.set('fullName',trimmedName);form.set('email',trimmedEmail);form.set('primaryAddress',JSON.stringify({line1:line1.trim()||null,line2:line2.trim()||null,city:city.trim()||null,ward:ward.trim()||null,stateRegion:stateRegion.trim()||null,postalCode:postalCode.trim()||null,country:'Maldives'}));
   const response=await fetch('/api/user/profile',{method:'PUT',body:form,credentials:'same-origin',signal:controller.signal});const payload=await response.json().catch(()=>({}));if(response.status===401){window.location.replace('/login?next=%2Fprofile');return;}if(!response.ok)throw new Error(payload?.error||'Unable to update profile.');
   const next=await profileRequest();const normalized={...next,phone_number:localPhone(next.phone_number)};const saved=normalized.primaryAddress||{};
   if((normalized.email||'')!==trimmedEmail||(normalized.full_name||'')!==trimmedName||(saved.city||'')!==city.trim()||(saved.ward||'')!==(ward.trim()||'')||(saved.stateRegion||'')!==stateRegion.trim()||(saved.postalCode||'')!==(postalCode.trim()||''))throw new Error('Profile save could not be verified. Please try again.');
   setProfile(normalized);populate(normalized);if(normalized.provider_approved)void refreshProviderData();else setProviderData(null);setMessage('Profile updated successfully.');window.dispatchEvent(new Event('fixit:profile-updated'));
  }catch(error){const timedOut=error instanceof Error&&(error.name==='AbortError'||error.name==='TimeoutError');setMessage(timedOut?'Save timed out. Please try again.':error instanceof Error?error.message:'Unable to update profile.');}finally{clearTimeout(timer);setSaving(false);}
 }

 async function logout(){
  if(loggingOut)return;setLoggingOut(true);setMessage('Signing out…');
  try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>null);await supabase.auth.signOut();window.location.replace('/login');}
  catch{setMessage('Unable to sign out. Please try again.');setLoggingOut(false);}
 }

 const selectedAtoll=atolls.find(a=>a.display_name===stateRegion||a.official_name===stateRegion)||null;
 const availableIslands=selectedAtoll?islands.filter(i=>i.atoll_id===selectedAtoll.id):[];
 const selectedIsland=availableIslands.find(i=>i.display_name===city||i.canonical_name===city)||null;
 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();const serviceAddresses=profile?.serviceAddresses||[];const pp=providerData?.profile;const selectedNames=(providerData?.categories||[]).filter(c=>(providerData?.selectedCategoryIds||[]).includes(c.id)).map(c=>c.name);const areas=providerData?.serviceAreas||[];const hours=providerData?.hours||[];const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

 return <main className="profileRedesignPage"><div className="profileRedesignShell"><div className="profileRedesignGrid">
  <aside className="profileSidebar"><section className="profileSummaryCard"><div className="profileSummaryAvatarWrap">{profile?.profile_photo_url?<img className="profileSummaryAvatar" src={profile.profile_photo_url} alt="Profile"/>:<div className="profileSummaryAvatar profileInitial">{initial}</div>}</div><h2>{loading?'Loading…':profile?.full_name||'Your profile'}</h2><p>{loading?'Loading account…':profile?.email||'Email not provided'}</p><div className="profileRoleRow"><span>{profile?.role||'ACCOUNT'}</span><span>Maldives</span></div></section></aside>
  <div className="profileContentColumn">
   <section className="profileEditCard" id="profile"><form onSubmit={event=>{event.preventDefault();void saveProfile();}} className="profileEditForm">
    <div className="profileFormSection"><h3>Personal Information</h3><div className="profileFormGrid"><label>Full Name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Add full name (optional)" disabled={loading}/><small>Optional. You can complete this later.</small></label><label>Email Address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="Add email address (optional)" maxLength={320} disabled={loading}/><small>Optional. Edit it here, or clear the field and save to remove it.</small></label></div></div>
    <div className="profileFormSection"><h3>Contact</h3><div className="profileFormGrid"><label>Phone Number (verified)<span className="profilePhoneField"><b>🇲🇻 +960</b><input type="tel" inputMode="numeric" value={phone} readOnly aria-readonly="true" title="Verified phone number cannot be changed from Profile" /></span></label><label>Country / Region<input value="Maldives" autoComplete="country-name" readOnly disabled/></label></div></div>
    <div className="profileFormSection" id="service-addresses"><h3>Primary address <small>(optional)</small></h3><div className="profileFormGrid">
     <label className="wide">House / Building Name<input value={line1} onChange={e=>setLine1(e.target.value)} onBlur={()=>{if(city&&stateRegion)void lookupPostalCode();}} placeholder="House or building name" autoComplete="address-line1" disabled={loading}/></label>
     <label>Street / Additional Address<input value={line2} onChange={e=>setLine2(e.target.value)} onBlur={()=>{if(city&&stateRegion)void lookupPostalCode();}} placeholder="Street, floor or apartment" autoComplete="address-line2" disabled={loading}/></label>
     <label>Atoll / Region<select value={selectedAtoll?.id||''} onChange={e=>{const next=atolls.find(a=>a.id===e.target.value);setStateRegion(next?.display_name||'');setCity('');setWard('');setPostalCode('');setPostalChoices([]);}} autoComplete="address-level1" disabled={loading||locationLookupLoading}><option value="">{locationLookupLoading?'Loading atolls…':locationError?'Unable to load atolls':'Not selected'}</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select>{locationError?<><small role="alert">{locationError}</small><button className="secondary" type="button" onClick={()=>void loadLocationLookups()} disabled={locationLookupLoading}>{locationLookupLoading?'Retrying…':'Retry location list'}</button></>:atolls.length?<small>{atolls.length} atolls loaded</small>:null}</label>
     <label>Island / City<select value={selectedIsland?.id||''} onChange={e=>{const next=availableIslands.find(i=>i.id===e.target.value);const nextCity=next?.display_name||'';setCity(nextCity);setWard('');setPostalCode('');setPostalChoices([]);if(nextCity&&selectedAtoll)void lookupPostalCode(nextCity,selectedAtoll.display_name,'');}} autoComplete="address-level2" disabled={loading||locationLookupLoading||!selectedAtoll}><option value="">{!selectedAtoll?'Not selected':locationLookupLoading?'Loading islands…':'Not selected'}</option>{availableIslands.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>
     <label>Ward / Locality <small>(optional)</small><input value={ward} onChange={e=>{const nextWard=e.target.value.slice(0,120);setWard(nextWard);setPostalCode('');setPostalChoices([]);}} onBlur={()=>{if(city&&stateRegion)void lookupPostalCode(city,stateRegion,ward);}} maxLength={120} placeholder="Ward or locality" disabled={loading||!selectedIsland}/></label>
     <label>Postal Code<select value={postalCode} onChange={e=>setPostalCode(e.target.value)} autoComplete="postal-code" disabled={loading||postalLookupLoading||!city}><option value="">{postalLookupLoading?'Looking up postal codes…':!city?'Not selected':postalChoices.length?'Not selected':'No postal code found'}</option>{postalChoices.map(item=><option key={item.postalCode} value={item.postalCode}>{item.postalCode}{item.matchedAddress?` — ${item.matchedAddress}`:''}</option>)}</select></label>
    </div></div>
    <div className="profileFormActions"><button className="primary" type="button" onClick={()=>void saveProfile()} disabled={loading||saving||postalLookupLoading} aria-busy={saving}>{saving?'Saving…':'Save Profile Information'}</button></div><p className="profileSaveState" role="status" aria-live="polite" style={{margin:0}}>{message}</p>
   </form></section>
   <section className="profileSecurityCard"><div><p className="profileInfoEyebrow">ACCOUNT</p><h2>Account actions</h2><p>Securely sign out from this device.</p></div><div className="profileSecurityActions"><button className="secondary" type="button" onClick={()=>void logout()} disabled={loggingOut}>{loggingOut?'Signing out…':'Logout'}</button></div></section>
   {serviceAddresses.length?<section className="profileInfoCard"><div><p className="profileInfoEyebrow">SAVED LOCATIONS</p><h2>Saved service addresses</h2></div><div className="profileLocationList">{serviceAddresses.map((s,i)=><div key={s.id||i}><span>{s.label||`Service location ${i+1}`}{s.is_default?' · Default':''}</span><strong>{[s.address_line1,s.address_line2,s.ward,s.city,s.state_region,s.postal_code,s.country||'Maldives'].filter(Boolean).join(', ')||'Not provided'}</strong></div>)}</div></section>:null}
   {profile?.provider_approved?<><section className="profileInfoCard"><div><p className="profileInfoEyebrow">PROVIDER PROFILE</p><h2>Provider information</h2></div><div className="profileInfoGrid"><div><small>Provider type</small><strong>{pretty(pp?.provider_type)}</strong></div><div><small>Public name</small><strong>{value(pp?.public_name)}</strong></div><div><small>Business name</small><strong>{value(pp?.business_name)}</strong></div><div><small>Approval</small><strong>Approved</strong></div><div><small>Availability</small><strong>{pretty(pp?.availability_status)}</strong></div><div><small>Accepting leads</small><strong>{pp?.accepting_leads?'Yes':'No'}</strong></div></div></section><section className="profileInfoCard"><div><p className="profileInfoEyebrow">SERVICES & COVERAGE</p><h2>Provider location & availability</h2></div><div className="profileLocationList"><div><span>Selected services</span><strong>{selectedNames.length?selectedNames.join(', '):'Not provided'}</strong></div><div><span>Service areas</span><strong>{areas.length?areas.map(x=>[x.islandName,x.locationUnitName].filter(Boolean).join(' — ')).join(', '):'Not provided'}</strong></div><div><span>Provider address</span><strong>{addressText(profile.providerAddress)}</strong></div>{hours.map(h=><div key={h.day_of_week}><span>{days[h.day_of_week-1]||`Day ${h.day_of_week}`}</span><strong>{h.is_working?`${(h.start_time||'').slice(0,5)} – ${(h.end_time||'').slice(0,5)}`:'Not working'}</strong></div>)}</div></section><section className="profileSecurityCard"><div><p className="profileInfoEyebrow">PROVIDER ACCOUNT</p><h2>Verification</h2><p>Keep provider verification documents separate from your permanent account profile.</p></div><div className="profileSecurityActions"><a className="secondary" href="/provider/verification">Verification Documents</a></div></section></>:null}
  </div>
 </div></div></main>;
}
