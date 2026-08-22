'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './mobile-nav.css';

type Props={role:'customer'|'provider'};
type Item={href:string;label:string;icon:string;primary?:boolean;match:(path:string)=>boolean};

export default function MobileNav({role}:Props){
 const pathname=usePathname();
 const customer:Item[]=[
  {href:'/',label:'Home',icon:'⌂',match:p=>p==='/'},
  {href:'/requests',label:'My Requests',icon:'▣',match:p=>p==='/requests'||p.startsWith('/requests/')},
  {href:'/#request',label:'New Request',icon:'＋',primary:true,match:()=>false},
  {href:'/messages',label:'Messages',icon:'◌',match:p=>p==='/messages'},
  {href:'/profile',label:'Profile',icon:'♙',match:p=>p==='/profile'}
 ];
 const provider:Item[]=[
  {href:'/provider',label:'Dashboard',icon:'⌂',match:p=>p==='/provider'},
  {href:'/provider#provider-jobs',label:'Requests',icon:'▣',match:()=>false},
  {href:'/provider#provider-jobs',label:'Bookings',icon:'◫',match:()=>false},
  {href:'/provider/earnings',label:'Earnings',icon:'▱',match:p=>p==='/provider/earnings'},
  {href:'/profile',label:'Profile',icon:'♙',match:p=>p==='/profile'}
 ];
 const items=role==='provider'?provider:customer;
 function rememberShell(){try{localStorage.setItem('fixit:mobile-nav-role',role);}catch{}}
 return <><div className="mobileNavSpacer" aria-hidden="true"/><nav className={`mobileNav ${role==='provider'?'providerMobileNav':''}`} aria-label={`${role} navigation`}>{items.map(item=><Link key={item.label} href={item.href} onClick={rememberShell} className={`${item.match(pathname)?'active ':''}${item.primary?'primaryNav':''}`.trim()}><span className="navIcon">{item.icon}</span><span>{item.label}</span></Link>)}</nav></>;
}
