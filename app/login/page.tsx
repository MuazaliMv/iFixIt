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

 async function submitPhone(event:FormEvent){
  event.preventDefault();
  if(!phoneValid){setMessage('Enter a valid 7-digit Maldives phone number.');return;}
  setBusy(true);
  setMessage('');
  try{
   setStep('otp');
   setMessage('Verification code sent. For testing, use 9999.');
  }finally{setBusy(false);}
 }

 async function submitOtp(event:FormEvent){
  event.preventDefault();
  if(!otpValid){setMessage('Enter the 4-digit verification code.');return;}
  if(otp!=='9999'){setMessage('Incorrect verification code.');return;}
  setBusy(true);
  setMessage('');
  try{
   await routeUser();
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
      <p>{step==='phone'?'Use your Maldives mobile number. No password required.':`We are verifying +960 ${phone}.`}</p>
     </div>

     {step==='phone'?<form onSubmit={submitPhone} className="authFormClean" noValidate>
      <label className="authField">
       <span className="authFieldLabel">Phone number</span>
       <div className="phoneField">
        <select className="countryCode" value="+960" aria-label="Country code" disabled><option value="+960">🇲🇻 +960</option></select>
        <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7771234" maxLength={7} autoFocus/>
       </div>
       <span className="fieldHelp">7-digit Maldives number</span>
      </label>
      <button className="authSubmit" disabled={busy||!phoneValid} aria-busy={busy}>{busy?'Sending…':<>Continue<span className="authSubmitArrow" aria-hidden="true">→</span></>}</button>
     </form>:<form onSubmit={submitOtp} className="authFormClean" noValidate>
      <label className="authField">
       <span className="authFieldLabel">One-time code</span>
       <div className="authInputWrap">
        <input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="0000" maxLength={4} autoFocus style={{textAlign:'center',letterSpacing:'0.35em',fontSize:'1.35rem'}}/>
       </div>
       <span className="fieldHelp">Development OTP: 9999</span>
      </label>
      <button className="authSubmit" disabled={busy||!otpValid} aria-busy={busy}>{busy?'Verifying…':<>Verify & Continue<span className="authSubmitArrow" aria-hidden="true">→</span></>}</button>
      <button type="button" className="authSecondary" onClick={()=>{setStep('phone');setOtp('');setMessage('');}}>Change phone number</button>
     </form>}

     {message?<p className="formMessage" role="status">{message}</p>:null}
    </section>

    <p className="authFootnote"><span aria-hidden="true">✓</span> Phone verification · No password · Email optional</p>
   </div>
  </main>
 </div>;
}
