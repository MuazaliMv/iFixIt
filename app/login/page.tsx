'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import './login.css';

type Step='phone'|'otp';
type ExistingProfile={role?:string|null};
type AccountRole='CUSTOMER'|'PROVIDER'|'ADMIN';
type Workspace='customer'|'provider'|'admin';

function normalizeRole(value:unknown):AccountRole{
 const role=String(value||'CUSTOMER').toUpperCase();
 if(role==='ADMIN')return 'ADMIN';
 if(role==='PROVIDER')return 'PROVIDER';
 return 'CUSTOMER';
}

function defaultWorkspace(role:AccountRole):Workspace{
 if(role==='ADMIN')return 'admin';
 if(role==='PROVIDER')return 'provider';
 return 'customer';
}

function workspaceDestination(workspace:Workspace){
 if(workspace==='admin')return '/admin';
 if(workspace==='provider')return '/provider/today';
 return '/home';
}

function rememberWorkspace(workspace:Workspace,role:AccountRole){
 try{
  localStorage.setItem('ifixmv-login-workspace',workspace);
  localStorage.setItem('fixit:mobile-nav-role',workspace);
  localStorage.setItem('fixit:app-mode',workspace);
  localStorage.setItem('fixit:account-role',role.toLowerCase());
 }catch{}
}

export default function LoginPage(){
 const[step,setStep]=useState<Step>('phone');
 const[phone,setPhone]=useState('');
 const[countryCode]=useState('+960');
 const[otp,setOtp]=useState('');
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const[checkingSession,setCheckingSession]=useState(true);

 useEffect(()=>{
  let active=true;
  void(async()=>{
   try{
    const response=await apiFetch('/api/user/profile');
    if(!active)return;
    if(response.ok){
     const payload=await response.json().catch(()=>({}));
     await routeUser(payload?.profile as ExistingProfile|undefined);
     return;
    }
   }catch{}
   if(active)setCheckingSession(false);
  })();
  return()=>{active=false;};
 },[]);

 async function routeUser(knownProfile?:ExistingProfile){
  let profile=knownProfile;
  if(!profile?.role){
   try{
    const response=await apiFetch('/api/user/profile');
    if(response.ok){
     const payload=await response.json().catch(()=>({}));
     profile=payload?.profile as ExistingProfile|undefined;
    }
   }catch{}
  }
  const role=normalizeRole(profile?.role);
  const workspace=defaultWorkspace(role);
  rememberWorkspace(workspace,role);
  const requested=new URLSearchParams(window.location.search).get('next');
  if(requested&&requested.startsWith('/')&&!requested.startsWith('//')){
   window.location.replace(requested);
   return;
  }
  window.location.replace(workspaceDestination(workspace));
 }

 const phoneValid=/^\d{7}$/.test(phone);
 const otpValid=/^\d{4}$/.test(otp);

 function updatePhone(value:string){
  setPhone(value.replace(/\D/g,'').slice(0,7));
  if(message)setMessage('');
 }

 function updateOtp(value:string){
  setOtp(value.replace(/\D/g,'').slice(0,4));
  if(message)setMessage('');
 }

 async function submitPhone(event:FormEvent){
  event.preventDefault();
  if(!phoneValid){setMessage('Enter a valid 7-digit Maldives phone number.');return;}
  setStep('otp');
  setMessage('For testing, enter OTP 9999.');
 }

 async function submitOtp(event:FormEvent){
  event.preventDefault();
  if(!otpValid){setMessage('Enter the 4-digit verification code.');return;}
  setBusy(true);
  setMessage('');
  try{
   const response=await apiFetch('/api/auth/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({phone:`${countryCode}${phone}`,otp}),
    retryAuth:false,
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok||!payload?.ok){setMessage(payload?.error||'Unable to sign in.');return;}
   await routeUser(payload?.profile as ExistingProfile|undefined);
  }catch(error){
   setMessage(error instanceof Error?error.message:'Unable to sign in.');
  }finally{setBusy(false);}
 }

 if(checkingSession)return <div className="authShell"><main className="authPage"><div className="authStage"><div className="authNav authNavChecking"><a className="authBrand" href="/" aria-label="iFix Maldives home"><span className="authBrandMark">iF</span><span><strong>iFix</strong><small>Maldives</small></span></a></div><section className="authCardClean authChecking"><span className="authLargeSpinner" aria-hidden="true"/><div className="authIntro"><h1>Opening iFixMV…</h1><p>Checking your session.</p></div></section></div></main></div>;

 return <div className="authShell authLoginMode">
  <main className="authPage">
   <div className="authStage">
    <div className="authNav">
     <a className="authBrand" href="/" aria-label="iFix Maldives home"><span className="authBrandMark">iF</span><span><strong>iFix</strong><small>Maldives</small></span></a>
    </div>

    <section className="authCardClean">
     <div className="authStatusPill"><span aria-hidden="true"/>Secure phone access</div>
     <div className="authIntro">
      <h1>{step==='phone'?'Sign in with phone':'Enter verification code'}</h1>
      <p>{step==='phone'?'Use your Maldives mobile number. No password required.':`We are verifying ${countryCode} ${phone}.`}</p>
     </div>

     {step==='phone'?<form onSubmit={submitPhone} className="authFormClean" noValidate>
      <label className="authField" htmlFor="login-phone">
       <span className="authFieldLabel">Phone number</span>
       <div className="phoneField">
        <span className="countryCodeStatic" aria-label="Maldives country code">🇲🇻 +960</span>
        <input id="login-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" enterKeyHint="next" value={phone} onChange={e=>updatePhone(e.target.value)} placeholder="7771234" maxLength={7} autoFocus aria-describedby="phone-help"/>
       </div>
       <span id="phone-help" className="fieldHelp">7-digit Maldives number</span>
      </label>
      <button type="submit" className="authSubmit" disabled={!phoneValid}>Continue<span className="authSubmitArrow" aria-hidden="true">→</span></button>
     </form>:<form onSubmit={submitOtp} className="authFormClean" noValidate>
      <label className="authField" htmlFor="login-otp">
       <span className="authFieldLabel">One-time code</span>
       <div className="otpField">
        <input id="login-otp" name="otp" type="tel" inputMode="numeric" autoComplete="one-time-code" enterKeyHint="done" value={otp} onChange={e=>updateOtp(e.target.value)} placeholder="0000" maxLength={4} autoFocus aria-describedby="otp-help"/>
       </div>
       <span id="otp-help" className="fieldHelp">Development OTP: 9999</span>
      </label>
      <button type="submit" className="authSubmit" disabled={busy||!otpValid} aria-busy={busy}>{busy?'Signing in…':<>Verify & Sign In<span className="authSubmitArrow" aria-hidden="true">→</span></>}</button>
      <button type="button" className="authSecondary" onClick={()=>{setStep('phone');setOtp('');setMessage('');}}>Change phone number</button>
     </form>}

     {message?<p className="formMessage" role="status">{message}</p>:null}
    </section>

    <p className="authFootnote"><span aria-hidden="true">✓</span> Phone verification · No password · Email optional</p>
   </div>
  </main>
 </div>;
}
