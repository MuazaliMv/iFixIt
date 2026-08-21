'use client';

import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage(){
 const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim()})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to send reset email.');setMessage(p.message||'If that account exists, a reset link has been sent.');}catch(err){setMessage(err instanceof Error?err.message:'Unable to send reset email.');}finally{setBusy(false);}}
 return <main className="shell authShell"><header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Password recovery</p></div><a className="secondary" href="/login">Back to Sign In</a></header><section className="panel authCard"><div className="panelHeader"><div><p className="eyebrow">ACCOUNT RECOVERY</p><h2>Forgot your password?</h2></div></div><p className="sectionLead">Enter your account email. We’ll send a secure, time-limited password reset link.</p><form className="authForm" onSubmit={submit}><label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label><button className="primary" disabled={busy}>{busy?'Sending…':'Send Reset Link'}</button></form>{message?<p className="formMessage" role="status">{message}</p>:null}</section></main>;
}
