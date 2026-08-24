'use client';

import { useEffect } from 'react';

const FILTERS=[
 {key:'all',label:'All'},
 {key:'home',label:'Home & Repair'},
 {key:'tech',label:'Tech & Wi-Fi'},
 {key:'installation',label:'Installation'},
 {key:'cleaning',label:'Cleaning'},
] as const;

function classifyService(name:string){
 const value=name.toLowerCase();
 if(/cctv|network|wi-?fi|internet|computer|tech|camera/.test(value))return'tech';
 if(/install|assembly|aluminium|aluminum|glass|furniture|appliance/.test(value))return'installation';
 if(/clean|moving|loading|painting/.test(value))return'cleaning';
 return'home';
}

export default function NewRequestRuntime(){
 useEffect(()=>{
  function isNewRequestUrl(url:URL){return url.pathname==='/'&&url.searchParams.get('new')==='1';}
  function redirect(url:URL){window.location.assign(`/home?new=1${url.hash||''}`);}
  const current=new URL(window.location.href);
  if(isNewRequestUrl(current)){redirect(current);return;}

  let searchQuery='';
  let activeFilter='all';
  let applying=false;

  function applyServiceFilter(){
   if(applying)return;
   const grid=document.querySelector('.c3Wizard .c3ServiceGrid') as HTMLElement|null;
   const toolbar=document.querySelector('[data-apple-service-toolbar="true"]') as HTMLElement|null;
   if(!grid||!toolbar)return;
   applying=true;
   try{
    const buttons=Array.from(grid.querySelectorAll(':scope > button')) as HTMLButtonElement[];
    buttons.forEach(button=>{
     const name=(button.querySelector('strong')?.textContent||button.textContent||'').trim();
     const category=classifyService(name);
     const matchesSearch=!searchQuery||name.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesFilter=activeFilter==='all'||category===activeFilter;
     button.hidden=!(matchesSearch&&matchesFilter);
     button.dataset.serviceCategory=category;
    });
    const empty=toolbar.querySelector('[data-service-empty]') as HTMLElement|null;
    if(empty)empty.hidden=buttons.some(button=>!button.hidden);
   }finally{applying=false;}
  }

  function installServiceToolbar(){
   const wizard=document.querySelector('.c3Wizard');
   const grid=wizard?.querySelector('.c3ServiceGrid') as HTMLElement|null;
   if(!wizard||!grid)return;
   const question=grid.previousElementSibling;
   if(!question?.classList.contains('c3Question'))return;

   let toolbar=wizard.querySelector('[data-apple-service-toolbar="true"]') as HTMLElement|null;
   if(!toolbar){
    toolbar=document.createElement('div');
    toolbar.className='appleServiceToolbar';
    toolbar.dataset.appleServiceToolbar='true';
    toolbar.innerHTML=`
      <label class="appleServiceSearch" aria-label="Search services">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>
        <input type="search" placeholder="Search services..." autocomplete="off" />
      </label>
      <div class="appleServiceFilters" role="group" aria-label="Service categories">
        ${FILTERS.map(filter=>`<button type="button" data-service-filter="${filter.key}" class="${filter.key==='all'?'active':''}">${filter.label}</button>`).join('')}
      </div>
      <div class="appleServiceEmpty" data-service-empty hidden>No services found matching your search.</div>
    `;
    grid.parentElement?.insertBefore(toolbar,grid);
    const input=toolbar.querySelector('input') as HTMLInputElement|null;
    input?.addEventListener('input',()=>{searchQuery=input.value.trim();applyServiceFilter();});
    toolbar.querySelectorAll<HTMLButtonElement>('[data-service-filter]').forEach(button=>{
     button.addEventListener('click',()=>{
      activeFilter=button.dataset.serviceFilter||'all';
      toolbar?.querySelectorAll('[data-service-filter]').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      applyServiceFilter();
     });
    });
   }
   applyServiceFilter();
  }

  installServiceToolbar();
  const observer=new MutationObserver(()=>installServiceToolbar());
  observer.observe(document.body,{childList:true,subtree:true});

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
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true);};
 },[]);
 return null;
}
