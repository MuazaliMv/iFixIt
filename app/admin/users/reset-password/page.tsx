'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import AdminNav from '../../AdminNav';
import '../users.module.css';

const ADMIN_USERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-users';

type UserRow={user_id:string;email?:string|null;full_name?:string|null;role:'CUSTOMER'|'PROVIDER'|'ADMIN';account_status?:string|null};

export default function AdminResetPasswordPage(){
 const[users,setUsers]=useState<UserRow[]>([]);
 const[query,setQuery]=useState('');
 const[selected,setSelected]=useState<UserRow|null>(null);
 const[password,setPassword]=useState('');
 const[confirmPassword,setConfirmPassword]=useState('');
 const[message,setMessage]=useState('Loading users…');
 const[busy,setBusy]=useState(false);

 async function token(){
  const{data}=await supabase.auth.getSession();
  if(!data.session){window.location.href='/login';return'';}
  return data.session.access_token;
 }
 async function call(body:Record<string,unknown>={}){
  const t=await token();if(!t)return null;
  const response=await fetch(ADMIN_USERS_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||'Admin request failed');
  return payload;
 }
 async function load(){
  try{const payload=await call();if(!payload)return;setUsers(payload.users||[]);setMessage('Select a user to reset their password.');}
  catch(error){setMessage(error instanceof Error?error.message:'Unable to load users.');}
 }
 useEffect(()=>{void load();},[]);
 const visible=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return users.filter(u=>!q||`${u.full_name||''} ${u.email||''} ${u.role} ${u.user_id}`.toLowerCase().includes(q)).slice(0,50);
 },[users,query]);
 const passwordValid=password.length>=10&&password.length<=128&&/[A-Z]/.test(password)&&/[a-z]/.test(password)&&/\d/.test(password);
 async function resetPassword(){
  if(!selected)return;
  if(!passwordValid){setMessage('Password must be 10-128 characters and include uppercase, lowercase and a number.');return;}
  if(password!==confirmPassword){setMessage('Password confirmation does not match.');return;}
  if(!window.confirm(`Reset the password for ${selected.full_name||selected.email||'this user'}?`))return;
  setBusy(true);
  try{
   const payload=await call({action:'reset_password',targetUserId:selected.user_id,password});
   setMessage(payload?.message||'Password reset successfully.');
   setPassword('');setConfirmPassword('');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to reset password.');}
  finally{setBusy(false);}
 }
 return <main className="shell">
  <header className="topbar usersTopbar"><div><p className="eyebrow">ADMIN WORKSPACE</p><h1 className="pageTitle">Reset User Password</h1><p className="tagline">Securely set a new password for a user account. Passwords are never written to activity logs.</p></div></header>
  <AdminNav/>
  <section className="panel" style={{display:'grid',gap:18}}>
   <div className="usersStatusBar" role="status"><span className="statusCheck">✓</span><span><b>{message}</b></span></div>
   <label style={{display:'grid',gap:8,fontWeight:700}}>Find user<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email, role or user ID" style={{padding:'12px 14px',borderRadius:12,border:'1px solid var(--border)',font:'inherit'}}/></label>
   <div style={{display:'grid',gap:10,maxHeight:360,overflow:'auto'}}>{visible.map(u=><button key={u.user_id} type="button" onClick={()=>{setSelected(u);setPassword('');setConfirmPassword('');setMessage(`Selected ${u.full_name||u.email||'user'}.`);}} className={selected?.user_id===u.user_id?'primary':'secondary'} style={{textAlign:'left',justifyContent:'space-between',padding:'12px 14px'}}><span><b>{u.full_name||'Unnamed user'}</b><span style={{display:'block',fontSize:13,opacity:.8}}>{u.email||'No email'} · {u.role}</span></span><span>{selected?.user_id===u.user_id?'Selected':'Select'}</span></button>)}</div>
   {selected?<div className="panel" style={{display:'grid',gap:14,margin:0}}><div><p className="eyebrow">SELECTED USER</p><h2 style={{margin:'4px 0'}}>{selected.full_name||'Unnamed user'}</h2><p className="muted" style={{margin:0}}>{selected.email||'No email'} · {selected.role}</p></div><label style={{display:'grid',gap:8,fontWeight:700}}>New password<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="10+ characters, upper/lowercase and number" style={{padding:'12px 14px',borderRadius:12,border:'1px solid var(--border)',font:'inherit'}}/></label><label style={{display:'grid',gap:8,fontWeight:700}}>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter the password" style={{padding:'12px 14px',borderRadius:12,border:'1px solid var(--border)',font:'inherit'}}/></label><p className="muted" style={{margin:0}}>Required: 10-128 characters, uppercase, lowercase and a number.</p><button className="primary" disabled={busy||!passwordValid||password!==confirmPassword} onClick={()=>void resetPassword()}>{busy?'Resetting…':'Reset Password'}</button></div>:null}
  </section>
 </main>;
}
