'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminNav from './AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ESCALATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-escalations';
type Counts={total:number;pending:number;responded:number;accepted:number;inspectionScheduled:number;inProgress:number;completed:number;cancelled:number};
type Profile={role:string;full_name?:string|null};
type RequestRow={status:string};
const emptyCounts:Counts={total:0,pending:0,responded:0,accepted:0,inspectionScheduled:0,inProgress:0,completed:0,cancelled:0};

export default function AdminPage(){
 const[profile,setProfile]=useState<Profile|null>(null);
 const[counts,setCounts]=useState<Counts>(emptyCounts);
 const[userCount,setUserCount]=useState(0);
 const[providerCount,setProviderCount]=useState(0);
 const[pendingProviders,setPendingProviders]=useState(0);
 const[activeEscalations,setActiveEscalations]=useState(0);
 const[criticalEscalations,setCriticalEscalations]=useState(0);
 const[message,setMessage]=useState('Checking administrator account…');
 const[loading,setLoading]=useState(false);

 useEffect(()=>{void initialise();},[]);
 async function jwt(){const{data}=await supabase.auth.getSession();return data.session?.access_token||'';}
 async function call(url:string,body:Record<string,unknown>){const t=await jwt();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function initialise(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}const{data:p}=await supabase.from('auth_profiles').select('role,full_name').eq('user_id',data.session.user.id).maybeSingle();setProfile(p as Profile|null);if(p?.role!=='ADMIN'){setMessage('This account does not have Administrator access.');return;}await loadDashboard();}
 async function loadDashboard(){setLoading(true);try{const[payload,escalations]=await Promise.all([call(ADMIN_URL,{action:'dashboard'}),call(ESCALATION_URL,{action:'list',status:'ACTIVE'})]);const requests=(payload.requests||[]) as RequestRow[];const next={...emptyCounts,total:requests.length};for(const r of requests){if(r.status==='PENDING')next.pending++;else if(r.status==='RESPONDED')next.responded++;else if(r.status==='ACCEPTED')next.accepted++;else if(r.status==='INSPECTION_SCHEDULED')next.inspectionScheduled++;else if(r.status==='IN_PROGRESS')next.inProgress++;else if(r.status==='COMPLETED')next.completed++;else if(r.status==='CANCELLED')next.cancelled++;}setCounts(next);const users=payload.users||[];const providers=payload.providers||[];setUserCount(users.length);setProviderCount(providers.length);setPendingProviders(providers.filter((p:{provider_approved:boolean})=>!p.provider_approved).length);setActiveEscalations((escalations.escalations||[]).length);setCriticalEscalations(Number(escalations.counts?.critical||0)+Number(escalations.counts?.high||0));setMessage('Admin dashboard refreshed.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load dashboard.');}finally{setLoading(false);}}
 async function signOut(){await supabase.auth.signOut();window.location.href='/login';}

 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Admin Control Center</p></div><div className="actions"><a className="secondary" href="/provider">Provider</a><a className="secondary" href="/">Customer</a><button className="secondary" onClick={signOut}>Sign Out</button></div></header>
  <AdminNav />
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADMIN</p><h2>Operations Dashboard</h2></div><span className="pill">{profile?.role==='ADMIN'?(profile.full_name||'Administrator'):'Restricted'}</span></div><div className="actions"><button className="primary" onClick={loadDashboard} disabled={profile?.role!=='ADMIN'||loading}>{loading?'Loading…':'Refresh Dashboard'}</button></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>
  <section className="adminStats"><article className="statCard"><span>Users</span><strong>{userCount}</strong></article><article className="statCard"><span>Providers</span><strong>{providerCount}</strong></article><article className="statCard"><span>Pending Providers</span><strong>{pendingProviders}</strong></article><article className="statCard"><span>Active Escalations</span><strong>{activeEscalations}</strong></article><article className="statCard"><span>High / Critical</span><strong>{criticalEscalations}</strong></article><article className="statCard"><span>Service Requests</span><strong>{counts.total}</strong></article><article className="statCard"><span>Pending</span><strong>{counts.pending}</strong></article><article className="statCard"><span>Responded</span><strong>{counts.responded}</strong></article><article className="statCard"><span>Accepted</span><strong>{counts.accepted}</strong></article><article className="statCard"><span>Inspection Scheduled</span><strong>{counts.inspectionScheduled}</strong></article><article className="statCard"><span>In Progress</span><strong>{counts.inProgress}</strong></article><article className="statCard"><span>Completed</span><strong>{counts.completed}</strong></article><article className="statCard"><span>Cancelled</span><strong>{counts.cancelled}</strong></article></section>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">CONTROL PANELS</p><h2>Administration</h2></div></div><div className="jobList">
   <article className="jobCard"><div className="jobTop"><div><strong>SLA Escalations</strong><div className="muted">Review provider-search failures, overdue responses and delayed jobs.</div></div><a className="primary" href="/admin/escalations">Open Escalations</a></div></article>
   <article className="jobCard"><div className="jobTop"><div><strong>User Management</strong><div className="muted">Manage customer/provider roles and account access.</div></div><a className="primary" href="/admin/users">Open Users</a></div></article>
   <article className="jobCard"><div className="jobTop"><div><strong>Provider Management</strong><div className="muted">Approve, disable and review provider accounts.</div></div><a className="primary" href="/admin/providers">Open Providers</a></div></article>
   <article className="jobCard"><div className="jobTop"><div><strong>Request Oversight</strong><div className="muted">Monitor all service requests and their current state.</div></div><a className="primary" href="/admin/requests">Open Requests</a></div></article>
   <article className="jobCard"><div className="jobTop"><div><strong>Audit Logs</strong><div className="muted">Review recorded administrator and security events.</div></div><a className="primary" href="/admin/audit-logs">Open Audit Logs</a></div></article>
  </div></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Authenticated Admin RBAC</span></footer>
 </main>;
}
