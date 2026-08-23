'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ChangePasswordPage(){
 const[currentPassword,setCurrentPassword]=useState('');
 const[newPassword,setNewPassword]=useState('');
 const[confirmPassword,setConfirmPassword]=useState('');
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');
 const[ready,setReady]=useState(false);

 useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(!data.session){window.location.href='/login';return;}setReady(true);});},[]);
 const valid=useMemo(()=>currentPassword.length>0&&newPassword.length>=8&&newPassword===confirmPassword&&newPassword!==currentPassword,[currentPassword,newPassword,confirmPassword]);

 async function submit(e:FormEvent){
  e.preventDefault();
  if(!valid)return;
  setBusy(true);setMessage('');
  try{
   const{data}=await supabase.auth.getSession();
   if(!data.session){window.location.href='/login';return;}
   const r=await fetch('/api/auth/change-password',{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},
    body:JSON.stringify({currentPassword,newPassword})
   });
   const p=await r.json();
   if(!r.ok)throw new Error(p?.error||'Unable to change password.');
   setCurrentPassword('');setNewPassword('');setConfirmPassword('');
   setMessage('Password changed successfully.');
  }catch(err){setMessage(err instanceof Error?err.message:'Unable to change password.');}
  finally{setBusy(false);}
 }

 if(!ready)return <main className="shell authShell"><section className="panel authCard"><p>Loading account security…</p></section></main>;
 return <main className="shell authShell">
  <header className="topbar"><div><a className="brand" href="/">iFixMV</a><p className="tagline">Account security</p></div><a className="secondary" href="/profile">Back to Profile</a></header>
  <section className="panel authCard">
   <div className="panelHeader"><div><p className="eyebrow">ACCOUNT SECURITY</p><h2>Change password</h2></div></div>
   <p className="sectionLead">Enter your current password, then choose a new password with at least 8 characters.</p>
   <form className="authForm" onSubmit={submit}>
    <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label>
    <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} required/><span className="fieldHelp">Use at least 8 characters and do not reuse your current password.</span></label>
    <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={8} required/>{confirmPassword&&newPassword!==confirmPassword?<span className="fieldError">Passwords do not match.</span>:null}</label>
    <button className="primary" disabled={busy||!valid}>{busy?'Changing…':'Change Password'}</button>
   </form>
   {message?<p className="formMessage" role="status">{message}</p>:null}
   <p className="muted" style={{marginTop:16}}>Forgot your current password? <a href="/forgot-password">Reset it securely</a>.</p>
  </section>
 </main>;
}
