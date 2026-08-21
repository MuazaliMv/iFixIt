'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import './mobile-nav.css';

type Props={role:'customer'|'provider'};
type Item={href:string;label:string;icon:string;primary?:boolean;match:(path:string,search:string)=>boolean};

export default function MobileNav({role}:Props){
 const pathname=usePathname();const params=useSearchParams();const search=params.toString();
 const customer:Item[]=[
  {href:'/',label:'Home',icon:'⌂',match:p=>p==='/'},
  {href:'/requests',label:'My Requests',icon:'▣',match:p=>p==='/requests'||p.startsWith('/requests/')},
  {href:'/#request',label:'New Request',icon:'＋',primary:true,match:()=>false},
  {href:'/messages',label:'Messages',icon:'✉',match:p=>p==='/messages'},
  {href:'/profile',label:'Profile',icon:'●',match:p=>p==='/profile'}
 ];
 const provider:Item[]=[
  {href:'/provider',label:'Dashboard',icon:'⌂',match:(p,s)=>p==='/provider'&&!s.includes('stage=')},
  {href:'/provider?stage=NEW#provider-jobs',label:'Requests',icon:'▣',match:(p,s)=>p==='/provider'&&s.includes('stage=NEW')},
  {href:'/provider?stage=SCHEDULED#provider-jobs',label:'Bookings',icon:'◫',primary:true,match:(p,s)=>p==='/provider'&&s.includes('stage=SCHEDULED')},
  {href:'/provider/earnings',label:'Earnings',icon:'MVR',match:p=>p==='/provider/earnings'},
  {href:'/provider/onboarding',label:'Profile',icon:'●',match:p=>p==='/provider/onboarding'}
 ];
 const items=role==='provider'?provider:customer;
 return <><div className="mobileNavSpacer" aria-hidden="true"/><nav className="mobileNav" aria-label={`${role} navigation`}>{items.map(item=><a key={item.label} href={item.href} className={`${item.match(pathname,search)?'active ':''}${item.primary?'primaryNav':''}`.trim()}><span className="navIcon">{item.icon}</span><span>{item.label}</span></a>)}</nav></>;
}
