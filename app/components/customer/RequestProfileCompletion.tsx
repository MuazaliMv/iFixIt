'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';

type Atoll={id:string;code?:string|null;display_name:string;sort_order?:number};
type Island={id:string;atoll_id:string;display_name:string;sort_order?:number};
type ProfilePayload={profile?:{full_name?:string|null}|null;error?:string};
type ServiceAddress={id:string;user_id:string;label:string;address_line1:string;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;service_atoll_id?:string|null;service_island_id?:string|null;service_location_unit_id?:string|null;access_instructions?:string|null;is_default:boolean;is_active:boolean;updated_at?:string|null};
type Props={onSaved:()=>Promise<void>|void;onSaveAndSend:()=>void};

function localPhone(value:unknown){
  const digits=String(value??'').replace(/\D/g,'');
  if(digits.length===10&&digits.startsWith('960'))return digits.slice(3);
  if(digits.length>=7)return digits.slice(-7);
  return digits;
}

function addressText(address:ServiceAddress){return [address.address_line1,address.address_line2,address.city,address.state_region].filter(Boolean).join(', ');}

export default function RequestProfileCompletion({onSaved,onSaveAndSend}:Props){
  const[name,setName]=useState('');const[phone,setPhone]=useState('');const[userId,setUserId]=useState('');
  const[addresses,setAddresses]=useState<ServiceAddress[]>([]);const[selectedId,setSelectedId]=useState('');
  const[atolls,setAtolls]=useState<Atoll[]>([]);const[islands,setIslands]=useState<Island[]>([]);
  const[editingId,setEditingId]=useState<string|null>(null);const[showForm,setShowForm]=useState(false);
  const[label,setLabel]=useState('Home');const[house,setHouse]=useState('');const[road,setRoad]=useState('');const[atollId,setAtollId]=useState('');const[islandId,setIslandId]=useState('');const[postalCode,setPostalCode]=useState('');const[accessInstructions,setAccessInstructions]=useState('');
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');

  const filteredIslands=useMemo(()=>islands.filter(i=>!atollId||i.atoll_id===atollId),[islands,atollId]);
  const selectedAtoll=useMemo(()=>atolls.find(a=>a.id===atollId)||null,[atolls,atollId]);
  const selectedIsland=useMemo(()=>islands.find(i=>i.id===islandId&&i.atoll_id===atollId)||null,[islands,islandId,atollId]);
  const selectedAddress=useMemo(()=>addresses.find(a=>a.id===selectedId)||null,[addresses,selectedId]);
  const validContact=name.trim().length>=2&&localPhone(phone).length===7;
  const validForm=Boolean(label.trim()&&house.trim()&&road.trim()&&selectedAtoll&&selectedIsland);

  useEffect(()=>{void load();},[]);

  async function load(preferredId?:string){
    setLoading(true);
    try{
      const {data}=await supabase.auth.getSession();const session=data.session;
      if(!session)throw new Error('Your login session has expired. Please sign in again.');
      if(!session.user.phone||!session.user.phone_confirmed_at)throw new Error('OTP verification is required before you can create a service request. Please sign in again and verify your phone.');
      const [profileResponse,locationResponse,addressResponse]=await Promise.all([
        fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'}),
        fetch(LOCATION_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:'{}'}),
        supabase.from('user_service_addresses').select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').eq('is_active',true).order('is_default',{ascending:false}).order('updated_at',{ascending:false})
      ]);
      const profilePayload=await profileResponse.json().catch(()=>({})) as ProfilePayload;
      const locationPayload=await locationResponse.json().catch(()=>({})) as {atolls?:Atoll[];islands?:Island[];error?:string};
      if(!profileResponse.ok||!profilePayload.profile)throw new Error(profilePayload.error||'Unable to load profile.');
      if(!locationResponse.ok)throw new Error(locationPayload.error||'Unable to load location selections.');
      if(addressResponse.error)throw addressResponse.error;
      const nextAddresses=(addressResponse.data||[]) as ServiceAddress[];
      const nextSelected=(preferredId&&nextAddresses.some(a=>a.id===preferredId)?preferredId:'')||nextAddresses.find(a=>a.is_default)?.id||nextAddresses[0]?.id||'';
      setUserId(session.user.id);setPhone(localPhone(session.user.phone));setName(profilePayload.profile.full_name||'');setAtolls(locationPayload.atolls||[]);setIslands(locationPayload.islands||[]);setAddresses(nextAddresses);setSelectedId(nextSelected);
      if(!nextAddresses.length)setShowForm(true);
      if(!(profilePayload.profile.full_name||'').trim())setMessage('Add your full name in Profile before sending the request.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Service Addresses.');}
    finally{setLoading(false);}
  }

  function resetForm(){setEditingId(null);setLabel('Home');setHouse('');setRoad('');setAtollId('');setIslandId('');setPostalCode('');setAccessInstructions('');}
  function addNew(){resetForm();setShowForm(true);setMessage('');}
  function editAddress(address:ServiceAddress){setEditingId(address.id);setLabel(address.label);setHouse(address.address_line1);setRoad(address.address_line2||'');setAtollId(address.service_atoll_id||'');setIslandId(address.service_island_id||'');setPostalCode(address.postal_code||'');setAccessInstructions(address.access_instructions||'');setShowForm(true);setMessage('');}
  function cancelForm(){resetForm();setShowForm(false);setMessage('');}

  async function makeDefault(address:ServiceAddress){
    if(!userId)throw new Error('Your login session has expired.');
    const clear=await supabase.from('user_service_addresses').update({is_default:false}).eq('user_id',userId).eq('is_default',true);
    if(clear.error)throw clear.error;
    const chosen=await supabase.from('user_service_addresses').update({is_default:true}).eq('id',address.id).eq('user_id',userId);
    if(chosen.error)throw chosen.error;
    const profile=await supabase.from('auth_profiles').update({default_service_address_id:address.id,address_line1:address.address_line1,address_line2:address.address_line2||null,city:address.city||null,state_region:address.state_region||null,postal_code:address.postal_code||null,country:address.country||'Maldives',primary_atoll_id:address.service_atoll_id||null,primary_island_id:address.service_island_id||null,primary_location_unit_id:address.service_location_unit_id||null}).eq('user_id',userId);
    if(profile.error)throw profile.error;
    window.dispatchEvent(new Event('fixit:profile-updated'));await onSaved();
  }

  async function selectAddress(address:ServiceAddress){
    setSelectedId(address.id);setMessage('');
    if(!address.is_default){setSaving(true);try{await makeDefault(address);await load(address.id);}catch(error){setMessage(error instanceof Error?error.message:'Unable to select Service Address.');}finally{setSaving(false);}}
  }

  async function saveAddress(event:FormEvent){
    event.preventDefault();if(saving)return;
    if(!validForm){setMessage('Complete the Service Address before saving.');return;}
    if(!userId){setMessage('Your login session has expired.');return;}
    setSaving(true);setMessage(editingId?'Updating Service Address…':'Saving Service Address…');
    try{
      const payload={label:label.trim(),address_line1:house.trim(),address_line2:road.trim(),city:selectedIsland!.display_name,state_region:selectedAtoll!.display_name,postal_code:postalCode.trim()||null,country:'Maldives',service_atoll_id:selectedAtoll!.id,service_island_id:selectedIsland!.id,service_location_unit_id:null,access_instructions:accessInstructions.trim()||null,is_active:true};
      let saved:ServiceAddress;
      if(editingId){const result=await supabase.from('user_service_addresses').update(payload).eq('id',editingId).eq('user_id',userId).select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').single();if(result.error)throw result.error;saved=result.data as ServiceAddress;}
      else{const result=await supabase.from('user_service_addresses').insert({...payload,user_id:userId,is_default:false}).select('id,user_id,label,address_line1,address_line2,city,state_region,postal_code,country,service_atoll_id,service_island_id,service_location_unit_id,access_instructions,is_default,is_active,updated_at').single();if(result.error)throw result.error;saved=result.data as ServiceAddress;}
      await makeDefault(saved);resetForm();setShowForm(false);await load(saved.id);setMessage('Service Address saved and selected.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to save Service Address.');}
    finally{setSaving(false);}
  }

  async function removeAddress(address:ServiceAddress){
    if(saving)return;setSaving(true);setMessage('Removing Service Address…');
    try{
      const result=await supabase.from('user_service_addresses').update({is_active:false,is_default:false}).eq('id',address.id).eq('user_id',userId);if(result.error)throw result.error;
      const remaining=addresses.filter(a=>a.id!==address.id);
      if(address.is_default&&remaining.length)await makeDefault(remaining[0]);
      await load(remaining[0]?.id);setMessage(remaining.length?'Service Address removed.':'Service Address removed. Add a Service Address to continue.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to remove Service Address.');}
    finally{setSaving(false);}
  }

  async function continueRequest(){
    if(saving)return;if(!validContact){setMessage('Your account needs a name and OTP-verified Maldives phone number.');return;}if(!selectedAddress){setMessage('Choose a Service Address before continuing.');return;}
    setSaving(true);setMessage('Confirming Service Address…');
    try{await makeDefault(selectedAddress);setMessage('Service Address confirmed. Sending your request…');onSaveAndSend();}
    catch(error){setMessage(error instanceof Error?error.message:'Unable to confirm Service Address.');setSaving(false);}
  }

  if(loading)return <section className="c3WizardCard c3ProfileCompletion" aria-label="Service Address"><div className="c3Notice">Loading saved Service Addresses…</div></section>;

  return <section className="c3WizardCard c3ProfileCompletion" aria-label="Service Address">
    <div className="c3SectionHead"><div><small>Required before booking</small><h2>Choose Service Address</h2><p>Select where the provider should perform this service. You can save multiple Service Addresses.</p></div></div>
    <div className="c3Review" style={{marginBottom:16}}><div className="c3ReviewRow"><span>Verified phone</span><strong>{phone?`+960 ${phone}`:'Not verified'}</strong></div><div className="c3ReviewRow"><span>Name</span><strong>{name||'Missing'}</strong></div></div>

    {!showForm?<>
      {addresses.length?<div className="c3Urgency" style={{marginBottom:16}}>{addresses.map(address=><div key={address.id} style={{display:'grid',gap:8}}><button type="button" className={selectedId===address.id?'selected':''} onClick={()=>void selectAddress(address)} disabled={saving}><strong>{address.label}{address.is_default?' · Default':''}</strong><span>{addressText(address)}</span></button><div style={{display:'flex',gap:8}}><button type="button" className="c3Secondary" onClick={()=>editAddress(address)} disabled={saving}>Edit</button><button type="button" className="c3Secondary" onClick={()=>void removeAddress(address)} disabled={saving}>Remove</button></div></div>)}</div>:<div className="c3Notice">No saved Service Address yet.</div>}
      <button type="button" className="c3Secondary" onClick={addNew} disabled={saving}>+ Add New Service Address</button>
      {selectedAddress?<div className="c3Review" style={{marginTop:16}}><div className="c3ReviewRow"><span>Selected Service Address</span><strong>{selectedAddress.label}</strong></div><div className="c3ReviewRow"><span>Location</span><strong>{addressText(selectedAddress)}</strong></div>{selectedAddress.postal_code?<div className="c3ReviewRow"><span>Postal code</span><strong>{selectedAddress.postal_code}</strong></div>:null}{selectedAddress.access_instructions?<div className="c3ReviewRow"><span>Access notes</span><strong>{selectedAddress.access_instructions}</strong></div>:null}</div>:null}
      <button className="c3Primary" type="button" onClick={()=>void continueRequest()} disabled={saving||!validContact||!selectedAddress} style={{marginTop:16}}>{saving?'Confirming…':'Use This Service Address & Send Request'}</button>
    </>:null}

    {showForm?<form className="c3Form" onSubmit={saveAddress}>
      <label>Name<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Home, Office, Apartment" disabled={saving} required/></label>
      <label>House / Apartment<input value={house} onChange={e=>setHouse(e.target.value)} autoComplete="address-line1" placeholder="House or apartment" disabled={saving} required/></label>
      <label>Road<input value={road} onChange={e=>setRoad(e.target.value)} autoComplete="address-line2" placeholder="Road / street" disabled={saving} required/></label>
      <label>Atoll / Region<select value={atollId} onChange={e=>{setAtollId(e.target.value);setIslandId('');}} disabled={saving} required><option value="">Select Atoll / Region</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label>
      <label>Island / City<select value={islandId} onChange={e=>setIslandId(e.target.value)} disabled={saving||!atollId} required><option value="">Select Island / City</option>{filteredIslands.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>
      <label>Postal code <span style={{fontWeight:500}}>optional</span><input value={postalCode} onChange={e=>setPostalCode(e.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="Postal code" disabled={saving}/></label>
      <label className="full">Access instructions <span style={{fontWeight:500}}>optional</span><textarea value={accessInstructions} onChange={e=>setAccessInstructions(e.target.value)} placeholder="Floor, unit, gate or directions for the provider" disabled={saving}/></label>
      <div style={{display:'flex',gap:8}}>{addresses.length?<button className="c3Secondary" type="button" onClick={cancelForm} disabled={saving}>Cancel</button>:null}<button className="c3Primary" type="submit" disabled={saving||!validForm}>{saving?'Saving…':editingId?'Update Service Address':'Save Service Address'}</button></div>
    </form>:null}
    {message?<p className="c3Notice" role="status">{message}</p>:null}
  </section>;
}
