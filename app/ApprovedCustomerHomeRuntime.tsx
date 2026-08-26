'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const serviceCopy:Record<string,string>={
  'ac services':'Cooling solutions',
  'air conditioning':'Cooling solutions',
  'plumbing':'Pipes & leaks',
  'electrical':'Wiring & repairs',
  'carpentry':'Woodwork & fixes',
  'painting':'Interior & exterior',
  'cleaning':'Home & office',
};

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

function decorate(){
  const home=document.querySelector<HTMLElement>('.c3Home');
  if(!home)return false;
  home.classList.add('approvedCustomerHome');

  const hero=home.querySelector<HTMLElement>('.c3Welcome');
  if(hero){
    hero.classList.add('approvedHomeHero');
    const eyebrow=hero.querySelector<HTMLElement>('small');
    if(eyebrow)eyebrow.textContent='FIXIT MALDIVES';
    const heading=hero.querySelector<HTMLElement>('h1');
    if(heading){
      const original=heading.textContent||'';
      const match=original.match(/(?:Hi|Hello)\s+([^,]+?)(?:,|\s+what|$)/i);
      const first=(match?.[1]||'there').trim();
      heading.textContent=`Hello ${first} 👋`;
    }
    const paragraph=hero.querySelector<HTMLElement>('p');
    if(paragraph)paragraph.innerHTML='What can we help you fix today?<br/><span>Trusted local experts. Fast response.</span>';
    const primary=hero.querySelector<HTMLButtonElement>('.c3Primary');
    if(primary){
      primary.innerHTML='<span class="approvedPlus" aria-hidden="true">＋</span><span>Create a request</span>';
      primary.classList.add('approvedCreateButton');
    }
    if(!hero.querySelector('.approvedRequestsLink')){
      const link=document.createElement('a');
      link.className='approvedRequestsLink';
      link.href='/requests';
      link.innerHTML='<span>View my requests</span><span aria-hidden="true">→</span>';
      hero.appendChild(link);
    }
  }

  const serviceSection=home.querySelector<HTMLElement>('.c3Section');
  if(serviceSection){
    serviceSection.classList.add('approvedServicesSection');
    const head=serviceSection.querySelector<HTMLElement>('.c3SectionHead');
    if(head){
      const small=head.querySelector<HTMLElement>('small');
      if(small)small.remove();
      const title=head.querySelector<HTMLElement>('h2');
      if(title)title.textContent='Popular Services';
      const desc=head.querySelector<HTMLElement>('p');
      if(desc)desc.remove();
      if(!head.querySelector('.approvedViewAll')){
        const link=document.createElement('a');
        link.className='approvedViewAll';
        link.href='#all-services';
        link.textContent='View all';
        head.appendChild(link);
      }
    }
    const grid=serviceSection.querySelector<HTMLElement>('.c3ServiceGrid');
    if(grid){
      grid.id='all-services';
      const tiles=[...grid.querySelectorAll<HTMLButtonElement>('.c3ServiceTile')];
      tiles.forEach(tile=>{
        const title=tile.querySelector<HTMLElement>('strong');
        const name=(title?.textContent||'').trim();
        const key=serviceKey(name);
        tile.dataset.approvedService=key;
        const existing=tile.querySelector<HTMLElement>('span');
        const copy=serviceCopy[name.toLowerCase()]||(
          key==='ac'?'Cooling solutions':key==='plumbing'?'Pipes & leaks':key==='electrical'?'Wiring & repairs':key==='carpentry'?'Woodwork & fixes':key==='painting'?'Interior & exterior':key==='cleaning'?'Home & office':'Tap to request'
        );
        if(existing){existing.textContent=copy;existing.classList.add('approvedServiceCopy');}
      });
    }
    if(!serviceSection.nextElementSibling?.classList.contains('approvedOtherIssue')&&!home.querySelector('.approvedOtherIssue')){
      const card=document.createElement('button');
      card.type='button';
      card.className='approvedOtherIssue';
      card.innerHTML='<span class="approvedOtherIcon" aria-hidden="true">▤</span><span class="approvedOtherText"><strong>Need something else?</strong><small>Describe your issue in your request</small></span><span class="approvedOtherArrow" aria-hidden="true">›</span>';
      card.addEventListener('click',()=>document.querySelector<HTMLButtonElement>('.approvedCreateButton')?.click());
      serviceSection.insertAdjacentElement('afterend',card);
    }
  }

  const globalHeader=document.querySelector<HTMLElement>('.globalMenuHeader[aria-label="Customer navigation"]');
  if(globalHeader){
    globalHeader.classList.add('approvedCustomerHeader');
    const secondary=globalHeader.querySelector<HTMLAnchorElement>('.globalMenuSecondary');
    if(secondary){
      secondary.href='/notifications';
      secondary.setAttribute('aria-label','Notifications');
      secondary.classList.add('approvedNotificationButton');
      secondary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="approvedNotificationBadge">2</span>';
    }
    const toggle=globalHeader.querySelector<HTMLElement>('.globalMenuToggle');
    if(toggle)toggle.classList.add('approvedHomeMenuHidden');
  }

  document.body.classList.add('approvedCustomerHomeActive');
  return true;
}

export default function ApprovedCustomerHomeRuntime(){
  const path=usePathname()||'/';
  useEffect(()=>{
    document.body.classList.remove('approvedCustomerHomeActive');
    if(path!=='/'&&path!=='/home')return;
    if(decorate())return;
    const observer=new MutationObserver(()=>{if(decorate())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[path]);
  return null;
}
