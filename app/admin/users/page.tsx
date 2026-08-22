'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ADMIN_USERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-users';

type SavedAddress={label?:string|null;address_line1?:string|null;city?:string|null;state_region?:string|null;country?:string|null};
type UserRow={
 user_id:string;email?:string|null;full_name?:string|null;role:'CUSTOMER'|'PROVIDER'|'ADMIN';provider_approved:boolean;
 phone_number?:string|null;is_phone_verified:boolean;profile_photo_url?:string|null;photoUrl?:string|null;
 address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;
 defaultServiceAddress?:SavedAddress|null;created_at:string;updated_at:string;
 last_sign_in_at?:string|null;last_seen_at?:string|null;email_confirmed_at?:string|null;phone_confirmed_at?:string|null;
 account_status?:string|null;status?:string|null;business_name?:string|null;service_category?:string|null;subscription_plan?:string|null;
 request_count?:number|null;open_request_count?:number|null;completed_request_count?:number|null;cancelled_request_count?:number|null;
 completed_job_count?:number|null;average_rating?:number|null;review_count?:number|null;profile_completeness?:number|null;
};
type RoleFilter='ALL'|'CUSTOMER'|'PROVIDER'|'ADMIN';

export default function AdminUsersPage(){
 const[users,setUsers]=useState<UserRow[]>([]);const[currentUserId,setCurrentUserId]=useState('');const[busyUser,setBusyUser]=useState('');const[message,setMessage]=useState('Loading users…');const[query,setQuery]=useState('');const[roleFilter,setRoleFilter]=useState<RoleFilter>('ALL');
 useEffect(()=>{void load();},[]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}setCurrentUserId(data.session.user.id);return data.session.access_token;}
 async function call(url:string,body:Record<string,unknown>={}){const t=await jwt();if(!t)return null;const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const payload=await call(ADMIN_USERS_URL);if(!payload)return;setUsers(payload.users||[]);setMessage('User accounts loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load users.');}}
 async function changeRole(row:UserRow,role:'CUSTOMER'|'PROVIDER'){setBusyUser(row.user_id);try{await call(ADMIN_URL,{action:'set_user_role',targetUserId:row.user_id,role,providerApproved:role==='PROVIDER'?row.provider_approved:false});await load();setMessage(`${row.full_name||row.email||'User'} changed to ${role}. ${role==='PROVIDER'?'Provider approval and operational setup remain under Providers.':''}`.trim());}catch(error){setMessage(error instanceof Error?error.message:'Unable to change role.');}finally{setBusyUser('');}}
 function avatar(u:UserRow){const src=u.profile_photo_url||u.photoUrl;const initial=(u.full_name||u.email||'U').slice(0,1).toUpperCase();return src?<img src={src} alt={`${u.full_name||'User'} profile`} style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',flex:'0 0 auto',border:'1px solid var(--border)'}}/>:<span style={{width:72,height:72,borderRadius:'50%',display:'inline-grid',placeItems:'center',background:'var(--surface-alt)',fontWeight:800,fontSize:24,flex:'0 0 auto'}}>{initial}</span>;}
 function coreAddress(u:UserRow){return[u.address_line1,u.address_line2,u.city,u.state_region,u.postal_code,u.country].filter(Boolean).join(', ');}
 function defaultAddress(u:UserRow){const a=u.defaultServiceAddress;return a?[a.label,a.address_line1,a.city,a.state_region,a.country].filter(Boolean).join(' · '):'';}
 function date(value?:string|null){if(!value)return 'Not available';const d=new Date(value);return Number.isNaN(d.getTime())?'Not available':d.toLocaleString();}
 function value(v:unknown){return v===null||v===undefined||v===''?'Not available':String(v);}
 const visible=useMemo(()=>users.filter(u=>{const text=`${u.full_name||''} ${u.email||''} ${u.phone_number||''} ${u.role} ${u.user_id}`.toLowerCase();return(roleFilter==='ALL'||u.role===roleFilter)&&(!query.trim()||text.includes(query.trim().toLowerCase()));}),[users,query,roleFilter]);
 const counts=useMemo(()=>({customers:users.filter(u=>u.role==='CUSTOMER').length,providers:users.filter(u=>u.role==='PROVIDER').length,admins:users.filter(u=>u.role==='ADMIN').length}),[users]);
 const detailStyle={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12} as const;
 const itemStyle={padding:'12px 14px',border:'1px solid var(--border)',borderRadius:14,background:'var(--surface-alt)',minWidth:0} as const;
 const labelStyle={display:'block',fontSize:12,fontWeight:800,textTransform:'uppercase' as const,letterSpacing:'.04em',opacity:.65,marginBottom:4};
 const valueStyle={display:'block',fontSize:14,fontWeight:650,overflowWrap:'anywhere' as const};
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Users</p></div><button className="secondary" onClick={()=>void load()}>Refresh</button></header><AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">IDENTITY & ACCESS</p><h2>User Accounts</h2><p className="muted">Complete account information for every user. Provider operational details remain managed under Providers.</p></div><span className="pill">{users.length} users</span></div>
   <div className="adminStats"><div className="statCard"><span>Customers</span><strong>{counts.customers}</strong></div><div className="statCard"><span>Providers</span><strong>{counts.providers}</strong></div><div className="statCard"><span>Admins</span><strong>{counts.admins}</strong></div></div>
   <p className="formMessage" role="status">{message}</p>
   <div className="formGrid"><label className="full">Search users<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, email, phone, role or user ID"/></label></div>
   <div className="filterRow">{(['ALL','CUSTOMER','PROVIDER','ADMIN'] as const).map(x=><button key={x} className={roleFilter===x?'filterChip active':'filterChip'} onClick={()=>setRoleFilter(x)}>{x==='ALL'?'All':x[0]+x.slice(1).toLowerCase()}</button>)}</div>
  </section>

  <section className="panel" style={{display:'grid',gap:16}}>{visible.map(u=>{
   const accountAddress=coreAddress(u);const serviceAddress=defaultAddress(u);const accountStatus=u.account_status||u.status||'Active';const lastActive=u.last_seen_at||u.last_sign_in_at;
   return <article key={u.user_id} style={{border:'1px solid var(--border)',borderRadius:22,padding:20,background:'var(--surface)',display:'grid',gap:18}}>
    <div style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>{avatar(u)}<div style={{minWidth:0,flex:'1 1 220px'}}><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><h3 style={{margin:0}}>{u.full_name||'Unnamed user'}</h3>{u.user_id===currentUserId?<span className="selfTag">You</span>:null}</div><p className="muted" style={{margin:'4px 0 8px',overflowWrap:'anywhere'}}>{u.email||'No email address'}</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><span className="pill">{u.role}</span><span className="pill">{accountStatus}</span>{u.role==='PROVIDER'?<span className={u.provider_approved?'profileBadge verified':'profileBadge warning'}>{u.provider_approved?'Provider approved':'Provider not approved'}</span>:null}</div></div></div>

    <div style={detailStyle}>
     <div style={itemStyle}><span style={labelStyle}>Phone</span><span style={valueStyle}>{value(u.phone_number)}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Phone verification</span><span style={valueStyle}>{u.phone_number?(u.is_phone_verified?'Verified':'Unverified'):'Not available'}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Email verification</span><span style={valueStyle}>{u.email_confirmed_at?'Verified':'Not available'}</span></div>
     <div style={itemStyle}><span style={labelStyle}>User ID</span><span style={valueStyle}>{u.user_id}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Joined</span><span style={valueStyle}>{date(u.created_at)}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Last updated</span><span style={valueStyle}>{date(u.updated_at)}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Last active</span><span style={valueStyle}>{date(lastActive)}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Account address</span><span style={valueStyle}>{accountAddress||'Not available'}</span></div>
     <div style={itemStyle}><span style={labelStyle}>Default service address</span><span style={valueStyle}>{serviceAddress||'Not available'}</span></div>
     {u.business_name?<div style={itemStyle}><span style={labelStyle}>Business name</span><span style={valueStyle}>{u.business_name}</span></div>:null}
     {u.service_category?<div style={itemStyle}><span style={labelStyle}>Service category</span><span style={valueStyle}>{u.service_category}</span></div>:null}
     {u.subscription_plan?<div style={itemStyle}><span style={labelStyle}>Subscription</span><span style={valueStyle}>{u.subscription_plan}</span></div>:null}
     {u.request_count!=null?<div style={itemStyle}><span style={labelStyle}>Requests</span><span style={valueStyle}>{u.request_count}</span></div>:null}
     {u.open_request_count!=null?<div style={itemStyle}><span style={labelStyle}>Open requests</span><span style={valueStyle}>{u.open_request_count}</span></div>:null}
     {u.completed_request_count!=null?<div style={itemStyle}><span style={labelStyle}>Completed requests</span><span style={valueStyle}>{u.completed_request_count}</span></div>:null}
     {u.cancelled_request_count!=null?<div style={itemStyle}><span style={labelStyle}>Cancelled requests</span><span style={valueStyle}>{u.cancelled_request_count}</span></div>:null}
     {u.completed_job_count!=null?<div style={itemStyle}><span style={labelStyle}>Completed jobs</span><span style={valueStyle}>{u.completed_job_count}</span></div>:null}
     {u.average_rating!=null?<div style={itemStyle}><span style={labelStyle}>Rating</span><span style={valueStyle}>{u.average_rating.toFixed(1)}{u.review_count!=null?` / 5 · ${u.review_count} reviews`:' / 5'}</span></div>:null}
     {u.profile_completeness!=null?<div style={itemStyle}><span style={labelStyle}>Profile completeness</span><span style={valueStyle}>{u.profile_completeness}%</span></div>:null}
    </div>

    <div className="tableActions" style={{display:'flex',gap:10,flexWrap:'wrap'}}>{u.role==='PROVIDER'?<a className="secondary compactButton" href={`/admin/providers/${u.user_id}`}>Open Provider Record</a>:null}{u.role!=='ADMIN'&&u.role!=='CUSTOMER'?<button className="secondary compactButton" disabled={busyUser===u.user_id} onClick={()=>changeRole(u,'CUSTOMER')}>Change to Customer</button>:null}{u.role!=='ADMIN'&&u.role!=='PROVIDER'?<button className="primary compactButton" disabled={busyUser===u.user_id} onClick={()=>changeRole(u,'PROVIDER')}>Grant Provider Access</button>:null}{u.role==='ADMIN'?<span className="muted">Protected admin account</span>:null}</div>
   </article>;
  })}{!visible.length?<div className="emptyQueue">No users match this view.</div>:null}</section>
 </main>;
}
