'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';

type Atoll={id:string;display_name:string;sort_order?:number};
type Island={id:string;atoll_id:string;display_name:string;sort_order?:number};
type ProfilePayload={profile?:{full_name?:string|null;phone_number?:string|null;primaryAddress?:{line1?:string|null;line2?:string|null;city?:string|null;stateRegion?:string|null}|null}|null;error?:string};
type Props={onSaved:()=>Promise<void>|void;onSaveAndSend:()=>void};
type FormStep='contact'|'address'|'ready';

function localPhone(value:unknown){
  const raw=String(value??'').trim();
  return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw.replace(/\D/g,'').slice(-7);
}

function sameLocationName(left:unknown,right:unknown){
  return String(left??'').trim().toLowerCase()===String(right??'').trim().toLowerCase();
}

export default function RequestProfileCompletion({onSaved,onSaveAndSend}:Props){
  const[name,setName]=useState('');
  const[phone,setPhone]=useState('');
  const[house,setHouse]=useState('');
  const[road,setRoad]=useState('');
  const[atolls,setAtolls]=useState<Atoll[]>([]);
  const[islands,setIslands]=useState<Island[]>([]);
  const[atollId,setAtollId]=useState('');
  const[islandId,setIslandId]=useState('');
  const[formStep,setFormStep]=useState<FormStep>('contact');
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState('');

  const selectedAtoll=useMemo(()=>atolls.find(a=>a.id===atollId)||null,[atolls,atollId]);
  const selectedIsland=useMemo(()=>islands.find(i=>i.id===islandId&&i.atoll_id===atollId)||null,[islands,islandId,atollId]);
  const validContact=name.trim().length>=2&&phone.replace(/\D/g,'').length===7;
  const validAddress=Boolean(house.trim()&&road.trim()&&selectedAtoll&&selectedIsland);

  useEffect(()=>{void load();},[]);

  async function load(){
    setLoading(true);
    try{
      const {data}=await supabase.auth.getSession();
      const session=data.session;
      if(!session)throw new Error('Your login session has expired. Please sign in again.');
      const [profileResponse,locationResponse]=await Promise.all([
        fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'}),
        fetch(LOCATION_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:'{}'})
      ]);
      const profilePayload=await profileResponse.json().catch(()=>({})) as ProfilePayload;
      const locationPayload=await locationResponse.json().catch(()=>({})) as {atolls?:Atoll[];islands?:Island[];error?:string};
      if(!profileResponse.ok||!profilePayload.profile)throw new Error(profilePayload.error||'Unable to load profile.');
      if(!locationResponse.ok)throw new Error(locationPayload.error||'Unable to load location selections.');

      const p=profilePayload.profile;
      const nextAtolls=locationPayload.atolls||[];
      const nextIslands=locationPayload.islands||[];
      const nextName=p.full_name||'';
      const authPhone=localPhone(session.user.phone);
      const nextPhone=localPhone(p.phone_number)||authPhone;
      const nextHouse=p.primaryAddress?.line1||'';
      const nextRoad=p.primaryAddress?.line2||'';
      const matchedAtoll=nextAtolls.find(a=>sameLocationName(a.display_name,p.primaryAddress?.stateRegion));
      const matchedIsland=nextIslands.find(i=>sameLocationName(i.display_name,p.primaryAddress?.city)&&(!matchedAtoll||i.atoll_id===matchedAtoll.id));

      setAtolls(nextAtolls);
      setIslands(nextIslands);
      setName(nextName);
      setPhone(nextPhone);
      setHouse(nextHouse);
      setRoad(nextRoad);
      setAtollId(matchedAtoll?.id||matchedIsland?.atoll_id||'');
      setIslandId(matchedIsland?.id||'');

      const contactReady=nextName.trim().length>=2&&nextPhone.replace(/\D/g,'').length===7;
      const addressReady=Boolean(nextHouse.trim()&&nextRoad.trim()&&matchedAtoll&&matchedIsland);
      setFormStep(contactReady?(addressReady?'ready':'address'):'contact');
    }catch(error){
      setMessage(error instanceof Error?error.message:'Unable to load your details.');
    }finally{
      setLoading(false);
    }
  }

  function continueToAddress(event:FormEvent){
    event.preventDefault();
    if(name.trim().length<2){setMessage('Enter your name.');return;}
    if(phone.replace(/\D/g,'').length!==7){setMessage('Your logged-in account needs a valid 7-digit Maldives contact number.');return;}
    setMessage('');
    setFormStep(validAddress?'ready':'address');
  }

  async function saveProfile(){
    const normalizedPhone=phone.replace(/\D/g,'');
    if(name.trim().length<2){setFormStep('contact');throw new Error('Enter your name.');}
    if(normalizedPhone.length!==7){setFormStep('contact');throw new Error('Your logged-in account needs a valid 7-digit Maldives contact number.');}
    if(!house.trim()){setFormStep('address');throw new Error('Enter the House / Apartment.');}
    if(!road.trim()){setFormStep('address');throw new Error('Enter the Road.');}
    if(!selectedAtoll||!selectedIsland){setFormStep('address');throw new Error('Your selected service location could not be loaded. Update the saved service address and try again.');}

    const form=new FormData();
    form.set('fullName',name.trim());
    form.set('phoneNumber',normalizedPhone);
    form.set('primaryAddress',JSON.stringify({
      line1:house.trim(),
      line2:road.trim(),
      city:selectedIsland.display_name,
      stateRegion:selectedAtoll.display_name,
      postalCode:null,
      country:'Maldives'
    }));
    const response=await fetch('/api/user/profile',{method:'PUT',body:form,credentials:'same-origin'});
    const payload=await response.json().catch(()=>({})) as {error?:string};
    if(!response.ok)throw new Error(payload.error||'Unable to update your profile.');
    window.dispatchEvent(new Event('fixit:profile-updated'));
    await onSaved();
  }

  async function saveAndSend(event?:FormEvent){
    event?.preventDefault();
    if(saving)return;
    setSaving(true);
    setMessage(validContact&&validAddress?'Sending your request…':'Saving your details…');
    try{
      if(!validContact||!validAddress)await saveProfile();
      setMessage('Sending your request…');
      onSaveAndSend();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Unable to save your details.');
      setSaving(false);
    }
  }

  if(loading)return <section className="c3WizardCard c3ProfileCompletion" aria-label="Complete your details"><div className="c3Notice">Loading saved details…</div></section>;

  return <section className="c3WizardCard c3ProfileCompletion" aria-label="Complete your details">
    <div className="c3SectionHead"><div><small>Before sending</small><h2>{formStep==='contact'?'Your details':formStep==='address'?'Service address':'Ready to send'}</h2><p>{formStep==='contact'?'Only missing account details are required.':formStep==='address'?'Add only the missing street-level address. Your Atoll / Region and Island / City are already selected.':'Your saved contact and service address will be used for this request.'}</p></div></div>

    {formStep==='contact'?<form className="c3Form" onSubmit={continueToAddress}>
      <label>Full name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" disabled={saving} required/></label>
      <label>Verified contact number<div className="c3ReviewRow"><span>Phone</span><strong>{phone?`+960 ${phone}`:'Not available'}</strong></div><small>From the logged-in OTP-verified account.</small></label>
      <button className="c3Primary" type="submit" disabled={saving}>{validAddress?'Continue to review':'Continue'}</button>
    </form>:null}

    {formStep==='address'?<form className="c3Form" onSubmit={saveAndSend}>
      <label>House / Apartment<input value={house} onChange={e=>setHouse(e.target.value)} autoComplete="address-line1" placeholder="House or apartment" disabled={saving} required/></label>
      <label>Road<input value={road} onChange={e=>setRoad(e.target.value)} autoComplete="address-line2" placeholder="Road / street" disabled={saving} required/></label>
      <div className="c3Review full">
        <div className="c3ReviewRow"><span>Atoll / Region</span><strong>{selectedAtoll?.display_name||'Not available'}</strong></div>
        <div className="c3ReviewRow"><span>Island / City</span><strong>{selectedIsland?.display_name||'Not available'}</strong></div>
      </div>
      {!validContact?<button className="c3Secondary" type="button" onClick={()=>{setMessage('');setFormStep('contact');}} disabled={saving}>Back</button>:null}
      <button className="c3Primary" type="submit" disabled={saving||!selectedAtoll||!selectedIsland}>{saving?'Saving…':'Save & Send Request'}</button>
    </form>:null}

    {formStep==='ready'?<div>
      <div className="c3Review">
        <div className="c3ReviewRow"><span>Name</span><strong>{name}</strong></div>
        <div className="c3ReviewRow"><span>Verified phone</span><strong>+960 {phone}</strong></div>
        <div className="c3ReviewRow"><span>Service address</span><strong>{house}, {road}</strong></div>
        <div className="c3ReviewRow"><span>Location</span><strong>{selectedIsland?.display_name}, {selectedAtoll?.display_name}</strong></div>
      </div>
      <button className="c3Primary" type="button" onClick={()=>void saveAndSend()} disabled={saving} style={{marginTop:16}}>{saving?'Sending…':'Send Request'}</button>
    </div>:null}

    {message?<p className="c3Notice" role="status">{message}</p>:null}
  </section>;
}
