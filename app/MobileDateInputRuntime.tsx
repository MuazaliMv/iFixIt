'use client';

import { useEffect } from 'react';

function localToday(){
  const now=new Date();
  const offset=now.getTimezoneOffset()*60000;
  return new Date(now.getTime()-offset).toISOString().slice(0,10);
}

export default function MobileDateInputRuntime(){
  useEffect(()=>{
    const openPicker=(input:HTMLInputElement)=>{
      input.disabled=false;
      input.readOnly=false;
      input.style.pointerEvents='auto';
      input.style.position='relative';
      input.style.zIndex='30';
      input.style.opacity='1';
      input.style.touchAction='manipulation';
      input.focus({preventScroll:true});
      const picker=input as HTMLInputElement & {showPicker?:()=>void};
      try{picker.showPicker?.();}catch{}
    };

    const enhance=(input:HTMLInputElement)=>{
      const today=localToday();
      input.disabled=false;
      input.readOnly=false;
      input.min=today;
      input.style.pointerEvents='auto';
      input.style.position='relative';
      input.style.zIndex='30';
      input.style.opacity='1';
      input.style.touchAction='manipulation';
      if(input.dataset.fixitDateEnhanced==='1')return;
      input.dataset.fixitDateEnhanced='1';
      input.addEventListener('pointerdown',()=>openPicker(input));
      input.addEventListener('click',()=>openPicker(input));
      input.addEventListener('focus',()=>{
        const picker=input as HTMLInputElement & {showPicker?:()=>void};
        try{picker.showPicker?.();}catch{}
      });
    };

    const scan=()=>document.querySelectorAll<HTMLInputElement>(".c3WizardCard input[type='date']").forEach(enhance);
    scan();
    const observer=new MutationObserver(scan);
    observer.observe(document.body,{subtree:true,childList:true});

    const delegated=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(!target)return;
      const input=target instanceof HTMLInputElement&&target.type==='date'
        ?target
        :(target.closest?.('.c3Field')?.querySelector("input[type='date']") as HTMLInputElement|null);
      if(input)openPicker(input);
    };
    document.addEventListener('pointerdown',delegated,true);

    return()=>{
      observer.disconnect();
      document.removeEventListener('pointerdown',delegated,true);
    };
  },[]);
  return null;
}
