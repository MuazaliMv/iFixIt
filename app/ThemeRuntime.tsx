'use client';

import { useEffect } from 'react';

const CONFIG_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/public-config';

const cssMap:Record<string,string>={
 surface:'--surface',surfaceAlt:'--surface-alt',page:'--page-bg',text:'--text',muted:'--muted',line:'--line',brand:'--brand',brandSoft:'--brand-soft',success:'--success',warning:'--warning',danger:'--danger',radiusSm:'--radius-sm',radiusMd:'--radius-md',radiusLg:'--radius-lg',shadow:'--shadow-card'
};

export default function ThemeRuntime(){
 useEffect(()=>{let alive=true;void fetch(CONFIG_URL,{method:'GET'}).then(r=>r.json()).then(p=>{if(!alive||!p?.theme)return;const root=document.documentElement;for(const[key,cssVar]of Object.entries(cssMap)){const value=p.theme[key];if(value===undefined||value===null)continue;root.style.setProperty(cssVar,typeof value==='number'?`${value}px`:String(value));}}).catch(()=>{});return()=>{alive=false;};},[]);
 return null;
}
