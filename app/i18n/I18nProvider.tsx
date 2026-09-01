'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import dv from './dv.json';

export type AppLanguage='en'|'dv';
export type TranslationKey=keyof typeof en;
type Dictionary=Record<TranslationKey,string>;

type I18nContextValue={
  language:AppLanguage;
  direction:'ltr'|'rtl';
  setLanguage:(language:AppLanguage)=>void;
  t:(key:TranslationKey)=>string;
};

const STORAGE_KEY='fixit:language';
const dictionaries:Record<AppLanguage,Dictionary>={en,dv};
const I18nContext=createContext<I18nContextValue|null>(null);

function normalizeLanguage(value:unknown):AppLanguage{return value==='dv'?'dv':'en';}

function applyDocumentLanguage(language:AppLanguage){
  const root=document.documentElement;
  root.lang=language;
  root.dir=language==='dv'?'rtl':'ltr';
  root.dataset.language=language;
  root.classList.toggle('ifix-rtl',language==='dv');
}

export default function I18nProvider({children}:{children:React.ReactNode}){
  const[language,setLanguageState]=useState<AppLanguage>('en');

  useEffect(()=>{
    let initial:AppLanguage='en';
    try{initial=normalizeLanguage(localStorage.getItem(STORAGE_KEY));}catch{}
    setLanguageState(initial);
    applyDocumentLanguage(initial);
  },[]);

  const setLanguage=useCallback((next:AppLanguage)=>{
    const normalized=normalizeLanguage(next);
    setLanguageState(normalized);
    applyDocumentLanguage(normalized);
    try{localStorage.setItem(STORAGE_KEY,normalized);}catch{}
    window.dispatchEvent(new CustomEvent('fixit:language-change',{detail:{language:normalized}}));
  },[]);

  const t=useCallback((key:TranslationKey)=>dictionaries[language][key]??dictionaries.en[key]??String(key),[language]);
  const value=useMemo<I18nContextValue>(()=>({language,direction:language==='dv'?'rtl':'ltr',setLanguage,t}),[language,setLanguage,t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(){
  const context=useContext(I18nContext);
  if(!context)throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
