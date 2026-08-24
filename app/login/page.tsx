'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/apiClient';
import './login.css';

type Mode='login'|'register';
type WorkspaceChoice='customer'|'provider';
type ExistingProfile={role?:string|null;provider_approved?:boolean|null};
type FieldIconName='mail'|'lock'|'user'|'phone';

function EyeIcon({off=false}:{off?:boolean}){
 return <svg viewBox="0 0 24 24" aria-hidden="true" className="eyeIcon"><path d="M2.3 12s3.5-5.5 9.7-5.5S21.7 12 21.7 12 18.2 17.5 12 17.5 2.3 12 2.3 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8"/>{off?<path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>:null}</svg>;
}

function FieldIcon({name}:{name:FieldIconName}){
 const p={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
 if(name==='mail')return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
 if(name==='lock')return <svg {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>;
 if(name==='phone')return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/></svg>;
 return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

function WorkspaceIcon({name}:{name:WorkspaceChoice}){
 const p={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
 if(name==='provider')return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>;
 return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
}

export default function LoginPage(){
 const[mode,setMode]=useState<Mode>('login');
 const[workspace,setWorkspace]=useState<WorkspaceChoice>('customer');
 const[fullName,setFullName]=useState('');
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[phone,setPhone]=useState('');
 const[countryCode,setCountryCode]=useState('+960');
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const[checkingSession,setCheckingSession]=useState(true);
 const[showPassword,setShowPassword]=useState(false);
 const[rememberMe,setRememberMe]=useState(true);
 const[capsLock,setCapsLock]=useState(false);
 const[touched,setTouched]=useState({email:false,password:false,phone:false,fullName:false});

 useEffect(()=>{
  let active=true;
  try{
   const requestedMode=new URLSearchParams(window.location.search).get('mode');
   if(requestedMode==='register')setMode('register');
   const saved=localStorage.getItem('ifixmv-login-email');
   if(saved){setEmail(saved);setRememberMe(true);}
   const savedWorkspace=localStorage.getItem('ifixmv-login-workspace');
   if(savedWorkspace==='provider'||savedWorkspace==='customer')setWorkspace(savedWorkspace);
  }catch{}

  void(async()=>{
   try{
    const response=await apiFetch('/api/user/profile');
    if(!active)return;
    if(response.ok){
     const payload=await response.json().catch(()=>({}));
     await routeUser(payload?.profile as ExistingProfile|undefined,false);
     return;
    }
   }catch{}
   if(active)setCheckingSession(false);
  })();

  return()=>{active=false;};
 },[]);

 function rememberWorkspace(next:WorkspaceChoice){
  try{
   localStorage.setItem('ifixmv-login-workspace',next);
   localStorage.setItem('fixit:mobile-nav-role',next);
   localStorage.setItem('fixit:app-mode',next);
  }catch{}
 }

 async function routeUser(knownProfile?:ExistingProfile,useWorkspaceChoice=false){
  const requested=new URLSearchParams(window.location.search).get('next');
  if(requested&&requested.startsWith('/')&&!requested.startsWith('//')){window.location.replace(requested);return;}

  let profile=knownProfile;
  if(!profile?.role){
   try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
    const response=await apiFetch('/api/user/profile',{signal:controller.signal});clearTimeout(timer);
    if(response.ok){const payload=await response.json();profile=payload?.profile as ExistingProfile|undefined;}
   }catch{}
  }

  const role=String(profile?.role||'CUSTOMER').toUpperCase();
  const providerReady=role==='PROVIDER'||role==='ADMIN'||profile?.provider_approved===true;

  if(useWorkspaceChoice){
   if(role==='ADMIN'){window.location.replace('/admin');return;}
   rememberWorkspace(workspace);
   if(workspace==='provider'){
    window.location.replace(providerReady?'/provider/today':'/provider/onboarding');
    return;
   }
   window.location.replace('/home');
   return;
  }

  if(role==='PROVIDER'){window.location.replace('/provider');return;}
  if(role==='ADMIN'){window.location.replace('/admin');return;}
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

    const {error:sessionError}=await supabase.auth.setSession({access_token:p.session.access_token,refresh_token:p.session.refresh_token});
    if(sessionError)throw new Error(sessionError.message||'Unable to open session.');

    try{if(rememberMe)localStorage.setItem('ifixmv-login-email',emailTrimmed);else localStorage.removeItem('ifixmv-login-email');}catch{}
    await routeUser(p?.profile as ExistingProfile|undefined,true);
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to continue.');}finally{setBusy(false);}
 }

 if(checkingSession)return <div className="authShell"><main className="authPage"><div className="authStage"><div className="authNav authNavChecking"><a className="authBrand" href="/" aria-label="iFix Maldives home"><span className="authBrandMark">iF</span><span><strong>iFix</strong><small>Maldives</small></span></a></div><section className="authCardClean authChecking" aria-live="polite" aria-busy="true"><span className="authLargeSpinner" aria-hidden="true"/><div className="authIntro"><h1>Opening iFixMV…</h1><p>Checking your existing secure session.</p></div></section></div></main></div>;

 return <div className="authShell">
  <main className="authPage">
   <div className="authStage">
    <div className="authNav">
     <a className="authBrand" href="/" aria-label="iFix Maldives home"><span className="authBrandMark">iF</span><span><strong>iFix</strong><small>Maldives</small></span></a>
     <div className="authModeToggle" role="tablist" aria-label="Account access">
      <button type="button" className={isLogin?'active':''} onClick={()=>switchMode('login')} role="tab" aria-selected={isLogin}>Sign in</button>
      <button type="button" className={!isLogin?'active':''} onClick={()=>switchMode('register')} role="tab" aria-selected={!isLogin}>Create account</button>
     </div>
    </div>

    <section className="authCardClean">
     <div className="authStatusPill"><span aria-hidden="true"/>{isLogin?'Secure account access':'New iFixMV account'}</div>
     <div className="authIntro"><h1>{isLogin?'Welcome back':'Create your account'}</h1><p>{isLogin?'Sign in once, then open the workspace you need.':'Create one account for requesting services and, when approved, providing services.'}</p></div>

     <form onSubmit={submit} className="authFormClean" noValidate>
      {!isLogin?<>
       <label className="authField"><span className="authFieldLabel">Full name</span><div className={`authInputWrap${touched.fullName&&!nameValid?' invalid':''}`}><span className="authInputIcon"><FieldIcon name="user"/></span><input value={fullName} onBlur={()=>setTouched(v=>({...v,fullName:true}))} onChange={e=>setFullName(e.target.value)} placeholder="Your name" autoComplete="name" aria-invalid={touched.fullName&&!nameValid}/></div>{touched.fullName&&!nameValid?<span className="fieldError">Enter your full name.</span>:null}</label>
       <label className="authField"><span className="authFieldLabel">Phone number <em>Optional</em></span><div className={`phoneField${touched.phone&&!phoneValid?' invalid':''}`}><span className="authPhoneIcon"><FieldIcon name="phone"/></span><select className="countryCode" value={countryCode} onChange={e=>setCountryCode(e.target.value)} aria-label="Country code"><option value="+960">🇲🇻 +960</option></select><input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onBlur={()=>setTouched(v=>({...v,phone:true}))} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="7771234" maxLength={7} aria-invalid={touched.phone&&!phoneValid}/></div><span className="fieldHelp">Enter the 7-digit Maldives number only.</span>{touched.phone&&!phoneValid?<span className="fieldError">Enter a valid 7-digit Maldives number.</span>:null}</label>
      </>:null}

      <label className="authField"><span className="authFieldLabel">Email address</span><div className={`authInputWrap${touched.email&&!emailValid?' invalid':''}`}><span className="authInputIcon"><FieldIcon name="mail"/></span><input type="email" inputMode="email" autoComplete="email" value={email} onBlur={()=>setTouched(v=>({...v,email:true}))} onChange={e=>{setEmail(e.target.value);if(touched.email)setTouched(v=>({...v,email:false}));}} placeholder="you@example.com" aria-invalid={touched.email&&!emailValid}/></div>{touched.email&&!emailValid?<span className="fieldError">{emailTrimmed?'Enter a valid email address.':'Enter your email address.'}</span>:null}</label>

      <label className="authField"><span className="authFieldLabel">Password</span><div className={`authInputWrap passwordField${touched.password&&!passwordValid?' invalid':''}`}><span className="authInputIcon"><FieldIcon name="lock"/></span><input type={showPassword?'text':'password'} autoComplete={isLogin?'current-password':'new-password'} value={password} onBlur={()=>setTouched(v=>({...v,password:true}))} onKeyUp={e=>setCapsLock(e.getModifierState('CapsLock'))} onKeyDown={e=>setCapsLock(e.getModifierState('CapsLock'))} onChange={e=>setPassword(e.target.value)} minLength={8} aria-invalid={touched.password&&!passwordValid}/><button type="button" className="passwordToggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} title={showPassword?'Hide password':'Show password'}><EyeIcon off={showPassword}/></button></div>{capsLock?<span className="capsWarning">Caps Lock is on.</span>:null}{!isLogin?<span className="fieldHelp">Use at least 8 characters.</span>:null}{touched.password&&!passwordValid?<span className="fieldError">Password must be at least 8 characters.</span>:null}</label>

      {isLogin?<>
       <div className="authUtility"><label className="rememberMe"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/><span>Remember me</span></label><a href="/forgot-password">Forgot password?</a></div>
       <section className="authWorkspaceChooser" aria-label="Choose workspace after sign in">
        <div className="authWorkspaceHead"><span>Open after sign in</span><small>Use one account across your workspaces</small></div>
        <button type="button" className={`authWorkspaceOption provider${workspace==='provider'?' selected':''}`} onClick={()=>setWorkspace('provider')} aria-pressed={workspace==='provider'}>
         <span className="authWorkspaceIcon"><WorkspaceIcon name="provider"/></span><span className="authWorkspaceCopy"><strong>Service Provider</strong><small>Manage jobs, services and availability</small></span><span className="authWorkspaceAction">{workspace==='provider'?'Selected':'Choose'}</span>
        </button>
        <button type="button" className={`authWorkspaceOption customer${workspace==='customer'?' selected':''}`} onClick={()=>setWorkspace('customer')} aria-pressed={workspace==='customer'}>
         <span className="authWorkspaceIcon"><WorkspaceIcon name="customer"/></span><span className="authWorkspaceCopy"><strong>Customer Portal</strong><small>Request services and track your requests</small></span><span className="authWorkspaceAction">{workspace==='customer'?'Selected':'Choose'}</span>
        </button>
       </section>
      </>:null}

      <button className="authSubmit" disabled={busy||!formValid} aria-busy={busy}>{busy?<><span className="buttonSpinner" aria-hidden="true"/>{isLogin?'Signing in…':'Creating account…'}</>:<>{isLogin?'Continue':'Create Account'}<span className="authSubmitArrow" aria-hidden="true">→</span></>}</button>
     </form>

     {message?<p className="formMessage" role="status">{message}</p>:null}
    </section>

    <p className="authFootnote"><span aria-hidden="true">✓</span> One account · Customer and Service Provider workspaces</p>
   </div>
  </main>
 </div>;
}
