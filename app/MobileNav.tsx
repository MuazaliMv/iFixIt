'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './mobile-nav.css';

const INSIGHTS_URL='/api/legacy-edge?service=provider-insights';
type NavRole='customer'|'provider'|'admin';
type Props={role:NavRole};type Item={href:string;label:string;icon:string;primary?:boolean;match:(path:string)=>boolean};
export default function MobileNav({role}:Props){
 const pathname=usePathname();const[offerCount,setOfferCount]=useState(0);const[messageUnread,setMessageUnread]=useState(0);
 useEffect(()=>{let active=true;async function refresh(){try{if(role==='provider'){const r=await fetch(INSIGHTS_URL,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok){const p=await r.json();if(active)setOfferCount(Number(p?.stats?.newOfferCount||0));}}const mr=await fetch('/api/messages/unread',{credentials:'same-origin',cache:'no-store'});if(mr.ok){const p=await mr.json();if(active)setMessageUnread(Number(p?.count||0));}}catch{}}void refresh();const id=window.setInterval(()=>void refresh(),30000);return()=>{active=false;window.clearInterval(id);};},[role,pathname]);
 const customer:Item[]=[{href:'/home',label:'Request Service',icon:'⌂',match:p=>p==='/home'||p.startsWith('/home/')},{href:'/requests',label:'Service Requests',icon:'▣',match:p=>p==='/requests'||p.startsWith('/requests/')},{href:'/messages',label:'Messages',icon:'◌',match:p=>p==='/messages'||p.startsWith('/messages/')},{href:'/profile',label:'Profile',icon:'♙',match:p=>p==='/profile'}];
 const provider:Item[]=[{href:'/provider/jobs',label:'Jobs',icon:'▤',match:p=>p.startsWith('/provider/jobs')||p==='/provider'||p==='/provider/today'},{href:'/provider/calendar',label:'Calendar',icon:'□',match:p=>p==='/provider/calendar'||p==='/provider/availability'},{href:'/provider/messages',label:'Messages',icon:'◌',match:p=>p==='/provider/messages'||p.startsWith('/provider/messages/')},{href:'/provider/menu',label:'Menu',icon:'☰',match:p=>p==='/provider/menu'}];
 const admin:Item[]=[{href:'/admin',label:'Dashboard',icon:'⌂',match:p=>p==='/admin'},{href:'/admin/requests',label:'Request Management',icon:'▣',match:p=>p.startsWith('/admin/requests')},{href:'/admin/escalations',label:'Attention',icon:'!',match:p=>p.startsWith('/admin/escalations')},{href:'/admin/reports',label:'Reports',icon:'▤',match:p=>p.startsWith('/admin/reports')},{href:'/profile',label:'Profile',icon:'♙',match:p=>p==='/profile'}];
 const items=role==='provider'?provider:role==='admin'?admin:customer;
 return <><div className="mobileNavSpacer" aria-hidden="true"/><nav className={`mobileNav ${role==='provider'?'providerMobileNav':role==='admin'?'adminMobileNav':''}`} aria-label={`${role} navigation`}>{items.map(item=><Link key={item.label} href={item.href} className={`${item.match(pathname)?'active ':''}${item.primary?'primaryNav':''}`.trim()}><span className="navIcon">{item.icon}{role==='provider'&&item.label==='Jobs'&&offerCount>0?<b className="navBadge">{offerCount>9?'9+':offerCount}</b>:item.label==='Messages'&&messageUnread>0?<b className="navBadge">{messageUnread>9?'9+':messageUnread}</b>:null}</span><span>{item.label}</span></Link>)}</nav></>;
}
