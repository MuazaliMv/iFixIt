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

async function fetchWithTimeout(
 input:RequestInfo|URL,
 init:RequestInit&{retryAuth?:boolean}={},
 timeoutMs=3500,
){
 const controller=new AbortController();
 const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
 try{
  return await apiFetch(input,{...init,signal:controller.signal});
 }finally{
  window.clearTimeout(timer);
 }
}

export default function LoginPage(){
 const[step,setStep]=useState<Step>('phone');
 const[phone,setPhone]=useState('');
 const[countryCode]=useState('+960');
 const[otp,setOtp]=useState('');
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);

 useEffect(()=>{
  let active=true;

  void(async()=>{
   try{
    // Restore a valid session in the background. The sign-in form stays usable
    // immediately, so a slow or broken session endpoint can never freeze login.
    const sessionResponse=await fetchWithTimeout('/api/auth/session',{retryAuth:false},3000);
    if(!active||!sessionResponse.ok)return;

    const profileResponse=await fetchWithTimeout('/api/user/profile',{},3000);
    if(!active||!profileResponse.ok)return;

    const payload=await profileResponse.json().catch(()=>({}));
    if(!active)return;
    await routeUser(payload?.profile as ExistingProfile|undefined);
   }catch{
    // A timeout/network failure simply leaves the usable sign-in form on screen.
   }
  })();

  return()=>{active=false;};
 },[]);

 async function routeUser(knownProfile?:ExistingProfile){
  let profile=knownProfile;
  if(!profile?.role){
   try{
    const response=await fetchWithTimeout('/api/user/profile',{},3000);
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
  setMessage('Development OTP: 9999');
 }

 async function submitOtp(event:FormEvent){
  event.preventDefault();
  if(!otpValid){setMessage('Enter the 4-digit verification code.');return;}
  setBusy(true);
  setMessage('');
  try{
   const response=await fetchWithTimeout('/api/auth/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({phone:`${countryCode}${phone}`,otp}),
    retryAuth:false,
   },8000);
   const payload=await response.json().catch(()=>({}));
   if(!response.ok||!payload?.ok){setMessage(payload?.error||'Unable to sign in.');return;}
   await routeUser(payload?.profile as ExistingProfile|undefined);
  }catch(error){
   if(error instanceof DOMException&&error.name==='AbortError'){
    setMessage('Sign in timed out. Please try again.');
   }else{
    setMessage(error instanceof Error?error.message:'Unable to sign in.');
   }
  }finally{setBusy(false);}
 }

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
      <p className="otpHint">Development OTP: 9999</p>
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
