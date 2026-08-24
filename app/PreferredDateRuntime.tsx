'use client';

import { useEffect } from 'react';

function selectedRequestType(){
  const selected=[...document.querySelectorAll<HTMLButtonElement>('.c3Urgency button.selected')]
    .find(button=>/^(urgent|standard|scheduled)/i.test((button.textContent||'').trim()));
  const text=(selected?.textContent||'').toUpperCase();
  if(text.includes('SCHEDULED'))return'SCHEDULE';
  if(text.includes('URGENT'))return'URGENT';
  if(text.includes('STANDARD'))return'STANDARD';
  return null;
}

function syncPreferredDateVisibility(){
  const requestType=selectedRequestType();

  document.querySelectorAll<HTMLInputElement>(".c3Field input[type='date']").forEach(input=>{
    const field=input.closest<HTMLElement>('.c3Field');
    if(!field)return;

    const show=requestType==='SCHEDULE';
    field.hidden=!show;
    if(show){
      field.removeAttribute('aria-hidden');
      input.required=true;
      input.disabled=false;
    }else{
      field.setAttribute('aria-hidden','true');
      input.required=false;
      input.disabled=true;
    }
  });

  document.querySelectorAll<HTMLElement>('.c3ReviewRow').forEach(row=>{
    const label=(row.querySelector('span')?.textContent||'').trim().toLowerCase();
    if(label.includes('preferred')&&label.includes('date')){
      row.hidden=requestType!=='SCHEDULE';
    }
  });
}

export default function PreferredDateRuntime(){
  useEffect(()=>{
    const sync=()=>syncPreferredDateVisibility();
    sync();

    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',sync,true);
    document.addEventListener('change',sync,true);

    return()=>{
      observer.disconnect();
      document.removeEventListener('click',sync,true);
      document.removeEventListener('change',sync,true);
    };
  },[]);

  return null;
}
