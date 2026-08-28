'use client';

import { useEffect } from 'react';

function setText(selector:string,text:string){
  const node=document.querySelector<HTMLElement>(selector);
  if(node&&node.textContent!==text) node.textContent=text;
}

function applySuitePresentation(){
  const path=window.location.pathname;
  document.body.dataset.fixitSuite='complete-application';

  if(path==='/home'||path.startsWith('/home?')){
    setText('.c3Welcome small','Verified Expert Network');
    setText('.c3Welcome h1','Need a repair today?');
    setText('.c3Welcome p','Book certified electricians, plumbers, AC and repair experts across approved Maldivian regions.');
    const heroButton=document.querySelector<HTMLButtonElement>('.c3Welcome .c3Primary');
    if(heroButton&&heroButton.textContent?.trim()!=='Book Service Now') heroButton.textContent='Book Service Now';
  }

  if(path.startsWith('/provider/jobs')){
    setText('.providerModeTop h1','Provider Operations');
    setText('.providerModeTop p','● Online & Accepting Dispatches');
    setText('.providerSectionHead h2','Active Job Contracts');
  }

  if(path==='/admin'||path.startsWith('/admin?')){
    const headings=Array.from(document.querySelectorAll<HTMLElement>('h1,h2'));
    const first=headings.find(el=>/admin|dashboard/i.test(el.textContent||''));
    if(first&&first.textContent!=='Admin Control Panel') first.textContent='Admin Control Panel';
  }
}

export default function CompleteApplicationRuntime(){
  useEffect(()=>{
    applySuitePresentation();
    const observer=new MutationObserver(()=>applySuitePresentation());
    observer.observe(document.body,{childList:true,subtree:true});
    const onPop=()=>applySuitePresentation();
    window.addEventListener('popstate',onPop);
    return()=>{observer.disconnect();window.removeEventListener('popstate',onPop);delete document.body.dataset.fixitSuite;};
  },[]);
  return null;
}
