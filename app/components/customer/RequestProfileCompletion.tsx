'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';

type Atoll={id:string;code?:string|null;display_name:string;sort_order?:number};
type Island={id:string;atoll_id:string;display_name:string;sort_order?:number};
type ProfilePayload={profile?:{full_name?:string|null;phone_number?:string|null;primaryAddress?:{line1?:string|null;line2?:string|null;city?:string|null;stateRegion?:string|null;postalCode?:string|null}|null}|null;error?:string};
type Props={onSaved:()=>Promise<void>|void;onSaveAndSend:()=>void};
type AddressMode='saved'|'new'|null;

function localPhone(value:unknown){
  const digits=String(value??'').replace(/\D/g,'');
  if(digits.length===10&&digits.startsWith('960'))return digits.slice(3);
  if(digits.length>=7)return digits.slice(-7);
  return digits;
}

function normalizeLocation(value:unknown){
  return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\b(atoll|region|island|city|maldives)\b/g,' ').replace(/\s+/g,' ').trim();
}
function sameLocationName(left:unknown,right:unknown){const a=normalizeLocation(left);const b=normalizeLocation(right);return Boolean(a&&b&&a===b);}
function findAtoll(atolls:Atoll[],value:unknown){const target=normalizeLocation(value);if(!target)return null;return atolls.find(a=>sameLocationName(a.display_name,target)||sameLocationName(a.code,target))||null;}
function findIsland(islands:Island[],value:unknown,atollId?:string|null){const matches=islands.filter(i=>sameLocationName(i.display_name,value));if(atollId){const inAtoll=matches.find(i=>i.atoll_id===atollId);if(inAtoll)return inAtoll;}return matches.length===1?matches[0]:null;}

export default function RequestProfileCompletion({onSaved,onSaveAndSend}:Props){
  const[name,setName]=useState('');const[phone,setPhone]=useState('');const[house,setHouse]=useState('');const[road,setRoad]=useState('');const[postalCode,setPostalCode]=useState('');
  const[atolls,setAtolls]=useState<Atoll[]>([]);const[islands,setIslands]=useState<Island[]>([]);const[atollId,setAtollId]=useState('');const[islandId,setIslandId]=useState('');
  const[addressMode,setAddressMode]=useState<AddressMode>(null);const[hasSavedAddress,setHasSavedAddress]=useState(false);const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');

  const selectedAtoll=useMemo(()=>atolls.find(a=>a.id===atollId)||null,[atolls,atollId]);
  const selectedIsland=useMemo(()=>islands.find(i=>i.id===islandId&&i.atoll_id===atollId)||null,[islands,islandId,atollId]);
  const filteredIslands=useMemo(()=>islands.filter(i=>!atollId||i.atoll_id===atollId),[islands,atollId]);
  const validContact=name.trim().length>=2&&localPhone(phone).length===7;
  const validAddress=Boolean(house.trim()&&road.trim()&&selectedAtoll&&selectedIsland);

  useEffect(()=>{void load();},[]);

  async function load(){
    setLoading(true);
    try{
      const {data}=await supabase.auth.getSession();const session=data.session;
      if(!session)throw new Error('Your login session has expired. Please sign in again.');
      if(!session.user.phone||!session.user.phone_confirmed_at)throw new Error('OTP verification is required before you can create a service request. Please sign in again and verify your phone.');
      const [profileResponse,locationResponse]=await Promise.all([
        fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'}),
        fetch(LOCATION_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:'{}'})
      ]);
      const profilePayload=await profileResponse.json().catch(()=>({})) as ProfilePayload;
      const locationPayload=await locationResponse.json().catch(()=>({})) as {atolls?:Atoll[];islands?:Island[];error?:string};
      if(!profileResponse.ok||!profilePayload.profile)throw new Error(profilePayload.error||'Unable to load profile.');
      if(!locationResponse.ok)throw new Error(locationPayload.error||'Unable to load location selections.');

      const p=profilePayload.profile;const nextAtolls=locationPayload.atolls||[];const nextIslands=locationPayload.islands||[];
      const nextName=p.full_name||'';const nextPhone=localPhone(session.user.phone);const nextHouse=p.primaryAddress?.line1||'';const nextRoad=p.primaryAddress?.line2||'';const nextPostal=p.primaryAddress?.postalCode||'';
      let matchedAtoll=findAtoll(nextAtolls,p.primaryAddress?.stateRegion);let matchedIsland=findIsland(nextIslands,p.primaryAddress?.city,matchedAtoll?.id);
      if(!matchedAtoll&&matchedIsland)matchedAtoll=nextAtolls.find(a=>a.id===matchedIsland?.atoll_id)||null;
      if(matchedAtoll&&!matchedIsland)matchedIsland=findIsland(nextIslands,p.primaryAddress?.city,matchedAtoll.id);
      const savedReady=Boolean(nextHouse.trim()&&nextRoad.trim()&&matchedAtoll&&matchedIsland);

      setAtolls(nextAtolls);setIslands(nextIslands);setName(nextName);setPhone(nextPhone);setHouse(nextHouse);setRoad(nextRoad);setPostalCode(nextPostal);setAtollId(matchedAtoll?.id||'');setIslandId(matchedIsland?.id||'');setHasSavedAddress(savedReady);setAddressMode(savedReady?'saved':'new');
      if(!nextName.trim())setMessage('Enter your full name before continuing.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load your details.');}
    finally{setLoading(false);}
  }

  function chooseSaved(){if(!hasSavedAddress)return;setAddressMode('saved');setMessage('');}
  function chooseNew(){setAddressMode('new');if(hasSavedAddress){setHouse('');setRoad('');setPostalCode('');setAtollId('');setIslandId('');}setMessage('');}

  async function persistAddress(){
    if(!validContact)throw new Error('Your account needs a name and OTP-verified Maldives phone number.');
    if(!validAddress)throw new Error('Complete the service address before continuing.');
    const form=new FormData();form.set('fullName',name.trim());form.set('phoneNumber',localPhone(phone));form.set('primaryAddress',JSON.stringify({line1:house.trim(),line2:road.trim(),city:selectedIsland!.display_name,stateRegion:selectedAtoll!.display_name,postalCode:postalCode.trim()||null,country:'Maldives'}));
    const response=await fetch('/api/user/profile',{method:'PUT',body:form,credentials:'same-origin'});const payload=await response.json().catch(()=>({})) as {error?:string};
    if(!response.ok)throw new Error(payload.error||'Unable to save the service address.');
    window.dispatchEvent(new Event('fixit:profile-updated'));await onSaved();setHasSavedAddress(true);setAddressMode('saved');
  }

  async function continueRequest(event?:FormEvent){
    event?.preventDefault();if(saving)return;
    if(!validContact){setMessage('Your account needs a name and OTP-verified Maldives phone number.');return;}
    if(!addressMode){setMessage('Choose the service address before continuing.');return;}
    if(!validAddress){setMessage('Complete the service address before continuing.');return;}
    setSaving(true);setMessage(addressMode==='new'?'Saving service address…':'Confirming service address…');
    try{if(addressMode==='new')await persistAddress();setMessage('Address confirmed. Sending your request…');onSaveAndSend();}
    catch(error){setMessage(error instanceof Error?error.message:'Unable to continue.');setSaving(false);}
  }

  if(loading)return <section className="c3WizardCard c3ProfileCompletion" aria-label="Service address"><div className="c3Notice">Checking your verified account and saved address…</div></section>;

  return <section className="c3WizardCard c3ProfileCompletion" aria-label="Service address">
    <div className="c3SectionHead"><div><small>Required before booking</small><h2>Choose service address</h2><p>Your phone is taken from the OTP-verified login. Confirm a saved address or add a new one.</p></div></div>

    <div className="c3Review" style={{marginBottom:16}}>
      <div className="c3ReviewRow"><span>Verified phone</span><strong>{phone?`+960 ${phone}`:'Not verified'}</strong></div>
      <div className="c3ReviewRow"><span>Name</span><strong>{name||'Missing'}</strong></div>
    </div>

    <div className="c3Urgency" style={{marginBottom:16}}>
      <button type="button" className={addressMode==='saved'?'selected':''} onClick={chooseSaved} disabled={!hasSavedAddress||saving}><strong>Use saved address</strong><span>{hasSavedAddress?[house,road,selectedIsland?.display_name].filter(Boolean).join(', '):'No complete saved address yet'}</span></button>
      <button type="button" className={addressMode==='new'?'selected':''} onClick={chooseNew} disabled={saving}><strong>Add new address</strong><span>Enter a different service location</span></button>
    </div>

    {addressMode==='new'?<form className="c3Form" onSubmit={continueRequest}>
      {name.trim().length<2?<label>Full name<input value={name} onChange={e=>{setName(e.target.value);setMessage('');}} autoComplete="name" disabled={saving} required/></label>:null}
      <label>House / Apartment<input value={house} onChange={e=>{setHouse(e.target.value);setMessage('');}} autoComplete="address-line1" placeholder="House or apartment" disabled={saving} required/></label>
      <label>Road<input value={road} onChange={e=>{setRoad(e.target.value);setMessage('');}} autoComplete="address-line2" placeholder="Road / street" disabled={saving} required/></label>
      <label>Atoll / Region<select value={atollId} onChange={e=>{setAtollId(e.target.value);setIslandId('');setMessage('');}} disabled={saving} required><option value="">Select Atoll / Region</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label>
      <label>Island / City<select value={islandId} onChange={e=>{setIslandId(e.target.value);setMessage('');}} disabled={saving||!atollId} required><option value="">Select Island / City</option>{filteredIslands.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>
      <label>Postal code <span style={{fontWeight:500}}>optional</span><input value={postalCode} onChange={e=>setPostalCode(e.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="Postal code" disabled={saving}/></label>
      <button className="c3Primary" type="submit" disabled={saving||!validContact||!validAddress}>{saving?'Saving…':'Save address & continue'}</button>
    </form>:null}

    {addressMode==='saved'&&hasSavedAddress?<div>
      <div className="c3Review"><div className="c3ReviewRow"><span>House / Apartment</span><strong>{house}</strong></div><div className="c3ReviewRow"><span>Road</span><strong>{road}</strong></div><div className="c3ReviewRow"><span>Atoll / Region</span><strong>{selectedAtoll?.display_name}</strong></div><div className="c3ReviewRow"><span>Island / City</span><strong>{selectedIsland?.display_name}</strong></div>{postalCode?<div className="c3ReviewRow"><span>Postal code</span><strong>{postalCode}</strong></div>:null}</div>
      <button className="c3Primary" type="button" onClick={()=>void continueRequest()} disabled={saving||!validContact} style={{marginTop:16}}>{saving?'Confirming…':'Confirm address & send request'}</button>
    </div>:null}

    {message?<p className="c3Notice" role="status">{message}</p>:null}
  </section>;
}
