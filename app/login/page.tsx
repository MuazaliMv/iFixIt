'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch, invalidateProfileCache } from '../../lib/apiClient';
import { resolvePostLoginDestination, type AuthProfileLike } from '../../lib/authRouting';
import type { PortalRole } from '../../lib/roleAccess';
import { supabase } from '../../lib/supabaseClient';
import './login.css';

type Step='phone'|'otp';
type ExistingProfile=AuthProfileLike;
type LoginSession={access_token?:string|null;refresh_token?:string|null};

function rememberedWorkspace():PortalRole|null{
 try{
  const value=localStorage.getItem('ifixmv-login-workspace');
  return value==='customer'||value==='provider'||value==='admin'?value:null;
 }catch{return null;}
}

function rememberWorkspace(workspace:PortalRole,role:'CUSTOMER'|'PROVIDER'|'ADMIN'){
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

async function syncLegacyBrowserSessionBestEffort(session:LoginSession|undefined){
 const accessToken=String(session?.access_token||'').trim();
 const refreshToken=String(session?.refresh_token||'').trim();
 if(!accessToken||!refreshToken)return;
 try{
  await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
 }catch{}
}

async function confirmServerSession(attempts=3):Promise<ExistingProfile>{
 let lastStatus=0;
 for(let attempt=0;attempt<attempts;attempt+=1){
  try{
   const response=await fetchWithTimeout('/api/auth/session',{retryAuth:false},5000);
   lastStatus=response.status;
   const payload=await response.json().catch(()=>({}));
   if(response.ok&&payload?.authenticated===true)return payload?.profile as ExistingProfile|undefined||{};
   if(response.status!==401&&response.status!==503)break;
  }catch(error){
   if(!(error instanceof DOMException&&error.name==='AbortError')&&attempt===attempts-1)throw error;
  }
  if(attempt<attempts-1)await new Promise(resolve=>window.setTimeout(resolve,250*(attempt+1)));
 }
 throw new Error(lastStatus===401?'Your secure login session was not saved. Please verify the code again.':'Your login was verified, but the secure session could not be confirmed. Please try again.');
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
    const response=await fetchWithTimeout('/api/auth/session',{retryAuth:false},4500);
    if(!active||!response.ok)return;
    const payload=await response.json().catch(()=>({}));
    if(!active||payload?.authenticated!==true)return;
    await routeUser(payload?.profile as ExistingProfile|undefined);
   }catch{}
  })();

  return()=>{active=false;};
 },[]);

 async function routeUser(knownProfile?:ExistingProfile){
  let profile=knownProfile;
  if(!profile?.role){
   try{
    const response=await fetchWithTimeout('/api/auth/session',{retryAuth:false},6000);
    if(response.ok){
     const payload=await response.json().catch(()=>({}));
     if(payload?.authenticated===true)profile=payload?.profile as ExistingProfile|undefined;
    }
   }catch{}
  }
  const requested=new URLSearchParams(window.location.search).get('next')||'';
  const decision=resolvePostLoginDestination(profile||{},requested,rememberedWorkspace());
  rememberWorkspace(decision.workspace,decision.role);
  window.location.replace(decision.destination);
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
  setMessage('Testing code: 9999');
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
   },16000);
   const payload=await response.json().catch(()=>({}));
   if(!response.ok||!payload?.ok){setMessage(payload?.error||'Unable to sign in.');return;}
   // The HttpOnly server session is the login authority. Browser Supabase state is
   // legacy compatibility only and must never block a successful OTP login.
   const confirmedProfile=await confirmServerSession();
   void syncLegacyBrowserSessionBestEffort(payload?.session as LoginSession|undefined);
   invalidateProfileCache();
   await routeUser(confirmedProfile?.role?confirmedProfile:payload?.profile as ExistingProfile|undefined);
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
