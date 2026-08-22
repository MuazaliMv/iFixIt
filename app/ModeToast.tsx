'use client';

import { useEffect, useState } from 'react';

export default function ModeToast(){
 const[message,setMessage]=useState('');
 useEffect(()=>{try{const next=sessionStorage.getItem('fixit:mode-toast')||'';if(next){sessionStorage.removeItem('fixit:mode-toast');setMessage(next);const id=window.setTimeout(()=>setMessage(''),3600);return()=>window.clearTimeout(id);}}catch{}},[]);
 if(!message)return null;
 return <div className="modeToast" role="status" aria-live="polite"><span>✓</span><span>{message}</span></div>;
}
