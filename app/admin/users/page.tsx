'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ADMIN_USERS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-users';

type SavedAddress={label?:string|null;address_line1?:string|null;city?:string|null;state_region?:string|null;country?:string|null};
type UserRow={user_id:string;email?:string|null;full_name?:string|null;role:'CUSTOMER'|'PROVIDER'|'ADMIN';provider_approved:boolean;phone_number?:string|null;is_phone_verified:boolean;profile_photo_url?:string|null;photoUrl?:string|null;address_line1?:string|null;address_line2?:string|null;city?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;defaultServiceAddress?:SavedAddress|null;created_at:string;updated_at:string;last_sign_in_at?:string|null;last_seen_at?:string|null;email_confirmed_at?:string|null;account_status?:string|null;status?:string|null;business_name?:string|null;service_category?:string|null;subscription_plan?:string|null;request_count?:number|null;open_request_count?:number|null;completed_request_count?:number|null;cancelled_request_count?:number|null;completed_job_count?:number|null;average_rating?:number|null;review_count?:number|null;profile_completeness?:number|null;provider_is_suspended?:boolean|null;provider_suspended_at?:string|null;suspension_reason?:string|null};
type RoleFilter='ALL'|'CUSTOMER'|'PROVIDER'|'ADMIN';

export default function AdminUsersPage(){
 const[users,setUsers]=useState<UserRow[]>([]);const[currentUserId,setCurrentUserId]=useState('');const[busyUser,setBusyUser]=useState('');const[message,setMessage]=useState('');const[query,setQuery]=useState('');const[roleFilter,setRoleFilter]=useState<RoleFilter>('ALL');const[expanded,setExpanded]=useState<Record<string,boolean>>({});
 useEffect(()=>{void load();},[]);
 async function jwt(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}setCurrentUserId(data.session.user.id);return data.session.access_token;}
 async function call(url:string,body:Record<string,unknown>={}){const t=await jwt();if(!t)return null;const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function load(){try{const payload=await call(ADMIN_USERS_URL);if(!payload)return;setUsers(payload.users||[]);setMessage('');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load users.');}}
 async function changeRole(row:UserRow,role:'CUSTOMER'|'PROVIDER'){setBusyUser(row.user_id);try{await call(ADMIN_URL,{action:'set_user_role',targetUserId:row.user_id,role,providerApproved:role==='PROVIDER'?row.provider_approved:false});await load();setMessage(`${row.full_name||row.email||'User'} changed to ${role}.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to change role.');}finally{setBusyUser('');}}
 async function setSuspended(row:UserRow,suspended:boolean){const name=row.full_name||row.email||'User';const reason=suspended?window.prompt(`Reason for suspending ${name} (optional):`,'')||'':null;if(suspended&&!window.confirm(`Suspend ${name}? ${row.role==='PROVIDER'?'They will stop receiving new service requests.':'They will not be able to make new service requests.'}`))return;setBusyUser(row.user_id);try{await call(ADMIN_URL,{action:'set_account_suspension',targetUserId:row.user_id,suspended,reason});await load();setMessage(suspended?`${name} suspended. ${row.role==='PROVIDER'?'No new requests will be dispatched to this provider.':'This user can no longer make new service requests.'}`:`${name} reactivated.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to update account status.');}finally{setBusyUser('');}}
 function avatar(u:UserRow){const src=u.profile_photo_url||u.photoUrl;const initial=(u.full_name||u.email||'U').slice(0,1).toUpperCase();return src?<img src={src} alt={`${u.full_name||'User'} profile`} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',flex:'0 0 auto',border:'1px solid var(--border)'}}/>:<span style={{width:64,height:64,borderRadius:'50%',display:'inline-grid',placeItems:'center',background:'var(--surface-alt)',fontWeight:800,fontSize:22,flex:'0 0 auto'}}>{initial}</span>;}
 function coreAddress(u:UserRow){return[u.address_line1,u.address_line2,u.city,u.state_region,u.postal_code,u.country].filter(Boolean).join(', ');}
 function defaultAddress(u:UserRow){const a=u.defaultServiceAddress;return a?[a.label,a.address_line1,a.city,a.state_region,a.country].filter(Boolean).join(' · '):'';}
 function date(value?:string|null){if(!value)return 'Not available';const d=new Date(value);return Number.isNaN(d.getTime())?'Not available':d.toLocaleString();}
 const visible=useMemo(()=>users.filter(u=>{const text=`${u.full_name||''} ${u.email||''} ${u.phone_number||''} ${u.role} ${u.user_id} ${u.account_status||''}`.toLowerCase();return(roleFilter==='ALL'||u.role===roleFilter)&&(!query.trim()||text.includes(query.trim().toLowerCase()));}),[users,query,roleFilter]);
 const counts=useMemo(()=>({customers:users.filter(u=>u.role==='CUSTOMER').length,providers:users.filter(u=>u.role==='PROVIDER').length,admins:users.filter(u=>u.role==='ADMIN').length,suspended:users.filter(u=>String(u.account_status||'').toUpperCase()==='SUSPENDED').length}),[users]);
 const fact={display:'grid',gap:3,padding:'10px 0',borderBottom:'1px solid var(--border)'} as const;
 const label={fontSize:11,fontWeight:800,textTransform:'uppercase' as const,letterSpacing:'.05em',opacity:.58};
 const val={fontSize:14,fontWeight:650,overflowWrap:'anywhere' as const};
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Users</p></div><button className="secondary" onClick={()=>void load()}>Refresh</button></header><AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">IDENTITY & ACCESS</p><h2>User Accounts</h2><p className="muted">Search, review and manage user access. Suspended users cannot submit new requests; suspended providers cannot receive new requests.</p></div><span className="pill">{users.length} users</span></div>
   <div className="adminStats"><div className="statCard"><span>Customers</span><strong>{counts.customers}</strong></div><div className="statCard"><span>Providers</span><strong>{counts.providers}</strong></div><div className="statCard"><span>Admins</span><strong>{counts.admins}</strong></div><div className="statCard"><span>Suspended</span><strong>{counts.suspended}</strong></div></div>
   {message?<p className="formMessage" role="status">{message}</p>:null}
   <div className="formGrid"><label className="full">Search users<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, email, phone, role, status or user ID"/></label></div>
   <div className="filterRow">{(['ALL','CUSTOMER','PROVIDER','ADMIN'] as const).map(x=><button key={x} className={roleFilter===x?'filterChip active':'filterChip'} onClick={()=>setRoleFilter(x)}>{x==='ALL'?'All':x[0]+x.slice(1).toLowerCase()}</button>)}</div>
  </section>

  <section className="panel" style={{display:'grid',gap:14}}>{visible.map(u=>{
   const open=!!expanded[u.user_id];const lastActive=u.last_seen_at||u.last_sign_in_at;const status=String(u.account_status||u.status||'Active').toUpperCase();const suspended=status==='SUSPENDED'||u.provider_is_suspended===true;
   return <article key={u.user_id} style={{border:suspended?'2px solid #c2410c':'1px solid var(--border)',borderRadius:20,padding:18,background:'var(--surface)',display:'grid',gap:14}}>
    <div style={{display:'flex',gap:13,alignItems:'center'}}>{avatar(u)}<div style={{minWidth:0,flex:1}}><div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}><h3 style={{margin:0,fontSize:20}}>{u.full_name||'Unnamed user'}</h3>{u.user_id===currentUserId?<span className="selfTag">You</span>:null}</div><p className="muted" style={{margin:'3px 0 7px',overflowWrap:'anywhere'}}>{u.email||'No email address'}</p><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><span className="pill">{u.role}</span><span className={suspended?'profileBadge warning':'profileBadge verified'}>{suspended?'Suspended':'Active'}</span>{u.role==='PROVIDER'?<span className={u.provider_approved?'profileBadge verified':'profileBadge warning'}>{u.provider_approved?'Approved':'Pending'}</span>:null}</div></div></div>

    {suspended?<div className="formMessage" style={{margin:0}}>{u.role==='PROVIDER'?'Suspended provider — excluded from provider ranking, dispatch offers and new job assignment.':'Suspended user — new service requests are blocked.'}</div>:null}

    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',columnGap:18}}>
     <div style={fact}><span style={label}>Phone</span><span style={val}>{u.phone_number||'Not available'}</span></div>
     <div style={fact}><span style={label}>Phone status</span><span style={val}>{u.phone_number?(u.is_phone_verified?'Verified':'Unverified'):'Not available'}</span></div>
     <div style={fact}><span style={label}>Joined</span><span style={val}>{date(u.created_at)}</span></div>
     <div style={fact}><span style={label}>Last active</span><span style={val}>{date(lastActive)}</span></div>
    </div>

    {(u.request_count!=null||u.completed_request_count!=null||u.average_rating!=null)&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
     {u.request_count!=null?<div className="statCard" style={{padding:10}}><span>Requests</span><strong>{u.request_count}</strong></div>:null}
     {u.completed_request_count!=null?<div className="statCard" style={{padding:10}}><span>Completed</span><strong>{u.completed_request_count}</strong></div>:null}
     {u.average_rating!=null?<div className="statCard" style={{padding:10}}><span>Rating</span><strong>{u.average_rating.toFixed(1)}</strong></div>:null}
    </div>}

    <button className="secondary compactButton" onClick={()=>setExpanded(x=>({...x,[u.user_id]:!open}))}>{open?'Hide details':'View full details'}</button>

    {open?<div style={{display:'grid',gap:12,paddingTop:4}}>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0 18px'}}>
      <div style={fact}><span style={label}>User ID</span><span style={val}>{u.user_id}</span></div>
      <div style={fact}><span style={label}>Account status</span><span style={val}>{suspended?'Suspended':'Active'}</span></div>
      <div style={fact}><span style={label}>Email verification</span><span style={val}>{u.email_confirmed_at?'Verified':'Not available'}</span></div>
      <div style={fact}><span style={label}>Last updated</span><span style={val}>{date(u.updated_at)}</span></div>
      <div style={fact}><span style={label}>Account address</span><span style={val}>{coreAddress(u)||'Not available'}</span></div>
      <div style={fact}><span style={label}>Default service address</span><span style={val}>{defaultAddress(u)||'Not available'}</span></div>
      {u.suspension_reason?<div style={fact}><span style={label}>Suspension reason</span><span style={val}>{u.suspension_reason}</span></div>:null}
      {u.provider_suspended_at?<div style={fact}><span style={label}>Suspended at</span><span style={val}>{date(u.provider_suspended_at)}</span></div>:null}
      {u.business_name?<div style={fact}><span style={label}>Business name</span><span style={val}>{u.business_name}</span></div>:null}
      {u.service_category?<div style={fact}><span style={label}>Service category</span><span style={val}>{u.service_category}</span></div>:null}
      {u.subscription_plan?<div style={fact}><span style={label}>Subscription</span><span style={val}>{u.subscription_plan}</span></div>:null}
      {u.open_request_count!=null?<div style={fact}><span style={label}>Open requests</span><span style={val}>{u.open_request_count}</span></div>:null}
      {u.cancelled_request_count!=null?<div style={fact}><span style={label}>Cancelled requests</span><span style={val}>{u.cancelled_request_count}</span></div>:null}
      {u.completed_job_count!=null?<div style={fact}><span style={label}>Completed jobs</span><span style={val}>{u.completed_job_count}</span></div>:null}
      {u.profile_completeness!=null?<div style={fact}><span style={label}>Profile completeness</span><span style={val}>{u.profile_completeness}%</span></div>:null}
     </div>
    </div>:null}

    <div className="tableActions" style={{display:'flex',gap:8,flexWrap:'wrap',paddingTop:2}}>{u.role==='PROVIDER'?<a className="secondary compactButton" href={`/admin/providers/${u.user_id}`}>Open Provider Record</a>:null}{u.role!=='ADMIN'&&u.role!=='CUSTOMER'?<button className="secondary compactButton" disabled={busyUser===u.user_id} onClick={()=>changeRole(u,'CUSTOMER')}>Change to Customer</button>:null}{u.role!=='ADMIN'&&u.role!=='PROVIDER'?<button className="primary compactButton" disabled={busyUser===u.user_id} onClick={()=>changeRole(u,'PROVIDER')}>Grant Provider Access</button>:null}{u.role!=='ADMIN'?(suspended?<button className="primary compactButton" disabled={busyUser===u.user_id} onClick={()=>void setSuspended(u,false)}>Reactivate</button>:<button className="secondary compactButton" disabled={busyUser===u.user_id} onClick={()=>void setSuspended(u,true)}>Suspend</button>):<span className="muted">Protected admin account</span>}</div>
   </article>;
  })}{!visible.length?<div className="emptyQueue">No users match this view.</div>:null}</section>
 </main>;
}
