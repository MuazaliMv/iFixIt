'use client';

import { FormEvent, useState } from 'react';
import { invalidateProfileCache } from '../../../lib/apiClient';
import '../profile-redesign.css';

export default function VerifyPhonePage(){
 const[step,setStep]=useState<'phone'|'otp'>('phone');
 const[phone,setPhone]=useState('');
 const[otp,setOtp]=useState('');
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');
 const phoneValid=/^\d{7}$/.test(phone);
 const otpValid=/^\d{4}$/.test(otp);

 function submitPhone(event:FormEvent){
  event.preventDefault();
  if(!phoneValid){setMessage('Enter a valid 7-digit Maldives phone number.');return;}
  setStep('otp');
  setMessage('Testing code: 9999');
 }

 async function submitOtp(event:FormEvent){
  event.preventDefault();
  if(!otpValid){setMessage('Enter the 4-digit verification code.');return;}
  setBusy(true);setMessage('Verifying contact number…');
  try{
   const response=await fetch('/api/user/verify-phone',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({phone:`+960${phone}`,otp})});
   const payload=await response.json().catch(()=>({}));
   if(response.status===401){window.location.replace('/login?next=%2Fprofile%2Fverify-phone');return;}
   if(!response.ok||!payload?.ok){setMessage(payload?.error||'Unable to verify contact number.');return;}
   invalidateProfileCache();
   window.dispatchEvent(new Event('fixit:profile-updated'));
   window.location.replace('/profile');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to verify contact number.');}
  finally{setBusy(false);}
 }

 return <main className="profileRedesignPage"><div className="profileRedesignShell"><div className="profileRedesignGrid"><div className="profileContentColumn"><section className="profileEditCard"><div className="profileEditForm"><div className="profileFormSection">
  <h1>Verify your contact number</h1>
  <p>This is a one-time step for older iFixMV accounts. Your verified Maldives phone number will become your permanent contact and sign-in number.</p>
  {step==='phone'?<form onSubmit={submitPhone}>
   <label>Phone Number<span className="profilePhoneField"><b>🇲🇻 +960</b><input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={e=>{setPhone(e.target.value.replace(/\D/g,'').slice(0,7));setMessage('');}} placeholder="Enter 7-digit number" maxLength={7} autoFocus/></span></label>
   <button type="submit" disabled={!phoneValid||busy}>Continue</button>
  </form>:<form onSubmit={submitOtp}>
   <label>Verification code<input type="tel" inputMode="numeric" value={otp} onChange={e=>{setOtp(e.target.value.replace(/\D/g,'').slice(0,4));setMessage('');}} placeholder="4-digit code" maxLength={4} autoFocus/></label>
   <button type="submit" disabled={!otpValid||busy}>{busy?'Verifying…':'Verify & continue'}</button>
   <button type="button" disabled={busy} onClick={()=>{setStep('phone');setOtp('');setMessage('');}}>Change number</button>
  </form>}
  {message?<p role="status">{message}</p>:null}
 </div></div></section></div></div></div></main>;
}
