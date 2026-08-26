'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';

type Atoll={id:string;display_name:string;sort_order?:number};
type Island={id:string;atoll_id:string;display_name:string;sort_order?:number};
type ProfilePayload={profile?:{full_name?:string|null;phone_number?:string|null;primaryAddress?:{line1?:string|null;line2?:string|null;city?:string|null;stateRegion?:string|null}|null}|null;error?:string};
type Props={onSaved:()=>Promise<void>|void;onSaveAndSend:()=>void};
type FormStep='contact'|'address';

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
      setAtolls(nextAtolls);
      setIslands(nextIslands);
      setName(p.full_name||'');
      const authPhone=localPhone(session.user.phone);
      setPhone(localPhone(p.phone_number)||authPhone);
      setHouse(p.primaryAddress?.line1||'');
      setRoad(p.primaryAddress?.line2||'');

      const matchedAtoll=nextAtolls.find(a=>sameLocationName(a.display_name,p.primaryAddress?.stateRegion));
      const matchedIsland=nextIslands.find(i=>sameLocationName(i.display_name,p.primaryAddress?.city)&&(!matchedAtoll||i.atoll_id===matchedAtoll.id));
      setAtollId(matchedAtoll?.id||matchedIsland?.atoll_id||'');
      setIslandId(matchedIsland?.id||'');
    }catch(error){
      setMessage(error instanceof Error?error.message:'Unable to load your details.');
    }finally{
      setLoading(false);
    }
  }

  function continueToAddress(event:FormEvent){
    event.preventDefault();
    const normalizedPhone=phone.replace(/\D/g,'');
    if(name.trim().length<2){setMessage('Enter your name.');return;}
    if(normalizedPhone.length!==7){setMessage('Your logged-in account needs a valid 7-digit Maldives contact number.');return;}
    setMessage('');
    setFormStep('address');
  }

  async function saveAndSend(event:FormEvent){
    event.preventDefault();
    const normalizedPhone=phone.replace(/\D/g,'');
    if(name.trim().length<2){setFormStep('contact');setMessage('Enter your name.');return;}
    if(normalizedPhone.length!==7){setFormStep('contact');setMessage('Your logged-in account needs a valid 7-digit Maldives contact number.');return;}
    if(!house.trim()){setMessage('Enter the House / Apartment.');return;}
    if(!road.trim()){setMessage('Enter the Road.');return;}
    if(!selectedAtoll||!selectedIsland){setMessage('Your selected Atoll / Region and Island / City could not be loaded. Go back to the service location step and select the location again.');return;}

    setSaving(true);
    setMessage('Saving your details…');
    try{
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
      setMessage('Details saved. Sending your request…');
      onSaveAndSend();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Unable to save your details.');
      setSaving(false);
    }
  }

  return <section className="c3WizardCard c3ProfileCompletion" aria-label="Complete your details">
    <div className="c3SectionHead"><div><small>Before sending</small><h2>{formStep==='contact'?'Your details':'Service address'}</h2><p>{formStep==='contact'?'We will save these details to your profile.':'Confirm the service address. Your selected location is already filled in.'}</p></div></div>

    {formStep==='contact'?<form className="c3Form" onSubmit={continueToAddress}>
      <label>Full name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" disabled={loading||saving} required/></label>
      <label>Contact number<input value={phone?`+960 ${phone}`:''} readOnly disabled aria-readonly="true"/><small>Verified phone number from the logged-in account.</small></label>
      <button className="c3Primary" type="submit" disabled={loading||saving}>{loading?'Loading…':'Continue'}</button>
    </form>:<form className="c3Form" onSubmit={saveAndSend}>
      <label>House / Apartment<input value={house} onChange={e=>setHouse(e.target.value)} autoComplete="address-line1" placeholder="House or apartment" disabled={loading||saving} required/></label>
      <label>Road<input value={road} onChange={e=>setRoad(e.target.value)} autoComplete="address-line2" placeholder="Road / street" disabled={loading||saving} required/></label>
      <label>Atoll / Region<input value={selectedAtoll?.display_name||''} readOnly disabled aria-readonly="true"/><small>Already selected for this request.</small></label>
      <label>Island / City<input value={selectedIsland?.display_name||''} readOnly disabled aria-readonly="true"/><small>Already selected for this request.</small></label>
      <button className="c3Secondary" type="button" onClick={()=>{setMessage('');setFormStep('contact');}} disabled={saving}>Back</button>
      <button className="c3Primary" type="submit" disabled={loading||saving||!selectedAtoll||!selectedIsland}>{saving?'Saving…':'Save & Send Request'}</button>
    </form>}

    {message?<p className="c3Notice" role="status">{message}</p>:null}
  </section>;
}
