'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './login.css';

type Mode='login'|'register';
type Role='CUSTOMER'|'PROVIDER';

export default function LoginPage(){
 const[mode,setMode]=useState<Mode>('login');
 const[role,setRole]=useState<Role>('CUSTOMER');
 const[fullName,setFullName]=useState('');
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[phone,setPhone]=useState('');
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const[showPassword,setShowPassword]=useState(false);

 async function routeUser(userId:string){
  const{data:profile}=await supabase.from('auth_profiles').select('role').eq('user_id',userId).maybeSingle();
  if(profile?.role==='PROVIDER')window.location.href='/provider';
  else if(profile?.role==='ADMIN')window.location.href='/admin';
  else window.location.href='/home';
 }

 useEffect(()=>{
  supabase.auth.getSession().then(({data})=>{
   if(data.session)void routeUser(data.session.user.id);
  });
 },[]);

 function switchMode(next:Mode){
  setMode(next);
  setMessage('');
  setPassword('');
  setShowPassword(false);
 }

 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setMessage('');
  try{
   if(mode==='register'){
    if(!fullName.trim())throw new Error('Enter your name.');
    const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:fullName.trim(),email:email.trim(),password,role,phoneNumber:phone.trim()})});
    const p=await r.json();
    if(!r.ok)throw new Error(p?.error||'Unable to create account.');
    setMessage('Account created. You can now sign in.');
    setMode('login');
    setPassword('');
   }else{
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password})});
    const p=await r.json();
    if(!r.ok)throw new Error(p?.error||'Unable to sign in.');
    const{data,error}=await supabase.auth.setSession({access_token:p.session.access_token,refresh_token:p.session.refresh_token});
    if(error||!data.user)throw error||new Error('Unable to open session.');
    await routeUser(data.user.id);
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to continue.');}
  finally{setBusy(false);}
 }

 const isLogin=mode==='login';

 return <main className="authPage">
  <section className="authCardClean">
   <a className="authBrand" href="/">FixIt</a>

   <div className="authIntro">
    <h1>{isLogin?'Welcome back':'Create your account'}</h1>
    <p>{isLogin?'Sign in to continue to FixIt.':'Set up your FixIt account in a few steps.'}</p>
   </div>

   <form onSubmit={submit} className="authFormClean">
    {!isLogin?<>
     <label>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" autoComplete="name" required/></label>
     <label>Account type<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="CUSTOMER">User</option><option value="PROVIDER">Service Provider</option></select></label>
     <label>Maldives phone number <span className="optionalLabel">Optional</span><input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7771234" maxLength={7}/></label>
    </>:null}

    <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>

    <label>Password
     <div className="passwordField">
      <input type={showPassword?'text':'password'} autoComplete={isLogin?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/>
      <button type="button" className="passwordToggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button>
     </div>
    </label>

    {isLogin?<div className="authUtility"><a href="/forgot-password">Forgot password?</a></div>:null}

    <button className="primary authSubmit" disabled={busy}>{busy?'Please wait…':isLogin?'Sign In':'Create Account'}</button>
   </form>

   {message?<p className="formMessage" role="status">{message}</p>:null}

   {!isLogin&&role==='PROVIDER'?<p className="authHint">Service Provider accounts require Admin approval before receiving service requests.</p>:null}

   <p className="authSwitch">{isLogin?'New to FixIt?':'Already have an account?'} <button type="button" onClick={()=>switchMode(isLogin?'register':'login')}>{isLogin?'Create account':'Sign in'}</button></p>
  </section>
 </main>;
}
