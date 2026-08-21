'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

type AuditRow={id:string;event_type:string;severity:string;entity_type?:string|null;entity_id?:string|null;created_at:string;metadata?:Record<string,unknown>|null};

export default function AdminAuditLogsPage(){
 const[events,setEvents]=useState<AuditRow[]>([]);const[message,setMessage]=useState('Loading audit logs…');
 useEffect(()=>{void load();},[]);
 async function load(){try{const{data:sessionData}=await supabase.auth.getSession();if(!sessionData.session){window.location.href='/login';return;}const{data:profile}=await supabase.from('auth_profiles').select('role').eq('user_id',sessionData.session.user.id).maybeSingle();if(profile?.role!=='ADMIN'){setMessage('Administrator role required.');return;}const{data,error}=await supabase.from('security_events').select('id,event_type,severity,entity_type,entity_id,created_at,metadata').order('created_at',{ascending:false}).limit(200);if(error)throw error;setEvents((data||[]) as AuditRow[]);setMessage('Audit log loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load audit logs.');}}
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Audit Logs</p></div><button className="secondary" onClick={load}>Refresh</button></header><AdminNav />
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">AUDIT & SECURITY</p><h2>Admin Activity Log</h2></div><span className="pill">{events.length} events</span></div><p className="formMessage" role="status">{message}</p><div className="jobList">{events.map(e=><article className="jobCard" key={e.id}><div className="jobTop"><div><strong>{e.event_type}</strong><div className="muted">{new Date(e.created_at).toLocaleString()}</div></div><span className="pill">{e.severity}</span></div><div className="jobMeta">{e.entity_type?<span><b>Entity:</b> {e.entity_type}</span>:null}{e.entity_id?<span><b>ID:</b> {e.entity_id}</span>:null}</div>{e.metadata?<p className="jobDescription">{JSON.stringify(e.metadata)}</p>:null}</article>)}{!events.length?<div className="emptyQueue">No audit events are visible to this administrator yet.</div>:null}</div></section>
 </main>;
}
