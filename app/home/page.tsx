'use client';

import { useEffect } from 'react';
import CustomerPortal from '../CustomerPortal';

export default function CustomerHomePage() {
  useEffect(()=>{
    const shouldOpen=new URLSearchParams(window.location.search).get('new')==='1';
    if(!shouldOpen)return;
    let attempts=0;
    const openWizard=()=>{
      const button=document.querySelector<HTMLButtonElement>('.c3Welcome .c3Primary');
      if(button){button.click();return;}
      attempts+=1;
      if(attempts<30)window.setTimeout(openWizard,100);
    };
    openWizard();
  },[]);
  return <CustomerPortal />;
}
