'use client';

import { useEffect, useState } from 'react';
import AdminNav from '../AdminNav';
import { supabase } from '../../../lib/supabaseClient';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-config';
type ConfigRow={key:string;value:Record<string,unknown>;is_active:boolean;updated_at:string};
type Geo={provider:string;endpoint:string;zoom:number;format:string;acceptLanguage:string;cacheDays:number};

export default function AdminSettingsPage(){
 const[geo,setGeo]=useState<Geo|null>(null);const[message,setMessage]=useState('Loading configuration…');const[busy,setBusy]=useState(false);
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Configuration request failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list'});const cfg=p.config||[];const g=cfg.find((r:ConfigRow)=>r.key==='geolocation.provider')?.value||{};setGeo(g as Geo);setMessage('Live configuration loaded.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load configuration.');}finally{setBusy(false);}}
 async function save(key:string,value:Record<string,unknown>){setBusy(true);try{await call({action:'update',key,value,isActive:true});setMessage(`${key} updated. Changes are live without code edits.`);await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to save configuration.');}finally{setBusy(false);}}
 return <main className="shell">
  <AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADMIN SETTINGS</p><h2>System configuration</h2><p className="muted">Manage runtime configuration and system audit history from one settings area.</p></div><span className="pill">Server controlled</span></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">SETTINGS SECTIONS</p><h2>Administration controls</h2></div></div><div className="profileQuickGrid">
   <a className="profileQuickCard" href="#location"><span className="profileQuickIcon">⌖</span><span><strong>Location Configuration</strong><small>Geolocation provider settings</small></span></a>
   <a className="profileQuickCard" href="/admin/audit-logs"><span className="profileQuickIcon">≡</span><span><strong>System Audit</strong><small>Administrative and security event history</small></span></a>
  </div></section>

  {geo?<section className="panel" id="location"><div className="panelHeader"><div><p className="eyebrow">LOCATION CONFIGURATION</p><h2>Reverse-location provider</h2></div><button className="primary" disabled={busy} onClick={()=>void save('geolocation.provider',geo as unknown as Record<string,unknown>)}>Save Location Settings</button></div><div className="formGrid"><label>Provider name<input value={geo.provider||''} onChange={e=>setGeo({...geo,provider:e.target.value})}/></label><label className="full">HTTPS endpoint<input value={geo.endpoint||''} onChange={e=>setGeo({...geo,endpoint:e.target.value})}/></label><label>Zoom<input type="number" value={geo.zoom??18} onChange={e=>setGeo({...geo,zoom:Number(e.target.value)})}/></label><label>Response format<input value={geo.format||''} onChange={e=>setGeo({...geo,format:e.target.value})}/></label><label>Language<input value={geo.acceptLanguage||''} onChange={e=>setGeo({...geo,acceptLanguage:e.target.value})}/></label><label>Cache days<input type="number" min="1" max="365" value={geo.cacheDays??30} onChange={e=>setGeo({...geo,cacheDays:Number(e.target.value)})}/></label></div><p className="localNotice">The resolver reads this configuration on every uncached lookup. No island coordinate bounds are embedded in the application.</p></section>:null}
  <footer className="footer"><span>FixIt Maldives</span><span>Admin Settings</span></footer>
 </main>;
}
