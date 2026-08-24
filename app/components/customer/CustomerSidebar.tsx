'use client';

import type { FixitLanguage } from './useFixitLocale';
import AppModeSwitch from '../../AppModeSwitch';

type Props={language:FixitLanguage;setLanguage:(lang:FixitLanguage)=>void;profileName?:string|null;onNewRequest:()=>void;onSignOut?:()=>void};

const labels={
 brand:{en:'FixIt',dv:'ފިކްސްއިޓް'},home:{en:'Home',dv:'މައި ޞަފްޙާ'},requests:{en:'My Requests',dv:'މަގޭ ރިކުއެސްޓްތައް'},newRequest:{en:'New Request',dv:'އައު ރިކުއެސްޓް'},profile:{en:'Profile',dv:'ޕްރޮފައިލް'},account:{en:'Account',dv:'އެކައުންޓް'},main:{en:'Main',dv:'މައިން'},logout:{en:'Logout',dv:'ލޮގްއައުޓް'},maldives:{en:'Maldives service marketplace',dv:'މޯލްޑިވްސް ސަރވިސް މާކެޓްޕްލޭސް'}
} as const;

export default function CustomerSidebar({language,setLanguage,profileName,onNewRequest,onSignOut}:Props){
 const l=(key:keyof typeof labels)=>labels[key][language];
 return <aside className="c4Sidebar" aria-label={l('main')}>
  <a className="c4Brand" href="/"><span className="c4BrandMark">F</span><span><strong>{l('brand')}</strong><small>{l('maldives')}</small></span></a>
  <div className="c4Lang" role="group" aria-label="Language"><button className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>EN</button><button className={language==='dv'?'active':''} onClick={()=>setLanguage('dv')}>ދިވެހި</button></div>
  <div className="c4NavLabel">{l('main')}</div>
  <nav className="c4Nav">
   <a className="active" href="/home"><span>⌂</span>{l('home')}</a>
   <a href="/requests"><span>▤</span>{l('requests')}</a>
   <button onClick={onNewRequest}><span>＋</span>{l('newRequest')}</button>
  </nav>
  <div className="c4NavLabel">{l('account')}</div>
  <nav className="c4Nav">
   <a href="/profile"><span>○</span>{l('profile')}</a>
   <AppModeSwitch mode="customer" className="c4ModeSwitch"/>
  </nav>
  <div className="c4SidebarFoot"><div className="c4Identity"><span>{(profileName||'CU').slice(0,2).toUpperCase()}</span><strong>{profileName||l('account')}</strong></div>{onSignOut?<button className="c4Logout" onClick={onSignOut}>{l('logout')}</button>:null}</div>
 </aside>;
}
