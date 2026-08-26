'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './service-address-manager.css';

type Atoll={id:string;display_name:string};
type Island={id:string;atoll_id:string;display_name:string};
type ServiceAddress={id:string;user_id:string;label:string;address_line1:string;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;service_atoll_id?:string|null;service_island_id?:string|null;service_location_unit_id?:string|null;access_instructions?:string|null;is_default:boolean;is_active:boolean;updated_at?:string|null};

const emptyForm={label:'Home',house:'',road:'',atollId:'',islandId:'',postalCode:'',accessInstructions:''};

export default function ServiceAddressManager(){
 const[userId,setUserId]=useState('');const[addresses,setAddresses]=useState<ServiceAddress[]>([]);const[atolls,setAtolls]=useState<Atoll[]>([]);const[islands,setIslands]=useState<Island[]>([]);
 const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[editingId,setEditingId]=useState<string|null>(null);const[showForm,setShowForm]=useState(false);const[message,setMessage]=useState('');
 const[label,setLabel]=useState(emptyForm.label);const[house,setHouse]=useState('');const[road,setRoad]=useState('');const[atollId,setAtollId]=useState('');const[islandId,setIslandId]=useState('');const[postalCode,setPostalCode]=useState('');const[accessInstructions,setAccessInstructions]=useState('');
 const filteredIslands=useMemo(()=>islands.filter(i=>i.atoll_id===atollId),[islands,atollId]);
 const selectedAtoll=atolls.find(a=>a.id===atollId)||null;const selectedIsland=islands.find(i=>i.id===islandId&&i.atoll_id===atollId)||null;

 useEffect(()=>{void load();},[]);

 async function load(){
  setLoading(true);
  try{
   const{data}=await supabase.auth.getSession();const session=data.session;
   if(!session)throw new Error('Sign in to manage Service Addresses.');
   if(!session.user.phone||!session.user.phone_confirmed_at)throw new Error('OTP verification is required to manage Service Addresses.');
   const[addressResponse,atollResponse,islandResponse]=await Promise.all([
    supabase.from('user_service_addresses').select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').eq('user_id',session.user.id).eq('is_active',true).order('is_default',{ascending:false}).order('updated_at',{ascending:false}),
    supabase.from('atolls').select('id,display_name').eq('is_active',true).eq('is_serviceable',true).order('sort_order').order('display_name'),
    supabase.from('islands').select('id,atoll_id,display_name').eq('is_active',true).eq('is_serviceable',true).order('sort_order').order('display_name')
   ]);
   if(addressResponse.error)throw addressResponse.error;if(atollResponse.error)throw atollResponse.error;if(islandResponse.error)throw islandResponse.error;
   setUserId(session.user.id);setAddresses((addressResponse.data||[]) as ServiceAddress[]);setAtolls((atollResponse.data||[]) as Atoll[]);setIslands((islandResponse.data||[]) as Island[]);
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Service Addresses.');}
  finally{setLoading(false);}
 }

 function resetForm(){setEditingId(null);setLabel('Home');setHouse('');setRoad('');setAtollId('');setIslandId('');setPostalCode('');setAccessInstructions('');}
 function startAdd(){resetForm();setShowForm(true);setMessage('');}
 function startEdit(a:ServiceAddress){setEditingId(a.id);setLabel(a.label);setHouse(a.address_line1);setRoad(a.address_line2||'');setAtollId(a.service_atoll_id||'');setIslandId(a.service_island_id||'');setPostalCode(a.postal_code||'');setAccessInstructions(a.access_instructions||'');setShowForm(true);setMessage('');}

 function validate(){
  if(label.trim().length<2||label.trim().length>40)return 'Name must be between 2 and 40 characters.';
  if(house.trim().length<2||house.trim().length>120)return 'Enter a valid House / Apartment.';
  if(road.trim().length<2||road.trim().length>120)return 'Enter a valid Road.';
  if(!selectedAtoll)return 'Select an Atoll / Region.';
  if(!selectedIsland)return 'Select an Island / City from the selected Atoll / Region.';
  if(postalCode.trim()&&!/^\d{4,10}$/.test(postalCode.trim()))return 'Postal code must contain 4 to 10 digits.';
  if(accessInstructions.trim().length>240)return 'Access instructions must be 240 characters or fewer.';
  return '';
 }

 async function syncProfile(a:ServiceAddress){
  const profile=await supabase.from('auth_profiles').update({default_service_address_id:a.id,address_line1:a.address_line1,address_line2:a.address_line2||null,city:a.city||null,state_region:a.state_region||null,postal_code:a.postal_code||null,country:a.country||'Maldives',primary_atoll_id:a.service_atoll_id||null,primary_island_id:a.service_island_id||null,primary_location_unit_id:a.service_location_unit_id||null}).eq('user_id',userId);
  if(profile.error)throw profile.error;
  const legacy=await supabase.from('users').update({address_line1:a.address_line1,address_line2:a.address_line2||null,city:a.city||null,state_region:a.state_region||null,postal_code:a.postal_code||null,country:a.country||'Maldives',default_island_id:a.service_island_id||null}).eq('id',userId);
  if(legacy.error)throw legacy.error;
  window.dispatchEvent(new Event('fixit:profile-updated'));
 }

 async function makeDefault(a:ServiceAddress){
  if(busy||a.is_default)return;setBusy(true);setMessage('Updating default Service Address…');
  try{
   const result=await supabase.from('user_service_addresses').update({is_default:true}).eq('id',a.id).eq('user_id',userId).eq('is_active',true).select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').single();
   if(result.error)throw result.error;await syncProfile(result.data as ServiceAddress);await load();setMessage('Default Service Address updated.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update default Service Address.');}finally{setBusy(false);}
 }

 async function save(event:FormEvent){
  event.preventDefault();if(busy)return;const validation=validate();if(validation){setMessage(validation);return;}if(!userId){setMessage('Your login session has expired.');return;}
  setBusy(true);setMessage(editingId?'Updating Service Address…':'Saving Service Address…');
  try{
   const payload={label:label.trim(),address_line1:house.trim(),address_line2:road.trim(),city:selectedIsland!.display_name,state_region:selectedAtoll!.display_name,postal_code:postalCode.trim()||null,country:'Maldives',service_atoll_id:selectedAtoll!.id,service_island_id:selectedIsland!.id,service_location_unit_id:null,access_instructions:accessInstructions.trim()||null,is_active:true};
   let saved:ServiceAddress;const existing=editingId?addresses.find(a=>a.id===editingId):null;
   if(editingId){const result=await supabase.from('user_service_addresses').update(payload).eq('id',editingId).eq('user_id',userId).select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').single();if(result.error)throw result.error;saved=result.data as ServiceAddress;}
   else{const result=await supabase.from('user_service_addresses').insert({...payload,user_id:userId,is_default:addresses.length===0}).select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').single();if(result.error)throw result.error;saved=result.data as ServiceAddress;}
   if(addresses.length===0||existing?.is_default)await syncProfile({...saved,is_default:true});
   resetForm();setShowForm(false);await load();setMessage(addresses.length===0?'Service Address saved as your default.':'Service Address saved.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to save Service Address.');}finally{setBusy(false);}
 }

 async function remove(a:ServiceAddress){
  if(busy)return;if(!window.confirm(`Delete ${a.label}?${a.is_default?' The next saved address will automatically become your default.':''}`))return;
  setBusy(true);setMessage('Deleting Service Address…');
  try{
   const result=await supabase.from('user_service_addresses').update({is_active:false,is_default:false}).eq('id',a.id).eq('user_id',userId);if(result.error)throw result.error;
   await load();window.dispatchEvent(new Event('fixit:profile-updated'));setMessage(a.is_default?'Service Address deleted. The next saved address is now the default.':'Service Address deleted.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to delete Service Address.');}finally{setBusy(false);}
 }

 return <section className="serviceAddressManager" id="manage-service-addresses" aria-labelledby="service-address-manager-title">
  <div className="serviceAddressManagerHead"><div><small>SERVICE ADDRESSES</small><h2 id="service-address-manager-title">Manage service addresses</h2><p>Choose a default address for your profile, or keep additional addresses for future service requests.</p></div>{!showForm?<button type="button" className="samPrimary" onClick={startAdd} disabled={loading||busy}>+ Add Address</button>:null}</div>
  {loading?<p className="samStatus">Loading Service Addresses…</p>:null}
  {!loading&&!addresses.length&&!showForm?<div className="samEmpty"><strong>No Service Address saved</strong><span>Add your first address. It will automatically become your default.</span></div>:null}
  {!loading&&addresses.length?<div className="samList">{addresses.map(a=><article className={`samAddress${a.is_default?' isDefault':''}`} key={a.id}><div className="samAddressTop"><div><strong>{a.label}</strong>{a.is_default?<span className="samDefaultBadge">Default</span>:null}</div><p>{[a.address_line1,a.address_line2,a.city,a.state_region,a.postal_code].filter(Boolean).join(', ')}</p></div><div className="samActions">{!a.is_default?<button type="button" onClick={()=>void makeDefault(a)} disabled={busy}>Make Default</button>:null}<button type="button" onClick={()=>startEdit(a)} disabled={busy}>Edit</button><button type="button" className="danger" onClick={()=>void remove(a)} disabled={busy}>Delete</button></div></article>)}</div>:null}
  {showForm?<form className="samForm" onSubmit={save} noValidate><div className="samFormTitle"><strong>{editingId?'Edit Service Address':'Add Service Address'}</strong><button type="button" onClick={()=>{resetForm();setShowForm(false);setMessage('');}} disabled={busy}>Cancel</button></div><div className="samGrid">
   <label>Name<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={40} placeholder="Home, Office, Apartment" disabled={busy} required/></label>
   <label>House / Apartment<input value={house} onChange={e=>setHouse(e.target.value)} maxLength={120} autoComplete="address-line1" disabled={busy} required/></label>
   <label>Road<input value={road} onChange={e=>setRoad(e.target.value)} maxLength={120} autoComplete="address-line2" disabled={busy} required/></label>
   <label>Atoll / Region<select value={atollId} onChange={e=>{setAtollId(e.target.value);setIslandId('');}} disabled={busy} required><option value="">Select Atoll / Region</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label>
   <label>Island / City<select value={islandId} onChange={e=>setIslandId(e.target.value)} disabled={busy||!atollId} required><option value="">{atollId?'Select Island / City':'Select Atoll / Region first'}</option>{filteredIslands.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>
   <label>Postal code <span>optional</span><input value={postalCode} onChange={e=>setPostalCode(e.target.value.replace(/\D/g,'').slice(0,10))} inputMode="numeric" autoComplete="postal-code" disabled={busy}/></label>
   <label className="samWide">Access instructions <span>optional</span><textarea value={accessInstructions} onChange={e=>setAccessInstructions(e.target.value.slice(0,240))} maxLength={240} disabled={busy}/><small>{accessInstructions.length}/240</small></label>
  </div><button type="submit" className="samPrimary samSave" disabled={busy}>{busy?'Saving…':editingId?'Update Address':'Save Address'}</button></form>:null}
  {message?<p className="samStatus" role="status" aria-live="polite">{message}</p>:null}
 </section>;
}
