'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { readSelectedWorkspace } from '../../lib/workspaceSelection';

function workspaceHome(workspace:'admin'|'provider'|'customer'){
 if(workspace==='admin')return '/admin';
 if(workspace==='provider')return '/provider/today';
 return '/home';
}

export default function AccessStatusPage(){
 const params=useSearchParams();
 const portal=params.get('portal')==='provider'?'provider':'admin';
 const reason=params.get('reason')==='denied'?'denied':'unavailable';
 const selected=readSelectedWorkspace()??'customer';
 const retry=params.get('next')||workspaceHome(selected);
 const title=reason==='unavailable'?'We could not verify your access':'Access is not available';
 const message=reason==='unavailable'
  ?`Your ${portal==='admin'?'Admin':'Service Provider'} workspace has not been changed. The permission service could not be reached, so access was stopped safely.`
  :`Your account does not currently have permission to open the ${portal==='admin'?'Admin':'Service Provider'} workspace.`;

 return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px',background:'#f5f5f7'}}>
  <section style={{width:'min(520px,100%)',padding:'24px',border:'1px solid #e5e7eb',borderRadius:'24px',background:'#fff',boxShadow:'0 18px 50px rgba(15,23,42,.08)'}}>
   <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'#6b7280'}}>FixIt access check</p>
   <h1 style={{margin:'0',fontSize:'28px',lineHeight:1.15,color:'#111827'}}>{title}</h1>
   <p style={{margin:'12px 0 0',fontSize:'15px',lineHeight:1.6,color:'#4b5563'}}>{message}</p>
   <div style={{display:'grid',gap:'10px',marginTop:'22px'}}>
    {reason==='unavailable'?<Link href={retry} style={{display:'grid',placeItems:'center',minHeight:'48px',borderRadius:'14px',background:'#2563eb',color:'#fff',fontWeight:800,textDecoration:'none'}}>Retry</Link>:null}
    <Link href={workspaceHome(selected)} style={{display:'grid',placeItems:'center',minHeight:'48px',border:'1px solid #d1d5db',borderRadius:'14px',background:'#fff',color:'#111827',fontWeight:800,textDecoration:'none'}}>Return to current workspace</Link>
   </div>
  </section>
 </main>;
}
