'use client';

import { useEffect } from 'react';

const DRAFT_KEY='fixit:create-draft';

function normalizeSavedDraft(){
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(!raw)return;
    const draft=JSON.parse(raw);
    let changed=false;

    if(String(draft?.urgency||'').toUpperCase()==='SCHEDULE'){
      draft.urgency='STANDARD';
      changed=true;
    }

    if('preferredDate' in draft){
      delete draft.preferredDate;
      changed=true;
    }

    if(changed)localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));
  }catch{
    // A corrupt local draft should never block a new request.
    localStorage.removeItem(DRAFT_KEY);
  }
}

function removeObsoleteScheduleUi(){
  document.querySelectorAll<HTMLButtonElement>('.c3Urgency button').forEach(button=>{
    const text=(button.textContent||'').trim().toUpperCase();
    if(text.includes('SCHEDULE')){
      button.disabled=true;
      button.hidden=true;
      button.setAttribute('aria-hidden','true');
      button.tabIndex=-1;
    }
  });

  document.querySelectorAll<HTMLInputElement>(".c3Field input[type='date']").forEach(input=>{
    const field=input.closest<HTMLElement>('.c3Field');
    input.required=false;
    input.disabled=true;
    input.value='';
    if(field){
      field.hidden=true;
      field.setAttribute('aria-hidden','true');
    }
  });

  document.querySelectorAll<HTMLElement>('.c3ReviewRow').forEach(row=>{
    const label=(row.querySelector('span')?.textContent||'').trim().toLowerCase();
    if((label.includes('preferred')&&label.includes('date'))||label.includes('scheduled date')){
      row.hidden=true;
    }
  });
}

export default function PreferredDateRuntime(){
  useEffect(()=>{
    normalizeSavedDraft();

    const sync=()=>removeObsoleteScheduleUi();
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
