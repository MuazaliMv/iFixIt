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

const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

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
   // A login page can be reached briefly while secure cookies/browser state are
   // still settling after a route change. Retry transient failures and only show
   // the form after the server has definitively reported that no session exists.
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await apiFetch('/api/user/profile');
     if(!active)return;
     if(response.ok){
      const payload=await response.json().catch(()=>({}));
      await routeUser(payload?.profile as ExistingProfile|undefined);
      return;
     }
     if(response.status===401||response.status===404){
      if(attempt<2){await wait(250*(attempt+1));continue;}
      setCheckingSession(false);
      return;
     }
     // 5xx/timeout/network-style responses are not proof of logout.
     if(attempt<2){await wait(400*(attempt+1));continue;}
    }catch{
     if(attempt<2){await wait(400*(attempt+1));continue;}
    }
   }
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

 function submitPhone(event:FormEvent){
  event.preventDefault();
  if(!phoneValid){setMessage('Enter a valid 7-digit Maldives number.');return;}
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

 if(checkingSession)return <div className="signinPage"><div className="signinContainer"><div className="signinCard signinChecking"><span className="signinSpinner" aria-hidden="true"/><p>Checking your session…</p></div></div></div>;

 return <div className="signinPage">
  <main className="signinContainer">
   <section className="signinCard">
    <h1>{step==='phone'?'Sign in with phone':'Enter verification code'}</h1>

    {step==='phone'?<form onSubmit={submitPhone} noValidate>
     <div className="formGroup">
      <label htmlFor="login-phone">Phone number</label>
      <div className="phoneInputWrapper">
       <div className="countryCode" aria-label="Maldives country code"><span aria-hidden="true">🇲🇻</span><span>+960</span></div>
       <input id="login-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" enterKeyHint="next" value={phone} onChange={e=>updatePhone(e.target.value)} placeholder="Enter your number" maxLength={7} autoFocus/>
      </div>
     </div>
     <button className="continueButton" type="submit" disabled={!phoneValid}>Continue <span aria-hidden="true">→</span></button>
    </form>:<form onSubmit={submitOtp} noValidate>
     <div className="formGroup">
      <label htmlFor="login-otp">One-time code</label>
      <div className="otpInputWrapper">
       <input id="login-otp" name="otp" type="tel" inputMode="numeric" autoComplete="one-time-code" enterKeyHint="done" value={otp} onChange={e=>updateOtp(e.target.value)} placeholder="0000" maxLength={4} autoFocus/>
      </div>
      <p className="otpHint">Testing code: 9999</p>
     </div>
     <button className="continueButton" type="submit" disabled={busy||!otpValid}>{busy?'Signing in…':<>Verify & Sign In <span aria-hidden="true">→</span></>}</button>
     <button className="changePhoneButton" type="button" disabled={busy} onClick={()=>{setStep('phone');setOtp('');setMessage('');}}>Change phone number</button>
    </form>}

    {message?<p className="signinMessage" role="status">{message}</p>:null}
   </section>

   <div className="supportLink"><a href="mailto:support@ifixmv.com">Trouble signing in? Contact Support</a></div>
  </main>
 </div>;
}
