'use client';

import { useEffect } from 'react';

/**
 * Mobile/iOS safety net for the customer service-selection step.
 *
 * The request action dock already has a touch fallback, but service tiles did
 * not. On affected iOS Safari/PWA sessions a touch can end without the native
 * click reaching React, leaving serviceCode unchanged and Continue disabled.
 * This runtime never cancels native events; it only synthesizes a click when
 * no native click arrives for that exact tile shortly after the touch.
 */
export default function CustomerServiceTapRuntime(){
 useEffect(()=>{
  const nativeClicks=new WeakMap<HTMLButtonElement,number>();
  const timers=new WeakMap<HTMLButtonElement,number>();

  const isServiceTile=(node:EventTarget|null):HTMLButtonElement|null=>{
   const element=node instanceof Element?node:null;
   return element?.closest('.c3Wizard .c3ServiceTile') as HTMLButtonElement|null;
  };

  const syncContinue=()=>{
   window.requestAnimationFrame(()=>{
    const wizard=document.querySelector('.c3Wizard');
    if(!wizard)return;
    const selected=wizard.querySelector<HTMLButtonElement>('.c3ServiceTile.selected');
    const continueButton=wizard.querySelector<HTMLButtonElement>('.c3ActionInner .c3Primary');
    if(!selected||!continueButton)return;
    // A .selected tile is rendered from React state, so it is safe to clear a
    // stale disabled DOM attribute if another runtime/browser left it behind.
    if(continueButton.disabled){
     continueButton.disabled=false;
     continueButton.removeAttribute('aria-disabled');
    }
   });
  };

  const scheduleFallback=(button:HTMLButtonElement|null)=>{
   if(!button||button.disabled)return;
   const startedAt=Date.now();
   const previous=timers.get(button);
   if(previous)window.clearTimeout(previous);
   const timer=window.setTimeout(()=>{
    timers.delete(button);
    const clickedAt=nativeClicks.get(button)||0;
    if(clickedAt>=startedAt)return;
    button.click();
    syncContinue();
   },120);
   timers.set(button,timer);
  };

  const onPointerUp=(event:PointerEvent)=>{
   if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
   scheduleFallback(isServiceTile(event.target));
  };

  const onTouchEnd=(event:TouchEvent)=>{
   if(event.changedTouches.length!==1)return;
   scheduleFallback(isServiceTile(event.target));
  };

  const onClick=(event:MouseEvent)=>{
   const button=isServiceTile(event.target);
   if(!button)return;
   nativeClicks.set(button,Date.now());
   syncContinue();
  };

  const observer=new MutationObserver(()=>syncContinue());
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','disabled']});
  document.addEventListener('pointerup',onPointerUp,{capture:true,passive:true});
  document.addEventListener('touchend',onTouchEnd,{capture:true,passive:true});
  document.addEventListener('click',onClick,true);

  return()=>{
   observer.disconnect();
   document.removeEventListener('pointerup',onPointerUp,true);
   document.removeEventListener('touchend',onTouchEnd,true);
   document.removeEventListener('click',onClick,true);
  };
 },[]);
 return null;
}
