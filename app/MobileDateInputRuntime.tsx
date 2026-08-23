'use client';

import { useEffect } from 'react';

function localToday(){
  const now=new Date();
  const offset=now.getTimezoneOffset()*60000;
  return new Date(now.getTime()-offset).toISOString().slice(0,10);
}

export default function MobileDateInputRuntime(){
  useEffect(()=>{
    const enhance=(input:HTMLInputElement)=>{
      if(input.dataset.fixitDateEnhanced==='1')return;
      input.dataset.fixitDateEnhanced='1';
      const today=localToday();
      if(!input.min)input.min=today;
      if(!input.value){
        input.value=today;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
      const openPicker=()=>{
        const picker=input as HTMLInputElement & {showPicker?:()=>void};
        try{picker.showPicker?.();}catch{}
      };
      input.addEventListener('pointerup',openPicker);
      input.addEventListener('focus',openPicker);
    };

    const scan=()=>document.querySelectorAll<HTMLInputElement>(".c3WizardCard input[type='date']").forEach(enhance);
    scan();
    const observer=new MutationObserver(scan);
    observer.observe(document.body,{subtree:true,childList:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
