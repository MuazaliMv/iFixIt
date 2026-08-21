'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ADMIN_USERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-users';
type UserRow={user_id:string;email?:string|null;full_name?:string|null;role:'CUSTOMER'|'PROVIDER'|'ADMIN';provider_approved:boolean;phone_number?:string|null;is_phone_verified:boolean;profile_photo_url?:string|null;photoUrl?:string|null;created_at:string;updated_at:string};

export default function AdminUsersPage(){
 const[users,setUsers]=useState<UserRow[]>([]);const[currentUserId,setCurrentUserId]=useState('');const[busyUser,setBusyUser]=useState('');const[message,setMessage]=useState('Loading users…');
 useEffect(()=>{void load();},[]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}setCurrentUserId(data.session.user.id);return data.session.access_token;}
 async function call(url:string,body:Record<string,unknown>={}){const t=await jwt();if(!t)return null;const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const payload=await call(ADMIN_USERS_URL);if(!payload)return;setUsers(payload.users||[]);setMessage('User list loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load users.');}}
 async function changeRole(row:UserRow,role:'CUSTOMER'|'PROVIDER'){setBusyUser(row.user_id);try{await call(ADMIN_URL,{action:'set_user_role',targetUserId:row.user_id,role,providerApproved:role==='PROVIDER'?row.provider_approved:false});await load();setMessage(`${row.full_name||row.email||'User'} changed to ${role}.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to change role.');}finally{setBusyUser('');}}
 function avatar(u:UserRow){const initial=(u.full_name||u.email||'U').slice(0,1).toUpperCase();return u.photoUrl?<img src={u.photoUrl} alt="" style={{width:42,height:42,borderRadius:'50%',objectFit:'cover'}}/>:<span style={{width:42,height:42,borderRadius:'50%',display:'inline-grid',placeItems:'center',background:'var(--surface-alt)',fontWeight:800}}>{initial}</span>;}
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Users</p></div></header><AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">USER MANAGEMENT</p><h2>Authenticated Users</h2></div><span className="pill">{users.length} users</span></div><p className="formMessage" role="status">{message}</p><div className="userTableWrap"><table className="userTable"><thead><tr><th>User</th><th>Phone</th><th>Verification</th><th>Role</th><th>Provider Status</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.user_id}><td><div style={{display:'flex',gap:10,alignItems:'center'}}>{avatar(u)}<div><strong>{u.full_name||'Unnamed user'}</strong><small>{u.email||'No email'}</small>{u.user_id===currentUserId?<span className="selfTag">You</span>:null}</div></div></td><td>{u.phone_number||'—'}</td><td>{u.phone_number?<span className={u.is_phone_verified?'profileBadge verified':'profileBadge warning'}>{u.is_phone_verified?'Verified':'Unverified'}</span>:'—'}</td><td><span className="pill">{u.role}</span></td><td>{u.role==='PROVIDER'?(u.provider_approved?'Approved':'Pending'):'—'}</td><td><div className="tableActions">{u.role!=='ADMIN'&&u.role!=='CUSTOMER'?<button className="secondary compactButton" disabled={busyUser===u.user_id} onClick={()=>changeRole(u,'CUSTOMER')}>Make Customer</button>:null}{u.role!=='ADMIN'&&u.role!=='PROVIDER'?<button className="primary compactButton" disabled={busyUser===u.user_id} onClick={()=>changeRole(u,'PROVIDER')}>Make Provider</button>:null}{u.role==='ADMIN'?<span className="muted">Protected admin</span>:null}</div></td></tr>)}</tbody></table></div>{!users.length?<div className="emptyQueue">No authenticated users found.</div>:null}</section>
 </main>;
}
