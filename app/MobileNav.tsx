'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import './mobile-nav.css';

const INSIGHTS_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-insights';
type Props={role:'customer'|'provider'};type Item={href:string;label:string;icon:string;primary?:boolean;match:(path:string)=>boolean};
export default function MobileNav({role}:Props){
 const pathname=usePathname();const[offerCount,setOfferCount]=useState(0);
 useEffect(()=>{if(role!=='provider')return;void(async()=>{try{const{data}=await supabase.auth.getSession();if(!data.session)return;const r=await fetch(INSIGHTS_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:'{}'});if(!r.ok)return;const p=await r.json();setOfferCount(Number(p?.stats?.newOfferCount||0));}catch{}})();},[role,pathname]);
 const customer:Item[]=[{href:'/',label:'Home',icon:'⌂',match:p=>p==='/'},{href:'/requests',label:'My Requests',icon:'▣',match:p=>p==='/requests'||p.startsWith('/requests/')},{href:'/#request',label:'New Request',icon:'＋',primary:true,match:()=>false},{href:'/messages',label:'Messages',icon:'◌',match:p=>p==='/messages'},{href:'/profile',label:'Profile',icon:'♙',match:p=>p==='/profile'}];
 const provider:Item[]=[{href:'/provider/today',label:'Today',icon:'⌂',match:p=>p==='/provider/today'||p.startsWith('/provider/jobs')||p==='/provider'},{href:'/provider/calendar',label:'Calendar',icon:'□',match:p=>p==='/provider/calendar'||p==='/provider/availability'},{href:'/provider/listings',label:'Listings',icon:'▤',match:p=>p==='/provider/listings'||p==='/provider/services'},{href:'/provider/messages',label:'Messages',icon:'◌',match:p=>p==='/provider/messages'},{href:'/provider/menu',label:'Menu',icon:'☰',match:p=>p==='/provider/menu'||p.startsWith('/provider/earnings')}];
 const items=role==='provider'?provider:customer;function rememberShell(){try{localStorage.setItem('fixit:mobile-nav-role',role);localStorage.setItem('fixit:app-mode',role);}catch{}}
 return <><div className="mobileNavSpacer" aria-hidden="true"/><nav className={`mobileNav ${role==='provider'?'providerMobileNav':''}`} aria-label={`${role} navigation`}>{items.map(item=><Link key={item.label} href={item.href} onClick={rememberShell} className={`${item.match(pathname)?'active ':''}${item.primary?'primaryNav':''}`.trim()}><span className="navIcon">{item.icon}{role==='provider'&&item.label==='Today'&&offerCount>0?<b className="navBadge">{offerCount>9?'9+':offerCount}</b>:null}</span><span>{item.label}</span></Link>)}</nav></>;
}
