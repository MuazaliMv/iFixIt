'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const LOCATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/location-catalogue';

type Atoll={id:string;code?:string|null;display_name:string;sort_order?:number};
type Island={id:string;atoll_id:string;display_name:string;sort_order?:number};
type ProfilePayload={profile?:{full_name?:string|null;phone_number?:string|null;primaryAddress?:{line1?:string|null;line2?:string|null;city?:string|null;stateRegion?:string|null}|null}|null;error?:string};
type Props={onSaved:()=>Promise<void>|void;onSaveAndSend:()=>void};
type FormStep='contact'|'address'|'ready';

function localPhone(value:unknown){
  const digits=String(value??'').replace(/\D/g,'');
  if(digits.length===10&&digits.startsWith('960'))return digits.slice(3);
  if(digits.length>=7)return digits.slice(-7);
  return digits;
}

function normalizeLocation(value:unknown){
  return String(value??'')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(atoll|region|island|city|maldives)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function sameLocationName(left:unknown,right:unknown){
  const a=normalizeLocation(left);
  const b=normalizeLocation(right);
  return Boolean(a&&b&&a===b);
}

function findAtoll(atolls:Atoll[],value:unknown){
  const target=normalizeLocation(value);
  if(!target)return null;
  return atolls.find(a=>sameLocationName(a.display_name,target)||sameLocationName(a.code,target))||null;
}

function findIsland(islands:Island[],value:unknown,atollId?:string|null){
  const matches=islands.filter(i=>sameLocationName(i.display_name,value));
  if(atollId){
    const inAtoll=matches.find(i=>i.atoll_id===atollId);
    if(inAtoll)return inAtoll;
  }
  return matches.length===1?matches[0]:null;
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
  const validContact=name.trim().length>=2&&localPhone(phone).length===7;
  const addressFieldsReady=Boolean(house.trim()&&road.trim());
  const locationReady=Boolean(selectedAtoll&&selectedIsland);
  const validAddress=addressFieldsReady&&locationReady;

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
      const authPhone=localPhone(session.user.phone||session.user.user_metadata?.phone||session.user.user_metadata?.phone_number);
      const nextPhone=localPhone(p.phone_number)||authPhone;
      const nextHouse=p.primaryAddress?.line1||'';
      const nextRoad=p.primaryAddress?.line2||'';

      let matchedAtoll=findAtoll(nextAtolls,p.primaryAddress?.stateRegion);
      let matchedIsland=findIsland(nextIslands,p.primaryAddress?.city,matchedAtoll?.id);
      if(!matchedAtoll&&matchedIsland)matchedAtoll=nextAtolls.find(a=>a.id===matchedIsland?.atoll_id)||null;
      if(matchedAtoll&&!matchedIsland)matchedIsland=findIsland(nextIslands,p.primaryAddress?.city,matchedAtoll.id);

      setAtolls(nextAtolls);
      setIslands(nextIslands);
      setName(nextName);
      setPhone(nextPhone);
      setHouse(nextHouse);
      setRoad(nextRoad);
      setAtollId(matchedAtoll?.id||'');
      setIslandId(matchedIsland?.id||'');

      const contactReady=nextName.trim().length>=2&&nextPhone.length===7;
      const addressReady=Boolean(nextHouse.trim()&&nextRoad.trim()&&matchedAtoll&&matchedIsland);
      setFormStep(contactReady?(addressReady?'ready':'address'):'contact');

      if(contactReady&&!matchedAtoll&&p.primaryAddress?.stateRegion){
        setMessage('Your saved Atoll / Region could not be matched. You can continue after entering the visible address fields; if needed, update the saved service address.');
      }else if(contactReady&&!matchedIsland&&p.primaryAddress?.city){
        setMessage('Your saved Island / City could not be matched. You can continue after entering the visible address fields; if needed, update the saved service address.');
      }
    }catch(error){
      setMessage(error instanceof Error?error.message:'Unable to load your details.');
    }finally{
      setLoading(false);
    }
  }

  function continueToAddress(event:FormEvent){
    event.preventDefault();
    if(!validContact){
      setMessage(name.trim().length<2?'Enter your name.':'Your logged-in account needs a valid OTP-verified Maldives contact number.');
      return;
    }
    setMessage('');
    setFormStep(validAddress?'ready':'address');
  }

  async function saveProfile(){
    const normalizedPhone=localPhone(phone);
    if(name.trim().length<2){setFormStep('contact');throw new Error('Enter your name.');}
    if(normalizedPhone.length!==7){setFormStep('contact');throw new Error('Your logged-in account needs a valid OTP-verified Maldives contact number.');}
    if(!house.trim()){setFormStep('address');throw new Error('Enter the House / Apartment.');}
    if(!road.trim()){setFormStep('address');throw new Error('Enter the Road.');}
    if(!selectedAtoll||!selectedIsland){
      setFormStep('address');
      throw new Error('Your saved Atoll / Region or Island / City could not be matched. Use “Update saved address”, then return to this request.');
    }

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
    if(!addressFieldsReady){
      setMessage(!house.trim()?'Enter the House / Apartment.':'Enter the Road.');
      return;
    }
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
    <div className="c3SectionHead"><div><small>Before sending</small><h2>{formStep==='contact'?'Your details':formStep==='address'?'Service address':'Ready to send'}</h2><p>{formStep==='contact'?'Only missing account details are required.':formStep==='address'?'Enter the missing street-level address. Your saved Atoll / Region and Island / City are reused automatically.':'Your saved contact and service address will be used for this request.'}</p></div></div>

    {formStep==='contact'?<form className="c3Form" onSubmit={continueToAddress}>
      <label>Full name<input value={name} onChange={e=>{setName(e.target.value);setMessage('');}} autoComplete="name" disabled={saving} required/></label>
      <label>Verified contact number<div className="c3ReviewRow"><span>Phone</span><strong>{phone?`+960 ${phone}`:'Not available'}</strong></div><small>From the logged-in OTP-verified account.</small></label>
      {!phone?<div className="c3Notice">No OTP-verified phone was found for this session. Sign in again with your verified number.</div>:null}
      <button className="c3Primary" type="submit" disabled={saving||!validContact}>{validAddress?'Continue to review':'Continue'}</button>
    </form>:null}

    {formStep==='address'?<form className="c3Form" onSubmit={saveAndSend}>
      <label>House / Apartment<input value={house} onChange={e=>{setHouse(e.target.value);setMessage('');}} autoComplete="address-line1" placeholder="House or apartment" disabled={saving} required/></label>
      <label>Road<input value={road} onChange={e=>{setRoad(e.target.value);setMessage('');}} autoComplete="address-line2" placeholder="Road / street" disabled={saving} required/></label>
      <div className="c3Review full">
        <div className="c3ReviewRow"><span>Atoll / Region</span><strong>{selectedAtoll?.display_name||'Saved location needs attention'}</strong></div>
        <div className="c3ReviewRow"><span>Island / City</span><strong>{selectedIsland?.display_name||'Saved location needs attention'}</strong></div>
      </div>
      {!locationReady?<div className="c3Notice">The street fields will still activate the button. If the saved location cannot be resolved when you continue, update it once in Profile. <a href="/profile#service-addresses">Update saved address</a></div>:null}
      {!validContact?<button className="c3Secondary" type="button" onClick={()=>{setMessage('');setFormStep('contact');}} disabled={saving}>Back</button>:null}
      <button className="c3Primary" type="submit" disabled={saving||!addressFieldsReady}>{saving?'Saving…':locationReady?'Save & Send Request':'Continue'}</button>
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
