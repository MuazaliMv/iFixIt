'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Mode='login'|'register';
type Role='CUSTOMER'|'PROVIDER';

export default function LoginPage(){
 const[mode,setMode]=useState<Mode>('login');
 const[role,setRole]=useState<Role>('CUSTOMER');
 const[fullName,setFullName]=useState('');
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[phone,setPhone]=useState('');
 const[otp,setOtp]=useState('');
 const[otpSent,setOtpSent]=useState(false);
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const[otpBusy,setOtpBusy]=useState(false);

 useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session)window.location.href='/';});},[]);
 function switchMode(next:Mode){setMode(next);setMessage('');setOtp('');setOtpSent(false);}
 async function sendOtp(){
  setOtpBusy(true);setMessage('');
  try{const r=await fetch('/api/auth/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:phone.trim()})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to send OTP.');setOtpSent(true);setMessage('Verification code sent by SMS. Enter the 6-digit code to continue.');}
  catch(e){setOtpSent(false);setMessage(e instanceof Error?e.message:'Unable to send OTP.');}
  finally{setOtpBusy(false);}
 }
 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setMessage('');
  try{
   if(mode==='register'){
    if(!fullName.trim())throw new Error('Enter your name.');
    if(!otpSent||!/^[0-9]{6}$/.test(otp))throw new Error('Verify your phone number with the 6-digit SMS code first.');
    const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:fullName.trim(),email:email.trim(),password,role,phoneNumber:phone.trim(),otp})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to create account.');
    setMessage('Account created. Sign in with your email and password.');setMode('login');setOtp('');setOtpSent(false);setPassword('');
   }else{
    const{data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
    const{data:profile}=await supabase.from('auth_profiles').select('role,provider_approved').eq('user_id',data.user.id).maybeSingle();
    if(profile?.role==='PROVIDER')window.location.href='/provider';else if(profile?.role==='ADMIN')window.location.href='/admin';else window.location.href='/';
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to continue.');}finally{setBusy(false);}
 }
 return <main className="shell authShell">
  <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Secure account access</p></div><a className="secondary" href="/">Home</a></header>
  <section className="panel authCard">
   <div className="panelHeader"><div><p className="eyebrow">ACCOUNT</p><h2>{mode==='login'?'Sign in to FixIt':'Create your FixIt account'}</h2></div><span className="pill">Secure Auth</span></div>
   <div className="filterRow"><button className={mode==='login'?'filterChip active':'filterChip'} onClick={()=>switchMode('login')} type="button">Sign In</button><button className={mode==='register'?'filterChip active':'filterChip'} onClick={()=>switchMode('register')} type="button">Register</button></div>
   <form onSubmit={submit} className="authForm">
    {mode==='register'?<>
     <label>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" required/></label>
     <label>Account type<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="CUSTOMER">Customer</option><option value="PROVIDER">Provider</option></select></label>
     <label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>{setPhone(e.target.value);setOtpSent(false);setOtp('');}} placeholder="+9607XXXXXX" required/></label>
     <button className="secondary" type="button" onClick={()=>void sendOtp()} disabled={otpBusy||!phone.trim()}>{otpBusy?'Sending…':otpSent?'Resend OTP':'Send OTP'}</button>
     <label>SMS verification code<input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit code" maxLength={6} disabled={!otpSent} required/></label>
    </>:null}
    <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
    <label>Password<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></label>
    <button className="primary" disabled={busy||(mode==='register'&&(!otpSent||otp.length!==6))}>{busy?'Please wait…':mode==='login'?'Sign In':'Create Account'}</button>
   </form>
   {mode==='login'?<p className="localNotice"><a href="/forgot-password">Forgot Password?</a></p>:null}
   {message?<p className="formMessage" role="status">{message}</p>:null}
   {mode==='register'?<p className="localNotice">Phone verification by SMS is required for every new account. Profile photo and other optional profile details can be added later.</p>:null}
   {mode==='register'&&role==='PROVIDER'?<p className="localNotice">Provider accounts require Admin approval before receiving marketplace work.</p>:null}
  </section>
 </main>;
}
