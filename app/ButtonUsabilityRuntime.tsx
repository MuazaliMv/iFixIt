'use client';

import { useEffect } from 'react';

const BUTTON_SELECTOR='button,[role="button"],a.button,a.btn';

function enhanceElement(el:HTMLElement){
  if(!el.matches(BUTTON_SELECTOR))return;
  if(el instanceof HTMLButtonElement){
    if(el.disabled)el.setAttribute('aria-disabled','true');
    else if(el.getAttribute('aria-disabled')==='true')el.removeAttribute('aria-disabled');
  }

  const text=(el.textContent||'').trim();
  const hasName=Boolean(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title')||text);
  if(!hasName&&el.querySelector('svg,[data-icon]'))el.setAttribute('aria-label','Action');

  if(!el.hasAttribute('tabindex')&&el.getAttribute('role')==='button'&&!(el instanceof HTMLButtonElement)&&!(el instanceof HTMLAnchorElement)){
    el.tabIndex=0;
  }
}

function enhance(root:ParentNode=document){
  if(root instanceof HTMLElement)enhanceElement(root);
  root.querySelectorAll<HTMLElement>(BUTTON_SELECTOR).forEach(enhanceElement);
}

export default function ButtonUsabilityRuntime(){
  useEffect(()=>{
    enhance();
    const observer=new MutationObserver((mutations)=>{
      for(const mutation of mutations){
        if(mutation.type==='childList'){
          mutation.addedNodes.forEach(node=>{if(node instanceof HTMLElement)enhance(node);});
        }else if(mutation.type==='attributes'&&mutation.target instanceof HTMLElement){
          enhanceElement(mutation.target);
        }
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled']});

    const onKeyDown=(event:KeyboardEvent)=>{
      const el=event.target as HTMLElement|null;
      if(!el||el.getAttribute('role')!=='button'||el instanceof HTMLButtonElement||el instanceof HTMLAnchorElement)return;
      if((event.key==='Enter'||event.key===' ')&&el.getAttribute('aria-disabled')!=='true'){
        event.preventDefault();
        el.click();
      }
    };
    document.addEventListener('keydown',onKeyDown);
    return()=>{observer.disconnect();document.removeEventListener('keydown',onKeyDown);};
  },[]);
  return null;
}
