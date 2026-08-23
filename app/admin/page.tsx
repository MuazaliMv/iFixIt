'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminNav from './AdminNav';

const ADMIN_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';
const ESCALATION_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-escalations';
type Counts={total:number;pending:number;responded:number;accepted:number;inspectionScheduled:number;inProgress:number;completed:number;cancelled:number};
type Profile={role:string;full_name?:string|null};
type RequestRow={status:string;created_at?:string;updated_at?:string};
type ProviderRow={provider_approved:boolean;onboarding?:{submitted_at?:string|null}|null};
type EscalationRow={severity?:string;first_detected_at?:string|null};
type RangePreset='1'|'7'|'30'|'90'|'custom';
type RangeCounts={total:number;completed:number;inProgress:number;cancelled:number;otherActive:number};
type AttentionCounts={critical:number;approvals:number;pendingRequests:number;activeEscalations:number};
const emptyCounts:Counts={total:0,pending:0,responded:0,accepted:0,inspectionScheduled:0,inProgress:0,completed:0,cancelled:0};
const emptyRange:RangeCounts={total:0,completed:0,inProgress:0,cancelled:0,otherActive:0};
const emptyAttention:AttentionCounts={critical:0,approvals:0,pendingRequests:0,activeEscalations:0};

function maleDateKey(value:string|Date){const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('en-CA',{timeZone:'Indian/Maldives',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function dateFromKey(key:string,end=false){if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return new Date(NaN);return new Date(`${key}T${end?'23:59:59.999':'00:00:00.000'}+05:00`);}
function shiftKey(key:string,days:number){const d=dateFromKey(key);if(Number.isNaN(d.getTime()))return key;d.setUTCDate(d.getUTCDate()+days);return maleDateKey(d);}
function inRange(value:string|undefined|null,fromKey:string,toKey:string){if(!value)return false;const key=maleDateKey(value);return Boolean(key&&key>=fromKey&&key<=toKey);}
function countRange(rows:RequestRow[],fromKey:string,toKey:string){const out={...emptyRange};for(const r of rows){if(!inRange(r.created_at,fromKey,toKey))continue;out.total++;const s=String(r.status||'').toUpperCase();if(s==='COMPLETED')out.completed++;else if(s==='IN_PROGRESS'||s==='PROCESSING')out.inProgress++;else if(s==='CANCELLED')out.cancelled++;else out.otherActive++;}return out;}
function countAttention(requests:RequestRow[],providers:ProviderRow[],escalations:EscalationRow[],fromKey:string,toKey:string){const out={...emptyAttention};for(const r of requests){if(!inRange(r.created_at,fromKey,toKey))continue;const s=String(r.status||'').toUpperCase();if(s==='PENDING'||s==='NEW')out.pendingRequests++;}for(const p of providers){if(!p.provider_approved&&inRange(p.onboarding?.submitted_at,fromKey,toKey))out.approvals++;}for(const e of escalations){if(!inRange(e.first_detected_at,fromKey,toKey))continue;out.activeEscalations++;const sev=String(e.severity||'').toUpperCase();if(sev==='HIGH'||sev==='CRITICAL')out.critical++;}return out;}
function rangeChange(current:number,previous:number,label:string){if(previous===0){if(current===0)return{label:`0% ${label}`,tone:'flat'};return{label:`+${current} ${label}`,tone:'up'};}const pct=Math.round((current-previous)/previous*100);return{label:`${pct>0?'+':''}${pct}% vs previous period`,tone:pct>0?'up':pct<0?'down':'flat'};}
function formatRangeLabel(from:string,to:string){if(from===to)return new Date(`${from}T00:00:00+05:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});const a=new Date(`${from}T00:00:00+05:00`),b=new Date(`${to}T00:00:00+05:00`);return `${a.toLocaleDateString(undefined,{day:'numeric',month:'short'})} – ${b.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`;}

const dashboardStyles=`
.adminMarketPanel{overflow:hidden}.adminMarketHead,.adminAttentionHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.adminMarketHead h2,.adminAttentionHead h2{margin:2px 0 0}.adminMarketControls,.adminAttentionControls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.adminMarketPeriod{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#475569;font-weight:800;font-size:13px}.adminRangeSelect{min-height:40px;border:1px solid #dbe2ea;border-radius:12px;background:#fff;color:#334155;padding:0 34px 0 12px;font:inherit;font-size:13px;font-weight:800}.adminCustomRange{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin:0 0 18px;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.adminCustomRange label{display:grid;gap:5px;color:#64748b;font-size:11px;font-weight:800}.adminCustomRange input{min-width:0;width:100%;min-height:42px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 10px;font-size:16px}.adminRangeApply{min-height:42px;border:0;border-radius:10px;padding:0 16px;background:#315be8;color:#fff;font-weight:900;cursor:pointer}.adminRangeSummary{margin:-4px 0 16px;color:#64748b;font-size:12px;font-weight:750}.adminMarketHero{display:flex;align-items:flex-end;gap:18px;margin:4px 0 24px}.adminMarketTotal{font-size:clamp(64px,16vw,96px);line-height:.86;font-weight:950;letter-spacing:-5px;color:#315be8}.adminMarketHeroCopy{padding-bottom:5px}.adminMarketHeroCopy strong{display:block;font-size:22px;color:#0f172a}.adminMarketHeroCopy span{display:block;margin-top:5px;color:#64748b;font-size:14px}.adminDailyTrend{display:inline-flex!important;align-items:center;gap:5px;margin-top:7px!important;padding:4px 8px;border-radius:999px;font-size:11px!important;font-weight:900!important;width:max-content}.adminDailyTrend.up{background:#ecfdf5;color:#15803d}.adminDailyTrend.down{background:#fef2f2;color:#dc2626}.adminDailyTrend.flat{background:#f1f5f9;color:#64748b}.adminMarketBar{height:15px;display:flex;overflow:hidden;border-radius:999px;background:#e2e8f0;margin-bottom:20px}.adminMarketBar i{display:block;height:100%;min-width:0}.adminMarketBar .completed{background:#22c55e}.adminMarketBar .progress{background:#fbbf24}.adminMarketBar .cancelled{background:#ef4444}.adminMarketBar .other{background:#315be8}.adminMarketBreakdown{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid #e2e8f0;padding-bottom:20px}.adminMarketMetric{padding:0 13px;border-right:1px solid #e2e8f0;min-width:0}.adminMarketMetric:first-child{padding-left:0}.adminMarketMetric:last-child{padding-right:0;border-right:0}.adminMarketMetricLabel{display:flex;align-items:center;gap:7px;color:#334155;font-size:13px;font-weight:800;white-space:nowrap}.adminMarketDot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}.adminMarketMetric strong{display:block;font-size:34px;line-height:1.1;margin-top:10px}.adminMarketMetric small{display:block;margin-top:4px;color:#64748b;font-weight:700}.adminMarketMetric.completed strong{color:#16a34a}.adminMarketMetric.progress strong{color:#d99a00}.adminMarketMetric.cancelled strong{color:#dc2626}.adminMarketMetric.other strong{color:#315be8}.adminMarketDot.completed{background:#22c55e}.adminMarketDot.progress{background:#fbbf24}.adminMarketDot.cancelled{background:#ef4444}.adminMarketDot.other{background:#315be8}.adminMarketLink{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:17px;text-decoration:none;color:#315be8;font-weight:850}.adminMarketLink span:last-child{font-size:24px}.adminPlatformTitle{margin:24px 0 12px;font-size:15px;font-weight:900;color:#0f172a}.adminPlatformGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.adminPlatformCard{display:flex;align-items:center;gap:13px;min-height:92px;padding:16px;border:1px solid #e2e8f0;border-radius:18px;text-decoration:none;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.05);color:#0f172a}.adminPlatformIcon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#eef3ff;color:#315be8;font-size:22px;font-weight:900}.adminPlatformCopy{min-width:0}.adminPlatformCopy span{display:block;color:#475569;font-size:13px;font-weight:800}.adminPlatformCopy strong{display:block;margin-top:3px;color:#315be8;font-size:30px;line-height:1}.adminPlatformArrow{margin-left:auto;color:#64748b;font-size:24px}.adminAttentionStats .statCard{min-height:118px}.adminAttentionStats .statCard strong{font-size:42px}.adminAttentionStats .statCard small{display:block;margin-top:7px;color:#64748b;font-size:11px;font-weight:800}
@media(max-width:640px){.adminMarketPanel{padding:20px!important}.adminMarketHead,.adminAttentionHead{gap:10px}.adminMarketControls,.adminAttentionControls{max-width:150px}.adminMarketPeriod{padding:8px 10px}.adminRangeSelect{width:100%;min-height:38px;padding-left:10px}.adminCustomRange{grid-template-columns:1fr 1fr}.adminRangeApply{grid-column:1/-1}.adminMarketHero{gap:12px}.adminMarketTotal{font-size:72px;letter-spacing:-4px}.adminMarketHeroCopy strong{font-size:19px}.adminMarketBreakdown{grid-template-columns:repeat(2,minmax(0,1fr));gap:0}.adminMarketMetric{padding:13px;border-right:0;border-bottom:1px solid #e2e8f0}.adminMarketMetric:nth-child(odd){border-right:1px solid #e2e8f0}.adminMarketMetric:nth-last-child(-n+2){border-bottom:0}.adminMarketMetric:first-child{padding-left:13px}.adminMarketMetric:last-child{padding-right:13px}.adminMarketMetricLabel{white-space:normal}.adminMarketMetric strong{font-size:30px}.adminPlatformCard{min-height:84px;padding:13px}.adminPlatformIcon{width:42px;height:42px}.adminAttentionStats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.adminAttentionStats .statCard{min-height:105px;padding:16px!important}.adminAttentionStats .statCard span{font-size:13px!important}.adminAttentionStats .statCard strong{font-size:36px!important}}
`;

export default function AdminPage(){
 const[profile,setProfile]=useState<Profile|null>(null);
 const[counts,setCounts]=useState<Counts>(emptyCounts);
 const[requests,setRequests]=useState<RequestRow[]>([]);
 const[providers,setProviders]=useState<ProviderRow[]>([]);
 const[escalations,setEscalations]=useState<EscalationRow[]>([]);
 const[userCount,setUserCount]=useState(0);
 const[providerCount,setProviderCount]=useState(0);
 const[message,setMessage]=useState('Checking administrator account…');
 const[loading,setLoading]=useState(false);
 const[preset,setPreset]=useState<RangePreset>('7');
 const[attentionPreset,setAttentionPreset]=useState<RangePreset>('7');
 const todayKey=maleDateKey(new Date());
 const[customFrom,setCustomFrom]=useState(shiftKey(todayKey,-6));
 const[customTo,setCustomTo]=useState(todayKey);
 const[rangeFrom,setRangeFrom]=useState(shiftKey(todayKey,-6));
 const[rangeTo,setRangeTo]=useState(todayKey);
 const[attentionCustomFrom,setAttentionCustomFrom]=useState(shiftKey(todayKey,-6));
 const[attentionCustomTo,setAttentionCustomTo]=useState(todayKey);
 const[attentionFrom,setAttentionFrom]=useState(shiftKey(todayKey,-6));
 const[attentionTo,setAttentionTo]=useState(todayKey);

 useEffect(()=>{void initialise();},[]);
 async function jwt(){const{data}=await supabase.auth.getSession();return data.session?.access_token||'';}
 async function call(url:string,body:Record<string,unknown>){const t=await jwt();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload?.error||'Admin request failed');return payload;}
 async function initialise(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}const{data:p}=await supabase.from('auth_profiles').select('role,full_name').eq('user_id',data.session.user.id).maybeSingle();setProfile(p as Profile|null);if(p?.role!=='ADMIN'){setMessage('This account does not have Administrator access.');return;}await loadDashboard();}
 async function loadDashboard(){setLoading(true);try{const[payload,escalationPayload]=await Promise.all([call(ADMIN_URL,{action:'dashboard'}),call(ESCALATION_URL,{action:'list',status:'ACTIVE'})]);const rows=(payload.requests||[]) as RequestRow[];setRequests(rows);const next={...emptyCounts,total:rows.length};for(const r of rows){if(r.status==='PENDING'||r.status==='NEW')next.pending++;else if(r.status==='RESPONDED')next.responded++;else if(r.status==='ACCEPTED')next.accepted++;else if(r.status==='INSPECTION_SCHEDULED')next.inspectionScheduled++;else if(r.status==='IN_PROGRESS'||r.status==='PROCESSING')next.inProgress++;else if(r.status==='COMPLETED')next.completed++;else if(r.status==='CANCELLED')next.cancelled++;}setCounts(next);const users=payload.users||[];const providerRows=(payload.providers||[]) as ProviderRow[];setProviders(providerRows);setEscalations((escalationPayload.escalations||[]) as EscalationRow[]);setUserCount(users.length);setProviderCount(providerRows.length);setMessage('Admin dashboard refreshed.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load dashboard.');}finally{setLoading(false);}}
 function choosePreset(value:RangePreset){setPreset(value);if(value==='custom')return;const days=Number(value);const to=maleDateKey(new Date());const from=shiftKey(to,-(days-1));setRangeFrom(from);setRangeTo(to);setCustomFrom(from);setCustomTo(to);}
 function applyCustomRange(){if(!customFrom||!customTo){setMessage('Choose both a start and end date.');return;}if(customFrom>customTo){setMessage('Start date must be before the end date.');return;}setRangeFrom(customFrom);setRangeTo(customTo);setMessage(`Showing marketplace data for ${formatRangeLabel(customFrom,customTo)}.`);}
 function chooseAttentionPreset(value:RangePreset){setAttentionPreset(value);if(value==='custom')return;const days=Number(value);const to=maleDateKey(new Date());const from=shiftKey(to,-(days-1));setAttentionFrom(from);setAttentionTo(to);setAttentionCustomFrom(from);setAttentionCustomTo(to);}
 function applyAttentionCustomRange(){if(!attentionCustomFrom||!attentionCustomTo){setMessage('Choose both a start and end date for Admin attention.');return;}if(attentionCustomFrom>attentionCustomTo){setMessage('Admin attention start date must be before the end date.');return;}setAttentionFrom(attentionCustomFrom);setAttentionTo(attentionCustomTo);setMessage(`Showing Admin attention data for ${formatRangeLabel(attentionCustomFrom,attentionCustomTo)}.`);}

 const rangeCounts=useMemo(()=>countRange(requests,rangeFrom,rangeTo),[requests,rangeFrom,rangeTo]);
 const rangeDays=Math.max(1,Math.round((dateFromKey(rangeTo,true).getTime()-dateFromKey(rangeFrom).getTime())/86400000));
 const previousTo=shiftKey(rangeFrom,-1),previousFrom=shiftKey(previousTo,-(rangeDays-1));
 const previousCounts=useMemo(()=>countRange(requests,previousFrom,previousTo),[requests,previousFrom,previousTo]);
 const percent=(value:number)=>rangeCounts.total?Math.round(value/rangeCounts.total*100):0;
 const width=(value:number)=>rangeCounts.total?`${Math.max(0,value/rangeCounts.total*100)}%`:'0%';
 const periodName=rangeDays===1?'today':'in period';
 const totalTrend=rangeChange(rangeCounts.total,previousCounts.total,periodName),completedTrend=rangeChange(rangeCounts.completed,previousCounts.completed,periodName),progressTrend=rangeChange(rangeCounts.inProgress,previousCounts.inProgress,periodName),cancelledTrend=rangeChange(rangeCounts.cancelled,previousCounts.cancelled,periodName),otherTrend=rangeChange(rangeCounts.otherActive,previousCounts.otherActive,periodName);
 const attentionCounts=useMemo(()=>countAttention(requests,providers,escalations,attentionFrom,attentionTo),[requests,providers,escalations,attentionFrom,attentionTo]);
 const attentionDays=Math.max(1,Math.round((dateFromKey(attentionTo,true).getTime()-dateFromKey(attentionFrom).getTime())/86400000));
 const attentionPrevTo=shiftKey(attentionFrom,-1),attentionPrevFrom=shiftKey(attentionPrevTo,-(attentionDays-1));
 const previousAttention=useMemo(()=>countAttention(requests,providers,escalations,attentionPrevFrom,attentionPrevTo),[requests,providers,escalations,attentionPrevFrom,attentionPrevTo]);
 const attentionTotal=attentionCounts.critical+attentionCounts.approvals+attentionCounts.pendingRequests;
 const criticalAttentionTrend=rangeChange(attentionCounts.critical,previousAttention.critical,attentionDays===1?'today':'in period');
 const approvalTrend=rangeChange(attentionCounts.approvals,previousAttention.approvals,attentionDays===1?'today':'in period');
 const pendingTrend=rangeChange(attentionCounts.pendingRequests,previousAttention.pendingRequests,attentionDays===1?'today':'in period');
 const escalationTrend=rangeChange(attentionCounts.activeEscalations,previousAttention.activeEscalations,attentionDays===1?'today':'in period');

 return <main className="shell">
  <style>{dashboardStyles}</style>
  <AdminNav />

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADMIN DASHBOARD</p><h2>{profile?.full_name?`Welcome, ${profile.full_name}`:'Operations Dashboard'}</h2><p className="muted">Review items that need intervention first, then monitor daily marketplace operations.</p></div><button className="secondary" onClick={loadDashboard} disabled={profile?.role!=='ADMIN'||loading}>{loading?'Refreshing…':'Refresh'}</button></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>

  <section className="panel">
   <div className="adminAttentionHead"><div><p className="eyebrow">ACTION REQUIRED</p><h2>Admin attention</h2><p className="muted">{attentionTotal?`${attentionTotal} item${attentionTotal===1?'':'s'} in the selected period need review.`:'No admin attention items were created in the selected period.'}</p></div><div className="adminAttentionControls"><select className="adminRangeSelect" aria-label="Admin attention date range" value={attentionPreset} onChange={e=>chooseAttentionPreset(e.target.value as RangePreset)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom range</option></select><span className="adminMarketPeriod">▣ Live</span></div></div>
   {attentionPreset==='custom'?<div className="adminCustomRange"><label>From<input type="date" value={attentionCustomFrom} max={todayKey} onChange={e=>setAttentionCustomFrom(e.target.value)}/></label><label>To<input type="date" value={attentionCustomTo} max={todayKey} onChange={e=>setAttentionCustomTo(e.target.value)}/></label><button className="adminRangeApply" type="button" onClick={applyAttentionCustomRange}>Apply range</button></div>:null}
   <div className="adminRangeSummary">Showing attention items created {formatRangeLabel(attentionFrom,attentionTo)} · compared with {formatRangeLabel(attentionPrevFrom,attentionPrevTo)}</div>
   <div className="adminStats adminAttentionStats">
    <a className="statCard" href="/admin/escalations"><span>High / Critical Escalations</span><strong>{attentionCounts.critical}</strong><small className={`adminDailyTrend ${criticalAttentionTrend.tone}`}>{criticalAttentionTrend.label}</small></a>
    <a className="statCard" href="/admin/providers"><span>Provider Approvals</span><strong>{attentionCounts.approvals}</strong><small className={`adminDailyTrend ${approvalTrend.tone}`}>{approvalTrend.label}</small></a>
    <a className="statCard" href="/admin/requests"><span>New / Pending Service Requests</span><strong>{attentionCounts.pendingRequests}</strong><small className={`adminDailyTrend ${pendingTrend.tone}`}>{pendingTrend.label}</small></a>
    <a className="statCard" href="/admin/escalations"><span>All Active Escalations</span><strong>{attentionCounts.activeEscalations}</strong><small className={`adminDailyTrend ${escalationTrend.tone}`}>{escalationTrend.label}</small></a>
   </div>
  </section>

  <section className="panel adminMarketPanel">
   <div className="adminMarketHead"><div><p className="eyebrow">OPERATIONS</p><h2>Marketplace Status</h2></div><div className="adminMarketControls"><select className="adminRangeSelect" aria-label="Marketplace date range" value={preset} onChange={e=>choosePreset(e.target.value as RangePreset)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom range</option></select><span className="adminMarketPeriod">▣ Live</span></div></div>
   {preset==='custom'?<div className="adminCustomRange"><label>From<input type="date" value={customFrom} max={todayKey} onChange={e=>setCustomFrom(e.target.value)}/></label><label>To<input type="date" value={customTo} max={todayKey} onChange={e=>setCustomTo(e.target.value)}/></label><button className="adminRangeApply" type="button" onClick={applyCustomRange}>Apply range</button></div>:null}
   <div className="adminRangeSummary">Showing requests created {formatRangeLabel(rangeFrom,rangeTo)} · compared with {formatRangeLabel(previousFrom,previousTo)}</div>
   <div className="adminMarketHero"><div className="adminMarketTotal">{rangeCounts.total}</div><div className="adminMarketHeroCopy"><strong>Total Requests</strong><span>Requests created in selected period</span><span className={`adminDailyTrend ${totalTrend.tone}`}>{totalTrend.label}</span></div></div>
   <div className="adminMarketBar" aria-label="Request status distribution"><i className="completed" style={{width:width(rangeCounts.completed)}}/><i className="progress" style={{width:width(rangeCounts.inProgress)}}/><i className="cancelled" style={{width:width(rangeCounts.cancelled)}}/><i className="other" style={{width:width(rangeCounts.otherActive)}}/></div>
   <div className="adminMarketBreakdown">
    <div className="adminMarketMetric completed"><div className="adminMarketMetricLabel"><i className="adminMarketDot completed"/>Completed</div><strong>{rangeCounts.completed}</strong><small>{percent(rangeCounts.completed)}% of period</small><span className={`adminDailyTrend ${completedTrend.tone}`}>{completedTrend.label}</span></div>
    <div className="adminMarketMetric progress"><div className="adminMarketMetricLabel"><i className="adminMarketDot progress"/>In Progress</div><strong>{rangeCounts.inProgress}</strong><small>{percent(rangeCounts.inProgress)}% of period</small><span className={`adminDailyTrend ${progressTrend.tone}`}>{progressTrend.label}</span></div>
    <div className="adminMarketMetric cancelled"><div className="adminMarketMetricLabel"><i className="adminMarketDot cancelled"/>Cancelled</div><strong>{rangeCounts.cancelled}</strong><small>{percent(rangeCounts.cancelled)}% of period</small><span className={`adminDailyTrend ${cancelledTrend.tone}`}>{cancelledTrend.label}</span></div>
    <div className="adminMarketMetric other"><div className="adminMarketMetricLabel"><i className="adminMarketDot other"/>Other Active</div><strong>{rangeCounts.otherActive}</strong><small>{percent(rangeCounts.otherActive)}% of period</small><span className={`adminDailyTrend ${otherTrend.tone}`}>{otherTrend.label}</span></div>
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
