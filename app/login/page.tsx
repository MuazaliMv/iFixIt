'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './login.css';

type Mode='login'|'register';

function EyeIcon({off=false}:{off?:boolean}){
 return <svg viewBox="0 0 24 24" aria-hidden="true" className="eyeIcon"><path d="M2.3 12s3.5-5.5 9.7-5.5S21.7 12 21.7 12 18.2 17.5 12 17.5 2.3 12 2.3 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8"/>{off?<path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>:null}</svg>;
}

export default function LoginPage(){
 const[mode,setMode]=useState<Mode>('login');
 const[fullName,setFullName]=useState('');
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[phone,setPhone]=useState('');
 const[countryCode,setCountryCode]=useState('+960');
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const[showPassword,setShowPassword]=useState(false);
 const[rememberMe,setRememberMe]=useState(true);
 const[capsLock,setCapsLock]=useState(false);
 const[touched,setTouched]=useState({email:false,password:false,phone:false,fullName:false});

 useEffect(()=>{
  try{
   const requestedMode=new URLSearchParams(window.location.search).get('mode');
   if(requestedMode==='register')setMode('register');
   const saved=localStorage.getItem('ifixmv-login-email');
   if(saved){setEmail(saved);setRememberMe(true);}
  }catch{}
 },[]);

 async function routeUser(){
  const requested=new URLSearchParams(window.location.search).get('next');
  if(requested&&requested.startsWith('/')&&!requested.startsWith('//')){window.location.replace(requested);return;}
  try{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
   const response=await fetch('/api/user/profile',{credentials:'same-origin',cache:'no-store',signal:controller.signal});clearTimeout(timer);
   if(response.ok){const payload=await response.json();const accountRole=payload?.profile?.role;if(accountRole==='PROVIDER'){window.location.replace('/provider');return;}if(accountRole==='ADMIN'){window.location.replace('/admin');return;}}
  }catch{}
  window.location.replace('/home');
 }

 function switchMode(next:Mode){
  setMode(next);setMessage('');setPassword('');setShowPassword(false);setCapsLock(false);
  setTouched({email:false,password:false,phone:false,fullName:false});
  try{
   const url=new URL(window.location.href);
   if(next==='register')url.searchParams.set('mode','register');else url.searchParams.delete('mode');
   window.history.replaceState({},'',url.toString());
  }catch{}
 }

 const isLogin=mode==='login';
 const emailTrimmed=email.trim();
 const emailValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
 const passwordValid=password.length>=8;
 const phoneValid=!phone||(/^\d{7}$/.test(phone)&&countryCode==='+960');
 const nameValid=Boolean(fullName.trim());
 const formValid=useMemo(()=>isLogin?(emailValid&&passwordValid):(nameValid&&emailValid&&passwordValid&&phoneValid),[isLogin,emailValid,passwordValid,nameValid,phoneValid]);

 async function submit(event:FormEvent){
  event.preventDefault();setTouched({email:true,password:true,phone:true,fullName:true});if(!formValid)return;
  setBusy(true);setMessage('');
  try{
   if(mode==='register'){
    const phoneNumber=phone?`${countryCode}${phone}`:'';
    const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:fullName.trim(),email:emailTrimmed,password,phoneNumber})});
    const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to create account.');
    setMessage('Account created. You can now sign in.');switchMode('login');
   }else{
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:emailTrimmed,password})});
    const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to sign in.');
    if(!p?.session?.access_token||!p?.session?.refresh_token)throw new Error('Unable to open session.');

    const {error:sessionError}=await supabase.auth.setSession({
      access_token:p.session.access_token,
      refresh_token:p.session.refresh_token,
    });
    if(sessionError)throw new Error(sessionError.message||'Unable to open session.');

    try{
      if(rememberMe)localStorage.setItem('ifixmv-login-email',emailTrimmed);else localStorage.removeItem('ifixmv-login-email');
    }catch{}
    await routeUser();
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to continue.');}finally{setBusy(false);}
 }

 return <div className="authShell">
  <div className="globalMenuHeaderWrap authShellHeaderWrap">
   <header className="globalMenuHeader" aria-label="iFixMV navigation">
    <a href="/" className="globalMenuBrand" aria-label="Go to iFixMV home"><span className="globalMenuBrandMark">F</span><span>FixIt</span></a>
   </header>
  </div>

  <main className="authPage">
   <section className="authCardClean">
    {isLogin?<div className="authModeTabs authModeTabsSingle"><button type="button" onClick={()=>switchMode('register')}>Create account</button></div>:null}
    <div className="authIntro"><h1>{isLogin?'Welcome back':'Create your account'}</h1><p>{isLogin?'Sign in to continue to iFixMV.':'Register to start requesting services with iFixMV.'}</p></div>
    <form onSubmit={submit} className="authFormClean" noValidate>
     {!isLogin?<><label>Full name<input value={fullName} onBlur={()=>setTouched(v=>({...v,fullName:true}))} onChange={e=>setFullName(e.target.value)} placeholder="Your name" autoComplete="name" aria-invalid={touched.fullName&&!nameValid}/>{touched.fullName&&!nameValid?<span className="fieldError">Enter your full name.</span>:null}</label><label>Phone number <span className="optionalLabel">Optional</span><div className="phoneField"><select className="countryCode" value={countryCode} onChange={e=>setCountryCode(e.target.value)} aria-label="Country code"><option value="+960">🇲🇻 +960</option></select><input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onBlur={()=>setTouched(v=>({...v,phone:true}))} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7771234" maxLength={7} aria-invalid={touched.phone&&!phoneValid}/></div><span className="fieldHelp">Enter the 7-digit local number only.</span>{touched.phone&&!phoneValid?<span className="fieldError">Enter a valid 7-digit Maldives number.</span>:null}</label></>:null}
     <label>Email address<input type="email" inputMode="email" autoComplete="email" value={email} onBlur={()=>setTouched(v=>({...v,email:true}))} onChange={e=>{setEmail(e.target.value);if(touched.email)setTouched(v=>({...v,email:false}));}} placeholder="you@example.com" aria-invalid={touched.email&&!emailValid}/>{touched.email&&!emailValid?<span className="fieldError">{emailTrimmed?'Enter a valid email address.':'Enter your email address.'}</span>:null}</label>
     <label>Password<div className="passwordField"><input type={showPassword?'text':'password'} autoComplete={isLogin?'current-password':'new-password'} value={password} onBlur={()=>setTouched(v=>({...v,password:true}))} onKeyUp={e=>setCapsLock(e.getModifierState('CapsLock'))} onKeyDown={e=>setCapsLock(e.getModifierState('CapsLock'))} onChange={e=>setPassword(e.target.value)} minLength={8} aria-invalid={touched.password&&!passwordValid}/><button type="button" className="passwordToggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} title={showPassword?'Hide password':'Show password'}><EyeIcon off={showPassword}/></button></div>{capsLock?<span className="capsWarning">Caps Lock is on.</span>:null}{!isLogin?<span className="fieldHelp">Use at least 8 characters.</span>:null}{touched.password&&!passwordValid?<span className="fieldError">Password must be at least 8 characters.</span>:null}</label>
     {isLogin?<div className="authUtility"><label className="rememberMe"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/><span>Remember me</span></label><a href="/forgot-password">Forgot password?</a></div>:null}
     <button className="primary authSubmit" disabled={busy||!formValid} aria-busy={busy}>{busy?<><span className="buttonSpinner" aria-hidden="true"/>{isLogin?'Signing in…':'Creating account…'}</>:isLogin?'Continue':'Create Account'}</button>
    </form>
    {message?<p className="formMessage" role="status">{message}</p>:null}
    <p className="authSwitch">{isLogin?'New to iFixMV?':'Already have an account?'} <button type="button" onClick={()=>switchMode(isLogin?'register':'login')}>{isLogin?'Create account':'Sign in'}</button></p>
   </section>
  </main>
 </div>;
}
