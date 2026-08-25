'use client';

import { useEffect } from 'react';

const OTHER_LABEL='or describe your own issue';
const FIELD_ID='ac-custom-issue-field';
const PREFIX='AC issue: ';

function textOf(element:Element|null){
 return (element?.textContent||'').trim().toLowerCase();
}

export default function ACCustomIssueRuntime(){
 useEffect(()=>{
  let ownIssue='';
  let ownIssueSelected=false;

  function otherChip(){
   return Array.from(document.querySelectorAll<HTMLButtonElement>('.c3Subchips button')).find(button=>textOf(button)===OTHER_LABEL)||null;
  }

  function placeSubcategoriesBelowSelectedCategory(){
   const chips=document.querySelector<HTMLElement>('.c3Subchips');
   const selectedTile=document.querySelector<HTMLButtonElement>('.c3WizardCard .c3ServiceGrid .c3ServiceTile.selected');
   if(!chips||!selectedTile)return;
   if(chips.previousElementSibling!==selectedTile)selectedTile.insertAdjacentElement('afterend',chips);
   chips.style.gridColumn='1 / -1';
   chips.style.width='100%';
   chips.style.marginTop='0';
   chips.style.marginBottom='8px';
  }

  function updateContinue(){
   const field=document.getElementById(FIELD_ID);
   if(!field)return;
   const continueButton=Array.from(document.querySelectorAll<HTMLButtonElement>('.c3ActionDock button')).find(button=>textOf(button)==='continue');
   if(continueButton)continueButton.disabled=!ownIssue.trim();
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
  }

  const observer=new MutationObserver(()=>queueMicrotask(sync));
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',sync,true);
  sync();
  return()=>{observer.disconnect();document.removeEventListener('click',sync,true);document.getElementById(FIELD_ID)?.remove();};
 },[]);
 return null;
}
