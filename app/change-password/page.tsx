'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

function EyeIcon({hidden}:{hidden:boolean}){
 return hidden
  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c5.5 0 9.5 5 9.5 8a9.6 9.6 0 0 1-2 3.7"/><path d="M6.2 6.2C3.9 7.7 2.5 10 2.5 12c0 3 4 8 9.5 8a10 10 0 0 0 4.1-.9"/></svg>
  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12S6 4 12 4s9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
}

function ShieldIcon(){return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>}

function PasswordField({id,label,value,onChange,visible,onToggle,error,success}:{id:string;label:string;value:string;onChange:(v:string)=>void;visible:boolean;onToggle:()=>void;error?:string;success?:string}){
 return <div className="cpField">
  <label htmlFor={id}>{label}</label>
  <div className={`cpInputWrap${error?' hasError':''}${success?' hasSuccess':''}`}>
   <input id={id} type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} autoComplete={id==='currentPassword'?'current-password':'new-password'} placeholder={`Enter ${label.toLowerCase()}`} />
   <button type="button" className="cpEye" onClick={onToggle} aria-label={visible?'Hide password':'Show password'}><EyeIcon hidden={visible}/></button>
  </div>
  {error?<p className="cpInline cpError">× {error}</p>:null}
  {success&&!error?<p className="cpInline cpSuccess">✓ {success}</p>:null}
 </div>;
}

export default function ChangePasswordPage(){
 const[currentPassword,setCurrentPassword]=useState('');
 const[newPassword,setNewPassword]=useState('');
 const[confirmPassword,setConfirmPassword]=useState('');
 const[showCurrent,setShowCurrent]=useState(false);
 const[showNew,setShowNew]=useState(false);
 const[showConfirm,setShowConfirm]=useState(false);
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');
 const[isError,setIsError]=useState(false);
 const[ready,setReady]=useState(false);

 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(r=>{if(!active)return;if(r.status===401){window.location.replace('/login?next=%2Fchange-password');return;}if(!r.ok)throw new Error('Unable to verify session.');setReady(true);})
   .catch(()=>{if(active){setIsError(true);setMessage('Unable to verify your session. Please refresh and try again.');setReady(true);}})
   .finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[]);

 const requirements=useMemo(()=>[
  {label:'At least 10 characters',ok:newPassword.length>=10},
  {label:'Contains an uppercase letter',ok:/[A-Z]/.test(newPassword)},
  {label:'Contains a lowercase letter',ok:/[a-z]/.test(newPassword)},
  {label:'Contains a number',ok:/\d/.test(newPassword)},
  {label:'Different from your current password',ok:newPassword.length>0&&currentPassword.length>0&&newPassword!==currentPassword},
 ],[currentPassword,newPassword]);
 const passwordValid=requirements.every(r=>r.ok)&&newPassword.length<=128;
 const mismatch=confirmPassword.length>0&&confirmPassword!==newPassword;
 const confirmValid=confirmPassword.length>0&&confirmPassword===newPassword;
 const valid=currentPassword.length>0&&passwordValid&&confirmValid;

 async function submit(e:FormEvent){
  e.preventDefault();
  if(!valid)return;
  setBusy(true);setMessage('');setIsError(false);
  try{
   const r=await fetch('/api/auth/change-password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});
   const p=await r.json().catch(()=>({}));
   if(r.status===401){window.location.replace('/login?next=%2Fchange-password');return;}
   if(!r.ok)throw new Error(p?.error||'Unable to change password.');
   setCurrentPassword('');setNewPassword('');setConfirmPassword('');
   setMessage('Password changed successfully.');
  }catch(err){setIsError(true);setMessage(err instanceof Error?err.message:'Unable to change password.');}
  finally{setBusy(false);}
 }

 if(!ready)return <main className="cpPage"><div className="cpLoading">Loading account security…</div></main>;
 return <main className="cpPage">
  <div className="cpShell">
   <section className="cpIntro">
    <div className="cpShield"><ShieldIcon/></div>
    <p className="cpEyebrow">ACCOUNT SECURITY</p>
    <h1>Change password</h1>
    <p>Create a strong password that you don’t use for any other account.</p>
   </section>

   <form className="cpCard" onSubmit={submit}>
    <PasswordField id="currentPassword" label="Current password" value={currentPassword} onChange={setCurrentPassword} visible={showCurrent} onToggle={()=>setShowCurrent(v=>!v)}/>
    <div className="cpDivider"/>
    <PasswordField id="newPassword" label="New password" value={newPassword} onChange={setNewPassword} visible={showNew} onToggle={()=>setShowNew(v=>!v)}/>

    <div className="cpRequirements" aria-live="polite">
     <strong>Password requirements</strong>
     {requirements.map(rule=><div className={`cpRule${rule.ok?' ok':''}`} key={rule.label}><span>{rule.ok?'✓':'•'}</span><p>{rule.label}</p></div>)}
    </div>

    <PasswordField id="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirm} onToggle={()=>setShowConfirm(v=>!v)} error={mismatch?'Passwords do not match.':undefined} success={confirmValid?'Passwords match.':undefined}/>

    <button className="cpSubmit" disabled={busy||!valid}>{busy?'Updating…':'Update password'}</button>
    <p className="cpNote">Updating your password may sign you out of other devices for security.</p>
    {message?<p className={`cpMessage${isError?' error':''}`} role="status">{message}</p>:null}
   </form>

   <footer className="cpFooter"><p>Don’t remember your current password?</p><a href="/forgot-password">Send a secure password reset email</a><small>✓ Your password is securely protected by iFixMV.</small></footer>
  </div>

  <style jsx global>{`
   .cpPage{min-height:100dvh;background:#f7f9fc;color:#172033}.cpShell{width:min(560px,calc(100% - 28px));margin:auto;padding:32px 0 calc(56px + env(safe-area-inset-bottom))}.cpIntro{margin-bottom:22px}.cpShield{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:#eff6ff;color:#2563eb;margin-bottom:16px}.cpEyebrow{margin:0 0 6px;color:#2563eb;font-size:12px;font-weight:900;letter-spacing:.13em}.cpIntro h1{margin:0;font-size:32px;letter-spacing:-1px}.cpIntro>p:last-child{margin:9px 0 0;color:#667085;line-height:1.6}.cpCard{background:#fff;border:1px solid #e4e9f1;border-radius:24px;padding:26px;box-shadow:0 14px 36px rgba(15,23,42,.06)}.cpField{display:grid;gap:8px}.cpField>label{font-size:14px;font-weight:800}.cpInputWrap{position:relative}.cpInputWrap input{min-height:50px;padding-right:52px;font-size:16px;border-radius:13px}.cpEye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:#98a2b3;display:grid;place-items:center;transition:.16s}.cpEye:hover{background:#f1f5f9;color:#344054}.cpInputWrap.hasError input{border-color:#fca5a5;box-shadow:0 0 0 3px #fef2f2}.cpInputWrap.hasSuccess input{border-color:#86efac}.cpInline{margin:0;font-size:13px;font-weight:700}.cpError{color:#b42318}.cpSuccess{color:#168451}.cpDivider{height:1px;background:#eef2f6;margin:22px 0}.cpRequirements{margin:14px 0 22px;padding:16px;border-radius:16px;background:#f8fafc;border:1px solid #edf1f5}.cpRequirements>strong{display:block;margin-bottom:12px;font-size:14px}.cpRule{display:flex;align-items:center;gap:9px;min-height:27px;color:#667085;font-size:13px}.cpRule span{width:20px;height:20px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:#e9eef5;color:#98a2b3;font-weight:900}.cpRule p{margin:0}.cpRule.ok{color:#15803d;font-weight:700}.cpRule.ok span{background:#dcfce7;color:#15803d}.cpSubmit{width:100%;min-height:50px;margin-top:24px;border:1px solid #2563eb;border-radius:13px;background:#2563eb;color:white;font-weight:900;box-shadow:0 7px 18px rgba(37,99,235,.18);transition:.16s}.cpSubmit:hover:not(:disabled){background:#1d4ed8;transform:translateY(-1px)}.cpSubmit:disabled{background:#cbd5e1;border-color:#cbd5e1;box-shadow:none;cursor:not-allowed}.cpNote{margin:11px 0 0;text-align:center;color:#98a2b3;font-size:12px;line-height:1.5}.cpMessage{margin:15px 0 0;padding:12px 14px;border-radius:12px;background:#ecfdf3;color:#168451;font-size:13px;font-weight:800}.cpMessage.error{background:#fff1f1;color:#b42318}.cpFooter{text-align:center;padding:21px 8px 0;color:#667085}.cpFooter p{margin:0;font-size:14px}.cpFooter a{display:inline-block;margin-top:6px;color:#2563eb;font-size:14px;font-weight:800}.cpFooter small{display:block;margin-top:24px;color:#98a2b3;font-size:12px}.cpLoading{width:min(520px,calc(100% - 28px));margin:80px auto;background:white;border:1px solid #e4e9f1;border-radius:20px;padding:24px;color:#667085;text-align:center}
   @media(max-width:620px){.cpShell{width:calc(100% - 20px);padding:20px 0 calc(92px + env(safe-area-inset-bottom))}.cpIntro h1{font-size:28px}.cpCard{padding:20px 16px;border-radius:20px}}
  `}</style>
 </main>;
}
