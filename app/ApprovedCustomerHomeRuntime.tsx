'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function serviceKey(name:string){
  const value=name.trim().toLowerCase();
  if(value.includes('ac ')||value==='ac services'||value.includes('air condition'))return 'ac';
  if(value.includes('plumb'))return 'plumbing';
  if(value.includes('electric'))return 'electrical';
  if(value.includes('carpent'))return 'carpentry';
  if(value.includes('paint'))return 'painting';
  if(value.includes('clean'))return 'cleaning';
  return 'other';
}

/**
 * Applies only non-destructive presentation hooks to the customer Home screen.
 * React must remain the sole owner of Home/service-tile DOM structure so that
 * switching from Home to the request wizard cannot race an imperative DOM edit.
 */
export default function ApprovedCustomerHomeRuntime(){
  const path=usePathname()||'/';

  useEffect(()=>{
    document.body.classList.remove('approvedCustomerHomeActive');
    if(path!=='/'&&path!=='/home')return;

    let frame=0;

    const sync=()=>{
      frame=0;
      const home=document.querySelector<HTMLElement>('.c3Home');
      const active=Boolean(home);
      document.body.classList.toggle('approvedCustomerHomeActive',active);
      if(!home)return;

      home.classList.add('approvedCustomerHome');
      home.querySelector<HTMLElement>('.c3Welcome')?.classList.add('approvedHomeHero');
      home.querySelector<HTMLButtonElement>('.c3Welcome .c3Primary')?.classList.add('approvedCreateButton');

      const serviceSection=home.querySelector<HTMLElement>('.c3Section');
      serviceSection?.classList.add('approvedServicesSection');
      const grid=serviceSection?.querySelector<HTMLElement>('.c3ServiceGrid');
      if(grid){
        grid.id='all-services';
        grid.querySelectorAll<HTMLButtonElement>('.c3ServiceTile').forEach(tile=>{
          const name=(tile.querySelector<HTMLElement>('strong')?.textContent||'').trim();
          tile.dataset.approvedService=serviceKey(name);
          const copy=tile.querySelector<HTMLElement>('span');
          copy?.classList.add('approvedServiceCopy');
        });
      }

      const globalHeader=document.querySelector<HTMLElement>('.globalMenuHeader[aria-label="Customer navigation"]');
      globalHeader?.classList.add('approvedCustomerHeader');
      globalHeader?.querySelector<HTMLElement>('.globalMenuSecondary')?.classList.add('approvedNotificationButton');
      globalHeader?.querySelector<HTMLElement>('.globalMenuToggle')?.classList.add('approvedHomeMenuHidden');
    };

    const schedule=()=>{
      if(frame)return;
      frame=window.requestAnimationFrame(sync);
    };

    sync();
    const root=document.getElementById('main-content')||document.body;
    const observer=new MutationObserver(schedule);
    observer.observe(root,{childList:true,subtree:true});

    return()=>{
      observer.disconnect();
      if(frame)window.cancelAnimationFrame(frame);
      document.body.classList.remove('approvedCustomerHomeActive');
    };
  },[path]);

  return null;
}
