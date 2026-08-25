'use client';

import { useEffect } from 'react';

const FILTERS=[
 {key:'all',label:'All'},
 {key:'repair',label:'Repairs'},
 {key:'tech',label:'Tech'},
 {key:'install',label:'Install'},
 {key:'home',label:'Home care'},
] as const;

function classify(name:string){
 const v=name.toLowerCase();
 if(/cctv|network|wi-?fi|internet|computer|camera|tech/.test(v))return'tech';
 if(/install|assembly|aluminium|aluminum|glass|furniture|appliance/.test(v))return'install';
 if(/clean|moving|loading|painting/.test(v))return'home';
 return'repair';
}

export default function ServicePickerUXRuntime(){
 useEffect(()=>{
  let search='';
  let filter='all';
  let scheduled=false;

  const apply=()=>{
   scheduled=false;
   const grid=document.querySelector('.c3Wizard .c3ServiceGrid') as HTMLElement|null;
   if(!grid)return;
   grid.dataset.mobileFriendlyPicker='true';
   let toolbar=grid.parentElement?.querySelector(':scope > [data-service-picker-ux="true"]') as HTMLElement|null;
   if(!toolbar){
    toolbar=document.createElement('div');
    toolbar.dataset.servicePickerUx='true';
    toolbar.className='servicePickerUX';
    toolbar.innerHTML=`<label class="servicePickerUXSearch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg><input type="search" placeholder="Search services" autocomplete="off" aria-label="Search services"/></label><div class="servicePickerUXFilters" role="group" aria-label="Service categories">${FILTERS.map(x=>`<button type="button" data-picker-filter="${x.key}" class="${x.key==='all'?'active':''}">${x.label}</button>`).join('')}</div><p class="servicePickerUXEmpty" hidden>No matching services.</p>`;
    grid.parentElement?.insertBefore(toolbar,grid);
    const input=toolbar.querySelector('input') as HTMLInputElement|null;
    input?.addEventListener('input',()=>{search=input.value.trim().toLowerCase();schedule();});
    toolbar.querySelectorAll<HTMLButtonElement>('[data-picker-filter]').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.pickerFilter||'all';toolbar?.querySelectorAll('[data-picker-filter]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');schedule();}));
   }

   const buttons=Array.from(grid.querySelectorAll(':scope > button')) as HTMLButtonElement[];
   buttons.forEach(button=>{
    const label=(button.querySelector('strong')?.textContent||button.textContent||'').trim();
    const category=classify(label);
    button.dataset.pickerCategory=category;
    button.hidden=!((!search||label.toLowerCase().includes(search))&&(filter==='all'||filter===category));
   });
   const empty=toolbar.querySelector('.servicePickerUXEmpty') as HTMLElement|null;
   if(empty)empty.hidden=buttons.some(x=>!x.hidden);
  };

  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(apply);};
  apply();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 return null;
}
