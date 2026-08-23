'use client';

import { useEffect } from 'react';

export default function PreferredDateRuntime(){
  useEffect(()=>{
    const prepare=(input:HTMLInputElement)=>{
      input.disabled=false;
      input.readOnly=false;
      input.style.pointerEvents='auto';
      input.style.position='relative';
      input.style.zIndex='20';
      input.style.opacity='1';
      input.style.touchAction='manipulation';
      if(!input.min){
        const now=new Date();
        const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
        input.min=local;
      }
    };

    const activate=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(!target)return;
      const direct=target instanceof HTMLInputElement&&target.type==='date'?target:null;
      const field=target.closest?.('.c3Field');
      const input=direct||(field?.querySelector("input[type='date']") as HTMLInputElement|null);
      if(!input)return;
      prepare(input);
      input.focus({preventScroll:true});
      const picker=(input as HTMLInputElement & {showPicker?:()=>void}).showPicker;
      if(typeof picker==='function'){
        try{picker.call(input);}catch{}
      }
    };

    const prepareAll=()=>document.querySelectorAll<HTMLInputElement>(".c3Field input[type='date']").forEach(prepare);
    prepareAll();
    const observer=new MutationObserver(prepareAll);
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('pointerdown',activate,true);
    document.addEventListener('click',activate,true);
    return()=>{
      observer.disconnect();
      document.removeEventListener('pointerdown',activate,true);
      document.removeEventListener('click',activate,true);
    };
  },[]);
  return null;
}
