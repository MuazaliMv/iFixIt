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

 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin Control Center</p></div><div className="actions"><a className="secondary" href="/profile">Profile</a></div></header>
  <AdminNav />
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADMIN OVERVIEW</p><h2>{profile?.full_name?`Welcome, ${profile.full_name}`:'Operations Dashboard'}</h2><p className="muted">Focus on exceptions first, then manage requests and marketplace operations.</p></div><button className="secondary" onClick={loadDashboard} disabled={profile?.role!=='ADMIN'||loading}>{loading?'Refreshing…':'Refresh'}</button></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ACTION REQUIRED</p><h2>Priority queue</h2></div></div><div className="adminStats"><a className="statCard" href="/admin/escalations"><span>High / Critical</span><strong>{criticalEscalations}</strong></a><a className="statCard" href="/admin/escalations"><span>Active Escalations</span><strong>{activeEscalations}</strong></a><a className="statCard" href="/admin/providers"><span>Pending Providers</span><strong>{pendingProviders}</strong></a><a className="statCard" href="/admin/requests"><span>Pending Requests</span><strong>{counts.pending}</strong></a></div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">MARKETPLACE</p><h2>At a glance</h2></div></div><div className="adminStats"><a className="statCard" href="/admin/users"><span>Users</span><strong>{userCount}</strong></a><a className="statCard" href="/admin/providers"><span>Providers</span><strong>{providerCount}</strong></a><a className="statCard" href="/admin/requests"><span>Requests</span><strong>{counts.total}</strong></a><a className="statCard" href="/admin/requests"><span>In Progress</span><strong>{counts.inProgress}</strong></a><a className="statCard" href="/admin/requests"><span>Completed</span><strong>{counts.completed}</strong></a><a className="statCard" href="/admin/requests"><span>Cancelled</span><strong>{counts.cancelled}</strong></a></div></section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Common admin tasks</h2></div></div><div className="profileQuickGrid"><a className="profileQuickCard" href="/admin/requests"><span className="profileQuickIcon">▣</span><span><strong>Request Management</strong><small>Assignments, lifecycle and exceptions</small></span></a><a className="profileQuickCard" href="/admin/providers"><span className="profileQuickIcon">♙</span><span><strong>Provider Management</strong><small>Approve and manage providers</small></span></a><a className="profileQuickCard" href="/admin/users"><span className="profileQuickIcon">◎</span><span><strong>User Management</strong><small>Accounts and access</small></span></a><a className="profileQuickCard" href="/admin/reports"><span className="profileQuickIcon">▤</span><span><strong>Reports</strong><small>Marketplace performance</small></span></a></div></section>
  <footer className="footer"><span>FixIt Maldives</span><span>Admin oversight</span></footer>
 </main>;
}