'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CustomerHeader from '../components/customer/CustomerHeader';
import '../customer-v3.css';

type Role='CUSTOMER'|'PROVIDER'|'ADMIN';
type NotificationRow={id:string;role?:Role|null;notification_type:string;title:string;message:string;request_id?:string|null;ticket_number?:string|null;action_href?:string|null;created_at:string;read_at?:string|null};

function dateTime(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function icon(type:string){const t=type.toUpperCase();if(t.includes('SECURITY')||t.includes('PASSWORD'))return '🔐';if(t.includes('ESCALATION'))return '⚠';if(t.includes('PROVIDER')||t.includes('OFFER'))return '👤';if(t.includes('COMPLET'))return '✓';if(t.includes('CANCEL'))return '×';if(t.includes('SEARCH')||t.includes('DISPATCH'))return '⌕';return '🔔';}

export default function NotificationsPage(){
 const[items,setItems]=useState<NotificationRow[]>([]);const[role,setRole]=useState<Role>('CUSTOMER');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('Loading notifications…');
 useEffect(()=>{void load();},[]);
 async function session(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return null;}return data.session;}
 async function load(){setBusy(true);try{const s=await session();if(!s)return;const{data:profile}=await supabase.from('auth_profiles').select('role').eq('user_id',s.user.id).maybeSingle();const currentRole=(profile?.role||'CUSTOMER') as Role;setRole(currentRole);const{data,error}=await supabase.from('user_notifications').select('id,role,notification_type,title,message,request_id,ticket_number,action_href,created_at,read_at').eq('user_id',s.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;const rows=(data||[]) as NotificationRow[];setItems(rows);setMessage(rows.length?'':'No notifications yet.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load notifications.');}finally{setBusy(false);}}
 async function markRead(id:string){try{const s=await session();if(!s)return;const{error}=await supabase.from('user_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',s.user.id);if(error)throw error;setItems(v=>v.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));}catch(e){setMessage(e instanceof Error?e.message:'Unable to mark notification as read.');}}
 async function markAllRead(){const unreadRows=items.filter(n=>!n.read_at);if(!unreadRows.length)return;setBusy(true);try{const s=await session();if(!s)return;const now=new Date().toISOString();const{error}=await supabase.from('user_notifications').update({read_at:now}).eq('user_id',s.user.id).is('read_at',null);if(error)throw error;setItems(v=>v.map(n=>n.read_at?n:{...n,read_at:now}));setMessage('All notifications marked as read.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to mark all notifications as read.');}finally{setBusy(false);}}
 const unread=useMemo(()=>items.filter(n=>!n.read_at).length,[items]);
 const backHref=role==='ADMIN'?'/admin':role==='PROVIDER'?'/provider/jobs':'/';
 const audience=role==='ADMIN'?'Admin alerts and escalations':role==='PROVIDER'?'Service offers and job updates':'Request and account updates';
 return <main className="c3Page"><CustomerHeader title="Notifications" backHref={backHref}/><div className="c3Shell" style={{paddingTop:24,paddingBottom:90}}>
  <section className="c3Section" style={{display:'grid',gap:18}}><div className="c3SectionHead" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}><div><small>{role} UPDATES</small><h2 style={{margin:'4px 0'}}>Notifications</h2><p style={{margin:0}}>{unread?`${unread} unread update${unread===1?'':'s'} · ${audience}`:`You’re all caught up · ${audience}`}</p></div><div style={{display:'flex',gap:8}}><button className="c3Secondary" type="button" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh'}</button>{unread?<button className="c3Primary" type="button" onClick={()=>void markAllRead()} disabled={busy}>Mark all read</button>:null}</div></div>
  {message?<div className="c3Notice">{message}</div>:null}
  <div style={{display:'grid',gap:10}}>{items.map(n=><article key={n.id} style={{display:'grid',gridTemplateColumns:'44px minmax(0,1fr) auto',gap:12,alignItems:'start',padding:'16px',border:'1px solid var(--fx-line)',borderRadius:16,background:n.read_at?'#fff':'#eef2ff'}}><div aria-hidden="true" style={{width:44,height:44,borderRadius:12,display:'grid',placeItems:'center',background:'#fff',border:'1px solid var(--fx-line)',fontSize:20}}>{icon(n.notification_type)}</div><div style={{minWidth:0}}><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><strong>{n.title||'Update'}</strong>{!n.read_at?<span style={{fontSize:11,fontWeight:800,color:'var(--fx-blue-dark)',background:'#fff',borderRadius:999,padding:'3px 8px'}}>NEW</span>:null}</div><p style={{margin:'6px 0',color:'var(--fx-muted)',lineHeight:1.55}}>{n.message}</p><small style={{color:'var(--fx-muted)'}}>{dateTime(n.created_at)}</small></div><div style={{display:'grid',gap:7,justifyItems:'end'}}>{n.action_href?<a className="c3Primary" style={{textDecoration:'none',padding:'0 14px',display:'inline-flex',alignItems:'center'}} href={n.action_href}>Open</a>:null}{!n.read_at?<button className="c3Secondary" type="button" onClick={()=>void markRead(n.id)}>Mark read</button>:null}</div></article>)}</div>
  {!items.length&&!busy?<div style={{padding:'34px 16px',textAlign:'center',color:'var(--fx-muted)'}}>No notifications yet. Relevant updates will appear here automatically.</div>:null}
  </section>
 </div></main>;
}
