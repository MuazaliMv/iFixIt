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

const dashboardStyles=`
.adminMarketPanel{overflow:hidden}.adminMarketHead{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.adminMarketHead h2{margin:2px 0 0}.adminMarketPeriod{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#475569;font-weight:800;font-size:13px}.adminMarketHero{display:flex;align-items:flex-end;gap:18px;margin:4px 0 24px}.adminMarketTotal{font-size:clamp(64px,16vw,96px);line-height:.86;font-weight:950;letter-spacing:-5px;color:#315be8}.adminMarketHeroCopy{padding-bottom:5px}.adminMarketHeroCopy strong{display:block;font-size:22px;color:#0f172a}.adminMarketHeroCopy span{display:block;margin-top:5px;color:#64748b;font-size:14px}.adminMarketBar{height:15px;display:flex;overflow:hidden;border-radius:999px;background:#e2e8f0;margin-bottom:20px}.adminMarketBar i{display:block;height:100%;min-width:0}.adminMarketBar .completed{background:#22c55e}.adminMarketBar .progress{background:#fbbf24}.adminMarketBar .cancelled{background:#ef4444}.adminMarketBar .other{background:#315be8}.adminMarketBreakdown{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid #e2e8f0;padding-bottom:20px}.adminMarketMetric{padding:0 13px;border-right:1px solid #e2e8f0;min-width:0}.adminMarketMetric:first-child{padding-left:0}.adminMarketMetric:last-child{padding-right:0;border-right:0}.adminMarketMetricLabel{display:flex;align-items:center;gap:7px;color:#334155;font-size:13px;font-weight:800;white-space:nowrap}.adminMarketDot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}.adminMarketMetric strong{display:block;font-size:34px;line-height:1.1;margin-top:10px}.adminMarketMetric small{display:block;margin-top:4px;color:#64748b;font-weight:700}.adminMarketMetric.completed strong{color:#16a34a}.adminMarketMetric.progress strong{color:#d99a00}.adminMarketMetric.cancelled strong{color:#dc2626}.adminMarketMetric.other strong{color:#315be8}.adminMarketDot.completed{background:#22c55e}.adminMarketDot.progress{background:#fbbf24}.adminMarketDot.cancelled{background:#ef4444}.adminMarketDot.other{background:#315be8}.adminMarketLink{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:17px;text-decoration:none;color:#315be8;font-weight:850}.adminMarketLink span:last-child{font-size:24px}.adminPlatformTitle{margin:24px 0 12px;font-size:15px;font-weight:900;color:#0f172a}.adminPlatformGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.adminPlatformCard{display:flex;align-items:center;gap:13px;min-height:92px;padding:16px;border:1px solid #e2e8f0;border-radius:18px;text-decoration:none;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.05);color:#0f172a}.adminPlatformIcon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#eef3ff;color:#315be8;font-size:22px;font-weight:900}.adminPlatformCopy{min-width:0}.adminPlatformCopy span{display:block;color:#475569;font-size:13px;font-weight:800}.adminPlatformCopy strong{display:block;margin-top:3px;color:#315be8;font-size:30px;line-height:1}.adminPlatformArrow{margin-left:auto;color:#64748b;font-size:24px}.adminAttentionStats .statCard{min-height:118px}.adminAttentionStats .statCard strong{font-size:42px}
@media(max-width:640px){.adminMarketPanel{padding:20px!important}.adminMarketHead{align-items:flex-start}.adminMarketPeriod{padding:8px 10px}.adminMarketHero{gap:12px}.adminMarketTotal{font-size:72px;letter-spacing:-4px}.adminMarketHeroCopy strong{font-size:19px}.adminMarketBreakdown{grid-template-columns:repeat(2,minmax(0,1fr));gap:0}.adminMarketMetric{padding:13px;border-right:0;border-bottom:1px solid #e2e8f0}.adminMarketMetric:nth-child(odd){border-right:1px solid #e2e8f0}.adminMarketMetric:nth-last-child(-n+2){border-bottom:0}.adminMarketMetric:first-child{padding-left:13px}.adminMarketMetric:last-child{padding-right:13px}.adminMarketMetricLabel{white-space:normal}.adminMarketMetric strong{font-size:30px}.adminPlatformCard{min-height:84px;padding:13px}.adminPlatformIcon{width:42px;height:42px}.adminAttentionStats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.adminAttentionStats .statCard{min-height:105px;padding:16px!important}.adminAttentionStats .statCard span{font-size:13px!important}.adminAttentionStats .statCard strong{font-size:36px!important}}
`;

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
 async function loadDashboard(){setLoading(true);try{const[payload,escalations]=await Promise.all([call(ADMIN_URL,{action:'dashboard'}),call(ESCALATION_URL,{action:'list',status:'ACTIVE'})]);const requests=(payload.requests||[]) as RequestRow[];const next={...emptyCounts,total:requests.length};for(const r of requests){if(r.status==='PENDING'||r.status==='NEW')next.pending++;else if(r.status==='RESPONDED')next.responded++;else if(r.status==='ACCEPTED')next.accepted++;else if(r.status==='INSPECTION_SCHEDULED')next.inspectionScheduled++;else if(r.status==='IN_PROGRESS'||r.status==='PROCESSING')next.inProgress++;else if(r.status==='COMPLETED')next.completed++;else if(r.status==='CANCELLED')next.cancelled++;}setCounts(next);const users=payload.users||[];const providers=payload.providers||[];setUserCount(users.length);setProviderCount(providers.length);setPendingProviders(providers.filter((p:{provider_approved:boolean})=>!p.provider_approved).length);setActiveEscalations((escalations.escalations||[]).length);setCriticalEscalations(Number(escalations.counts?.critical||0)+Number(escalations.counts?.high||0));setMessage('Admin dashboard refreshed.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load dashboard.');}finally{setLoading(false);}}

 const actionTotal=criticalEscalations+pendingProviders+counts.pending;
 const otherActive=Math.max(0,counts.total-counts.completed-counts.inProgress-counts.cancelled);
 const percent=(value:number)=>counts.total?Math.round(value/counts.total*100):0;
 const width=(value:number)=>counts.total?`${Math.max(0,value/counts.total*100)}%`:'0%';

 return <main className="shell">
  <style>{dashboardStyles}</style>
  <AdminNav />

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADMIN DASHBOARD</p><h2>{profile?.full_name?`Welcome, ${profile.full_name}`:'Operations Dashboard'}</h2><p className="muted">Review items that need intervention first, then monitor daily marketplace operations.</p></div><button className="secondary" onClick={loadDashboard} disabled={profile?.role!=='ADMIN'||loading}>{loading?'Refreshing…':'Refresh'}</button></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ACTION REQUIRED</p><h2>Admin attention</h2><p className="muted">{actionTotal?`${actionTotal} item${actionTotal===1?'':'s'} currently need review.`:'No urgent admin actions are currently waiting.'}</p></div></div><div className="adminStats adminAttentionStats">
   <a className="statCard" href="/admin/escalations"><span>High / Critical Escalations</span><strong>{criticalEscalations}</strong></a>
   <a className="statCard" href="/admin/providers"><span>Provider Approvals</span><strong>{pendingProviders}</strong></a>
   <a className="statCard" href="/admin/requests"><span>New / Pending Service Requests</span><strong>{counts.pending}</strong></a>
   <a className="statCard" href="/admin/escalations"><span>All Active Escalations</span><strong>{activeEscalations}</strong></a>
  </div></section>

  <section className="panel adminMarketPanel">
   <div className="adminMarketHead"><div><p className="eyebrow">OPERATIONS</p><h2>Marketplace Status</h2></div><span className="adminMarketPeriod">▣ Live</span></div>
   <div className="adminMarketHero"><div className="adminMarketTotal">{counts.total}</div><div className="adminMarketHeroCopy"><strong>Total Requests</strong><span>All service requests</span></div></div>
   <div className="adminMarketBar" aria-label="Request status distribution"><i className="completed" style={{width:width(counts.completed)}}/><i className="progress" style={{width:width(counts.inProgress)}}/><i className="cancelled" style={{width:width(counts.cancelled)}}/><i className="other" style={{width:width(otherActive)}}/></div>
   <div className="adminMarketBreakdown">
    <div className="adminMarketMetric completed"><div className="adminMarketMetricLabel"><i className="adminMarketDot completed"/>Completed</div><strong>{counts.completed}</strong><small>{percent(counts.completed)}%</small></div>
    <div className="adminMarketMetric progress"><div className="adminMarketMetricLabel"><i className="adminMarketDot progress"/>In Progress</div><strong>{counts.inProgress}</strong><small>{percent(counts.inProgress)}%</small></div>
    <div className="adminMarketMetric cancelled"><div className="adminMarketMetricLabel"><i className="adminMarketDot cancelled"/>Cancelled</div><strong>{counts.cancelled}</strong><small>{percent(counts.cancelled)}%</small></div>
    <div className="adminMarketMetric other"><div className="adminMarketMetricLabel"><i className="adminMarketDot other"/>Other Active</div><strong>{otherActive}</strong><small>{percent(otherActive)}%</small></div>
   </div>
   <a className="adminMarketLink" href="/admin/requests"><span>▥ &nbsp; View all service requests</span><span>›</span></a>
   <div className="adminPlatformTitle">Platform Overview</div>
   <div className="adminPlatformGrid">
    <a className="adminPlatformCard" href="/admin/providers"><span className="adminPlatformIcon">♟</span><span className="adminPlatformCopy"><span>Providers</span><strong>{providerCount}</strong></span><span className="adminPlatformArrow">›</span></a>
    <a className="adminPlatformCard" href="/admin/users"><span className="adminPlatformIcon">●</span><span className="adminPlatformCopy"><span>Users</span><strong>{userCount}</strong></span><span className="adminPlatformArrow">›</span></a>
   </div>
  </section>

  <footer className="footer"><span>FixIt Maldives</span><span>Admin oversight</span></footer>
 </main>;
}
