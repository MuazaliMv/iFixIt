'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminNav from '../AdminNav';
import { supabase } from '../../../lib/supabaseClient';

const API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-config';
type ConfigRow={key:string;value:Record<string,unknown>;is_active:boolean;updated_at:string};
type Theme={surface:string;surfaceAlt:string;page:string;text:string;muted:string;line:string;brand:string;brandSoft:string;success:string;warning:string;danger:string;radiusSm:number;radiusMd:number;radiusLg:number;shadow:string};
type Geo={provider:string;endpoint:string;zoom:number;format:string;acceptLanguage:string;cacheDays:number};

export default function AdminSettingsPage(){
 const[rows,setRows]=useState<ConfigRow[]>([]);const[theme,setTheme]=useState<Theme|null>(null);const[geo,setGeo]=useState<Geo|null>(null);const[message,setMessage]=useState('Loading configuration…');const[busy,setBusy]=useState(false);
 useEffect(()=>{void load();},[]);
 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function call(body:Record<string,unknown>){const t=await token();if(!t)throw new Error('Sign in required');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Configuration request failed');return p;}
 async function load(){setBusy(true);try{const p=await call({action:'list'});const cfg=p.config||[];setRows(cfg);const t=cfg.find((r:ConfigRow)=>r.key==='ui.theme')?.value||{};const g=cfg.find((r:ConfigRow)=>r.key==='geolocation.provider')?.value||{};setTheme(t as Theme);setGeo(g as Geo);setMessage('Live configuration loaded.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load configuration.');}finally{setBusy(false);}}
 async function save(key:string,value:Record<string,unknown>){setBusy(true);try{await call({action:'update',key,value,isActive:true});setMessage(`${key} updated. Changes are live without code edits.`);await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to save configuration.');}finally{setBusy(false);}}
 const otherRows=useMemo(()=>rows.filter(r=>!['ui.theme','geolocation.provider'].includes(r.key)),[rows]);
 function themeField(key:keyof Theme,label:string,type:'color'|'number'|'text'='text'){if(!theme)return null;return <label>{label}<input type={type} value={String(theme[key]??'')} onChange={e=>setTheme({...theme,[key]:type==='number'?Number(e.target.value):e.target.value})}/></label>}
 return <main className="shell">
  <header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Settings</p></div></header>
  <AdminNav/>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADMIN SETTINGS</p><h2>System configuration</h2><p className="muted">Manage runtime configuration, profile field rules and system audit history from one settings area.</p></div><span className="pill">Server controlled</span></div>{message?<p className="formMessage" role="status">{message}</p>:null}</section>

  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">SETTINGS SECTIONS</p><h2>Administration controls</h2></div></div><div className="profileQuickGrid">
   <a className="profileQuickCard" href="#appearance"><span className="profileQuickIcon">◫</span><span><strong>Appearance</strong><small>Theme and design tokens</small></span></a>
   <a className="profileQuickCard" href="#location"><span className="profileQuickIcon">⌖</span><span><strong>Location Configuration</strong><small>Geolocation provider settings</small></span></a>
   <a className="profileQuickCard" href="/admin/required-fields"><span className="profileQuickIcon">✓</span><span><strong>Profile Fields</strong><small>Required fields, completeness and prompts</small></span></a>
   <a className="profileQuickCard" href="/admin/audit-logs"><span className="profileQuickIcon">≡</span><span><strong>System Audit</strong><small>Administrative and security event history</small></span></a>
  </div></section>

  {theme?<section className="panel" id="appearance"><div className="panelHeader"><div><p className="eyebrow">APPEARANCE</p><h2>Design tokens</h2></div><button className="primary" disabled={busy} onClick={()=>void save('ui.theme',theme as unknown as Record<string,unknown>)}>Save Theme</button></div><div className="formGrid">
   {themeField('brand','Brand color','color')}{themeField('brandSoft','Brand soft color','color')}{themeField('surface','Surface color','color')}{themeField('surfaceAlt','Alternate surface','color')}{themeField('page','Page background','color')}{themeField('text','Text color','color')}{themeField('muted','Muted text','color')}{themeField('line','Border color','color')}{themeField('success','Success color','color')}{themeField('warning','Warning color','color')}{themeField('danger','Danger color','color')}{themeField('radiusSm','Small radius','number')}{themeField('radiusMd','Medium radius','number')}{themeField('radiusLg','Large radius','number')}<label className="full">Card shadow<input value={theme.shadow||''} onChange={e=>setTheme({...theme,shadow:e.target.value})}/></label>
  </div></section>:null}
  {geo?<section className="panel" id="location"><div className="panelHeader"><div><p className="eyebrow">LOCATION CONFIGURATION</p><h2>Reverse-location provider</h2></div><button className="primary" disabled={busy} onClick={()=>void save('geolocation.provider',geo as unknown as Record<string,unknown>)}>Save Location Settings</button></div><div className="formGrid"><label>Provider name<input value={geo.provider||''} onChange={e=>setGeo({...geo,provider:e.target.value})}/></label><label className="full">HTTPS endpoint<input value={geo.endpoint||''} onChange={e=>setGeo({...geo,endpoint:e.target.value})}/></label><label>Zoom<input type="number" value={geo.zoom??18} onChange={e=>setGeo({...geo,zoom:Number(e.target.value)})}/></label><label>Response format<input value={geo.format||''} onChange={e=>setGeo({...geo,format:e.target.value})}/></label><label>Language<input value={geo.acceptLanguage||''} onChange={e=>setGeo({...geo,acceptLanguage:e.target.value})}/></label><label>Cache days<input type="number" min="1" max="365" value={geo.cacheDays??30} onChange={e=>setGeo({...geo,cacheDays:Number(e.target.value)})}/></label></div><p className="localNotice">The resolver reads this configuration on every uncached lookup. No island coordinate bounds are embedded in the application.</p></section>:null}
  {otherRows.length?<section className="panel"><div className="panelHeader"><div><p className="eyebrow">ADVANCED</p><h2>Additional runtime keys</h2></div></div><div className="jobList">{otherRows.map(r=><div className="jobCard" key={r.key}><strong>{r.key}</strong><p className="jobDescription">{JSON.stringify(r.value)}</p><span className="muted">Updated {new Date(r.updated_at).toLocaleString()}</span></div>)}</div></section>:null}
  <footer className="footer"><span>FixIt Maldives</span><span>Admin Settings</span></footer>
 </main>;
}
