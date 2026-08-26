'use client';

import { useEffect } from 'react';

const OTHER_LABEL='or describe your own issue';
const FIELD_ID='ac-custom-issue-field';
const STATUS_ID='service-selection-status';
const PREFIX='AC issue: ';

function textOf(element:Element|null){
 return (element?.textContent||'').trim().toLowerCase();
}

export default function ACCustomIssueRuntime(){
 useEffect(()=>{
  let ownIssue='';
  let ownIssueSelected=false;

  function subcategoryButtons(){
   return Array.from(document.querySelectorAll<HTMLButtonElement>('.c3Subchips button'));
  }

  function otherChip(){
   return subcategoryButtons().find(button=>textOf(button).includes(OTHER_LABEL))||null;
  }

  function selectedCategory(){
   return document.querySelector<HTMLButtonElement>('.c3WizardCard .c3ServiceGrid .c3ServiceTile.selected');
  }

  function selectedSubcategory(){
   return subcategoryButtons().find(button=>button.classList.contains('selected'))||null;
  }

  function continueButton(){
   return Array.from(document.querySelectorAll<HTMLButtonElement>('.c3ActionDock button')).find(button=>textOf(button)==='continue')||null;
  }

  function placeSubcategoriesBelowSelectedCategory(){
   const chips=document.querySelector<HTMLElement>('.c3Subchips');
   const selectedTile=selectedCategory();
   if(!chips||!selectedTile)return;
   if(chips.previousElementSibling!==selectedTile)selectedTile.insertAdjacentElement('afterend',chips);
   chips.style.gridColumn='1 / -1';
   chips.style.width='100%';
   chips.style.marginTop='0';
   chips.style.marginBottom='8px';
  }

  function ensureStatus(){
   const dock=document.querySelector<HTMLElement>('.c3ActionDock .c3ActionInner');
   if(!dock)return null;
   let status=document.getElementById(STATUS_ID) as HTMLDivElement|null;
   if(status)return status;
   status=document.createElement('div');
   status.id=STATUS_ID;
   status.setAttribute('role','status');
   status.setAttribute('aria-live','polite');
   status.style.gridColumn='1 / -1';
   status.style.fontSize='12px';
   status.style.fontWeight='700';
   status.style.lineHeight='1.35';
   status.style.color='var(--c3-muted, #667085)';
   status.style.padding='0 2px 2px';
   dock.prepend(status);
   return status;
  }

  function updateContinue(){
   const button=continueButton();
   if(!button)return;
   const category=selectedCategory();
   const children=subcategoryButtons();
   const subcategory=selectedSubcategory();
   const field=document.querySelector<HTMLInputElement>(`#${FIELD_ID} input`);
   const customValid=!ownIssueSelected||Boolean(field?.value.trim()||ownIssue.trim());
   const selectionComplete=Boolean(category)&&(children.length===0||Boolean(subcategory));
   const ready=selectionComplete&&customValid;
   const disabled=!ready;

   // This component observes the disabled attribute below. Rewriting the same
   // reflected property on every observer pass can schedule another mutation
   // indefinitely and starve the browser main thread (especially in WebKit).
   // Only mutate the DOM when the state actually changes.
   if(button.disabled!==disabled)button.disabled=disabled;
   if(disabled){
    if(button.getAttribute('aria-disabled')!=='true')button.setAttribute('aria-disabled','true');
   }else if(button.hasAttribute('aria-disabled')){
    button.removeAttribute('aria-disabled');
   }
   button.title=ready?'Continue to service location':!category?'Select a service first':children.length&&!subcategory?'Select a service type first':'Describe your issue first';

   const status=ensureStatus();
   if(!status)return;
   const statusText=!category?'Select a service to continue.'
    :children.length&&!subcategory?'Now select a service type.'
    :ownIssueSelected&&!customValid?'Describe your issue to continue.'
    :'Selection complete. Continue to choose the service location.';
   if(status.textContent!==statusText)status.textContent=statusText;
   status.style.color=ready?'var(--c3-green, #14915b)':'var(--c3-muted, #667085)';
  }

  function injectField(){
   const chips=document.querySelector<HTMLElement>('.c3Subchips');
   if(!chips||document.getElementById(FIELD_ID))return;
   const wrapper=document.createElement('label');
   wrapper.id=FIELD_ID;
   wrapper.className='c3Field full';
   wrapper.style.display='grid';
   wrapper.style.gap='8px';
   wrapper.style.marginTop='14px';
   wrapper.textContent='Describe your issue';

   const input=document.createElement('input');
   input.type='text';
   input.maxLength=30;
   input.value=ownIssue;
   input.placeholder='Enter up to 30 characters';
   input.setAttribute('aria-label','Describe your AC issue');
   input.setAttribute('aria-describedby','ac-custom-issue-count');

   const count=document.createElement('small');
   count.id='ac-custom-issue-count';
   count.style.color='var(--c3-muted, #667085)';
   count.style.fontWeight='500';
   count.textContent=`${ownIssue.length}/30`;

   input.addEventListener('input',()=>{
    ownIssue=input.value.slice(0,30);
    if(input.value!==ownIssue)input.value=ownIssue;
    count.textContent=`${ownIssue.length}/30`;
    updateContinue();
   });

   wrapper.append(input,count);
   chips.insertAdjacentElement('afterend',wrapper);
   queueMicrotask(()=>input.focus({preventScroll:true}));
   updateContinue();
  }

  function applyToProblemField(){
   if(!ownIssueSelected||!ownIssue.trim())return;
   const textarea=document.querySelector<HTMLTextAreaElement>('.c3WizardCard .c3Form textarea');
   if(!textarea)return;
   const nextLine=`${PREFIX}${ownIssue.trim()}`;
   const current=textarea.value||'';
   const lines=current.split('\n');
   const next=lines[0]?.startsWith(PREFIX)?[nextLine,...lines.slice(1)].join('\n'):(current.trim()?`${nextLine}\n${current}`:nextLine);
   if(next===current)return;
   const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;
   if(setter)setter.call(textarea,next);else textarea.value=next;
   textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function sync(){
   placeSubcategoriesBelowSelectedCategory();
   const chip=otherChip();
   const selected=Boolean(chip?.classList.contains('selected'));
   if(selected){
    ownIssueSelected=true;
    injectField();
   }else{
    if(ownIssueSelected&&chip)ownIssue='';
    ownIssueSelected=false;
    document.getElementById(FIELD_ID)?.remove();
   }
   applyToProblemField();
   updateContinue();
  }

  const observer=new MutationObserver(()=>queueMicrotask(sync));
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});
  document.addEventListener('click',sync,true);
  sync();
  return()=>{
   observer.disconnect();
   document.removeEventListener('click',sync,true);
   document.getElementById(FIELD_ID)?.remove();
   document.getElementById(STATUS_ID)?.remove();
  };
 },[]);
 return null;
}
