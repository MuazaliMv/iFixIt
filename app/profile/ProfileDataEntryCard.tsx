'use client';

import { FormEvent, useEffect, useState } from 'react';

type ProfilePayload={
  profile?:{
    full_name?:string|null;
    email?:string|null;
    phone_number?:string|null;
    primaryAddress?:{
      line1?:string|null;
      line2?:string|null;
      city?:string|null;
      stateRegion?:string|null;
      postalCode?:string|null;
      country?:string|null;
    }|null;
  }|null;
};

function localPhone(value:unknown){
  const raw=String(value??'').trim();
  return /^\+960\d{7}$/.test(raw)?raw.slice(4):raw.replace(/\D/g,'').slice(-7);
}

export default function ProfileDataEntryCard(){
  const[name,setName]=useState('');
  const[email,setEmail]=useState('');
  const[phone,setPhone]=useState('');
  const[line1,setLine1]=useState('');
  const[line2,setLine2]=useState('');
  const[city,setCity]=useState('');
  const[stateRegion,setStateRegion]=useState('');
  const[postalCode,setPostalCode]=useState('');
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState('');

  useEffect(()=>{void load();},[]);

  async function load(){
    setLoading(true);
    try{
      const response=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store'});
      const payload=await response.json().catch(()=>({})) as ProfilePayload&{error?:string};
      if(response.status===401){window.location.replace('/login?next=%2Fprofile');return;}
      if(!response.ok||!payload.profile)throw new Error(payload.error||'Unable to load profile.');
      const p=payload.profile;
      setName(p.full_name||'');
      setEmail(p.email||'');
      setPhone(localPhone(p.phone_number));
      setLine1(p.primaryAddress?.line1||'');
      setLine2(p.primaryAddress?.line2||'');
      setCity(p.primaryAddress?.city||'');
      setStateRegion(p.primaryAddress?.stateRegion||'');
      setPostalCode(p.primaryAddress?.postalCode||'');
    }catch(error){
      setMessage(error instanceof Error?error.message:'Unable to load profile.');
    }finally{setLoading(false);}
  }

  async function save(event:FormEvent){
    event.preventDefault();
    const normalizedPhone=phone.replace(/\D/g,'');
    if(normalizedPhone&&normalizedPhone.length!==7){setMessage('Enter a valid 7-digit Maldives phone number.');return;}
    setSaving(true);setMessage('Saving profile…');
    try{
      const form=new FormData();
      form.set('fullName',name.trim());
      if(normalizedPhone)form.set('phoneNumber',normalizedPhone);
      form.set('primaryAddress',JSON.stringify({
        line1:line1.trim()||null,
        line2:line2.trim()||null,
        city:city.trim()||null,
        stateRegion:stateRegion.trim()||null,
        postalCode:postalCode.trim()||null,
        country:'Maldives'
      }));
      const response=await fetch('/api/user/profile',{method:'PUT',body:form,credentials:'same-origin'});
      const payload=await response.json().catch(()=>({})) as {error?:string};
      if(response.status===401){window.location.replace('/login?next=%2Fprofile');return;}
      if(!response.ok)throw new Error(payload.error||'Unable to update profile.');
      setMessage('Profile updated successfully.');
      window.dispatchEvent(new Event('fixit:profile-updated'));
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update profile.');}
    finally{setSaving(false);}
  }

  return <section className="profileSection" style={{marginBottom:16}}>
    <div className="profileSectionHeader"><div><h3>Update profile information</h3><p className="sectionLead">Profile details are optional and can be completed later.</p></div></div>
    <form className="authForm" onSubmit={save}>
      <label>Full name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Full name (optional)" disabled={loading}/></label>
      <label>Email address<input value={email} readOnly disabled/></label>
      <label>Phone number<input type="tel" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7XXXXXX" maxLength={7} autoComplete="tel" disabled={loading}/></label>
      <label>House / building<input value={line1} onChange={e=>setLine1(e.target.value)} placeholder="House or building name (optional)" autoComplete="address-line1" disabled={loading}/></label>
      <label>Street / additional address<input value={line2} onChange={e=>setLine2(e.target.value)} placeholder="Street, floor or apartment (optional)" autoComplete="address-line2" disabled={loading}/></label>
      <label>City / island<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Island or city (optional)" autoComplete="address-level2" disabled={loading}/></label>
      <label>Atoll / region<input value={stateRegion} onChange={e=>setStateRegion(e.target.value)} placeholder="Atoll or region (optional)" autoComplete="address-level1" disabled={loading}/></label>
      <label>Postal code<input value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="Postal code (optional)" autoComplete="postal-code" disabled={loading}/></label>
      <label>Country<input value="Maldives" readOnly disabled/></label>
      <button className="primary" type="submit" disabled={loading||saving}>{saving?'Saving…':'Save Profile Information'}</button>
    </form>
    {message?<p className="muted accountStatusText" role="status" style={{marginTop:10}}>{message}</p>:null}
  </section>;
}
