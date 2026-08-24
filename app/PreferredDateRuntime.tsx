'use client';

import { useEffect } from 'react';

const SUBMIT_REQUEST_FRAGMENT='/functions/v1/submit-request';
const SYNTHETIC_DATE_ATTR='data-fixit-synthetic-date';

function localToday(){
  const now=new Date();
  return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
}

function setNativeInputValue(input:HTMLInputElement,value:string){
  const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  descriptor?.set?.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}

function selectedRequestType(){
  const selected=[...document.querySelectorAll<HTMLButtonElement>('.c3Urgency button.selected')]
    .find(button=>/^(urgent|standard|scheduled)/i.test((button.textContent||'').trim()));
  const text=(selected?.textContent||'').toUpperCase();
  if(text.includes('SCHEDULED'))return'SCHEDULE';
  if(text.includes('URGENT'))return'URGENT';
  if(text.includes('STANDARD'))return'STANDARD';
  return null;
}

function hidePreferredDateOutsideScheduled(){
  const requestType=selectedRequestType();
  const dateInputs=[...document.querySelectorAll<HTMLInputElement>(".c3Field input[type='date']")];

  for(const input of dateInputs){
    const field=input.closest<HTMLElement>('.c3Field');
    if(!field)continue;

    if(requestType==='SCHEDULE'){
      field.hidden=false;
      field.removeAttribute('aria-hidden');
      if(input.getAttribute(SYNTHETIC_DATE_ATTR)==='true'){
        setNativeInputValue(input,'');
        input.removeAttribute(SYNTHETIC_DATE_ATTR);
      }
      input.required=true;
      input.disabled=false;
      input.readOnly=false;
      input.style.pointerEvents='auto';
      input.style.position='relative';
      input.style.zIndex='20';
      input.style.opacity='1';
      input.style.touchAction='manipulation';
      if(!input.min)input.min=localToday();
    }else if(requestType==='STANDARD'||requestType==='URGENT'){
      // Keep React step validation satisfied without exposing or persisting a date.
      if(!input.value){
        input.setAttribute(SYNTHETIC_DATE_ATTR,'true');
        setNativeInputValue(input,localToday());
      }
      input.required=false;
      field.hidden=true;
      field.setAttribute('aria-hidden','true');
    }
  }

  // Review screen: preferred date is meaningful only for Scheduled requests.
  document.querySelectorAll<HTMLElement>('.c3ReviewRow').forEach(row=>{
    const label=(row.querySelector('span')?.textContent||'').trim().toLowerCase();
    if(label.includes('preferred')&&label.includes('date')){
      row.hidden=requestType==='STANDARD'||requestType==='URGENT';
    }
  });

  // Request/provider/admin detail screens: suppress a preferred-date field for non-scheduled jobs.
  const pageText=(document.body.textContent||'').toUpperCase();
  const clearlyNonScheduled=/\bSTANDARD\b/.test(pageText)||/\bURGENT\b/.test(pageText);
  const clearlyScheduled=/\bSCHEDULED\b/.test(pageText)||/\bSCHEDULE\b/.test(pageText);
  if(clearlyNonScheduled&&!clearlyScheduled){
    document.querySelectorAll<HTMLElement>('div,li,tr,section').forEach(node=>{
      const directText=[...node.children].map(child=>(child.textContent||'').trim()).join(' ');
      const own=(node.textContent||'').trim();
      if((/preferred date/i.test(directText)||/^preferred date\b/i.test(own))&&own.length<160){
        node.hidden=true;
      }
    });
  }
}

export default function PreferredDateRuntime(){
  useEffect(()=>{
    const sync=()=>hidePreferredDateOutsideScheduled();
    sync();

    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',sync,true);
    document.addEventListener('change',sync,true);

    const originalFetch=window.fetch.bind(window);
    window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(url.includes(SUBMIT_REQUEST_FRAGMENT)&&typeof init?.body==='string'){
        try{
          const payload=JSON.parse(init.body) as Record<string,unknown>;
          const urgency=String(payload.urgency||'').toUpperCase();
          if(urgency!=='SCHEDULE')payload.preferredDate=null;
          init={...init,body:JSON.stringify(payload)};
        }catch{}
      }
      return originalFetch(input,init);
    };

    return()=>{
      observer.disconnect();
      document.removeEventListener('click',sync,true);
      document.removeEventListener('change',sync,true);
      window.fetch=originalFetch;
    };
  },[]);

  return null;
}
