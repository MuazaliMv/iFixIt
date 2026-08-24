'use client';

import { useEffect } from 'react';

export default function NewRequestRuntime(){
 useEffect(()=>{
  function isNewRequestUrl(url:URL){return url.pathname==='/'&&url.searchParams.get('new')==='1';}
  function redirect(url:URL){window.location.assign(`/home?new=1${url.hash||''}`);}
  const current=new URL(window.location.href);
  if(isNewRequestUrl(current)){redirect(current);return;}
  const onClick=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const target=event.target as Element|null;
   const anchor=target?.closest('a[href]') as HTMLAnchorElement|null;
   if(!anchor)return;
   const url=new URL(anchor.href,window.location.origin);
   if(url.origin!==window.location.origin||!isNewRequestUrl(url))return;
   event.preventDefault();
   redirect(url);
  };
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[]);
 return null;
}
