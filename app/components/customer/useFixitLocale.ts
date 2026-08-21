'use client';

import { useEffect, useMemo, useState } from 'react';

export type FixitLanguage='en'|'dv';

const COPY={
 home:{en:'Home',dv:'މައި ޞަފްޙާ'},newRequest:{en:'New Request',dv:'އައު ރިކުއެސްޓް'},fixitMaldives:{en:'FixIt Maldives',dv:'ފިކްސްއިޓް މޯލްޑިވްސް'},
 hi:{en:'Hi',dv:'މަރުހަބާ'},whatNeedsFixing:{en:'what needs fixing?',dv:'ކޮން ކަމެއް ރަނގަޅުކުރަން ޖެހެނީ؟'},intro:{en:'Tell us what you need. Local providers who match the service and area can respond.',dv:'ކޮން ޚިދުމަތެއް ބޭނުންކަން ބުނެލާ. ޚިދުމަތާއި ސަރަހައްދާ ގުޅޭ ލޯކަލް ޕްރޮވައިޑަރުން ޖަވާބު ދެވޭނެ.'},
 createRequest:{en:'Create a request',dv:'ރިކުއެސްޓެއް ހަދާ'},services:{en:'Services',dv:'ޚިދުމަތްތައް'},chooseNeed:{en:'Choose what you need',dv:'ބޭނުން ޚިދުމަތް ހޮވާ'},startWithService:{en:'Start with a service. You can add details in the next steps.',dv:'ފުރަތަމަ ޚިދުމަތެއް ހޮވާ. އިތުރު ތަފްޞީލު ދެން އޮތް ފިޔަވަޅުތަކުގައި ލިޔެވޭނެ.'},
 startRequest:{en:'Start request',dv:'ފަށާ'},latestRequest:{en:'Latest request',dv:'އެންމެ ފަހުގެ ރިކުއެސްޓް'},pickUp:{en:'Pick up where you left off',dv:'ދޫކޮށްލެވުނު ތަނުން އަލުން ފަށާ'},allRequests:{en:'All requests',dv:'ހުރިހާ ރިކުއެސްޓްތައް'},open:{en:'Open',dv:'ހުޅުވާ'},signOut:{en:'Sign out',dv:'ލޮގްއައުޓް'},
 step:{en:'Step',dv:'ފިޔަވަޅު'},of:{en:'of',dv:'ގެ'},service:{en:'Service',dv:'ޚިދުމަތް'},whatHelp:{en:'What do you need help with?',dv:'ކޮން ކަމަކުން އެހީ ބޭނުން؟'},chooseServiceType:{en:'Choose one service and, when available, the type of work.',dv:'ޚިދުމަތެއް ހޮވައި، ހުރި ނަމަ މަސައްކަތުގެ ބާވަތް ވެސް ހޮވާ.'},choose:{en:'Choose',dv:'ހޮވާ'},selected:{en:'Selected',dv:'ހޮވިފައި'},
 location:{en:'Location',dv:'ތަން'},whereJob:{en:'Where is the job?',dv:'މަސައްކަތް ކުރާ ތަން ކޮބައި؟'},locationHelp:{en:'Choose the island or city. You can use your current location to speed this up.',dv:'ރަށް ނުވަތަ ސިޓީ ހޮވާ. އަވަހަށް ހަދަން ތިބާގެ މިހާރުގެ ލޮކޭޝަން ބޭނުންކުރެވޭނެ.'},atoll:{en:'Atoll',dv:'އަތޮޅު'},selectAtoll:{en:'Select atoll',dv:'އަތޮޅެއް ހޮވާ'},islandCity:{en:'Island / City',dv:'ރަށް / ސިޓީ'},selectIsland:{en:'Select island or city',dv:'ރަށެއް ނުވަތަ ސިޓީއެއް ހޮވާ'},wardArea:{en:'Ward / Area',dv:'އަވަށް / ސަރަހައްދު'},optional:{en:'optional',dv:'އިޚްތިޔާރީ'},wholeIsland:{en:'Whole island / city',dv:'މުޅި ރަށް / ސިޓީ'},useLocation:{en:'Use my location',dv:'މަގޭ ލޮކޭޝަން ބޭނުންކުރޭ'},findingLocation:{en:'Finding location…',dv:'ލޮކޭޝަން ހޯދަނީ…'},
 problem:{en:'Problem',dv:'މައްސަލަ'},showWrong:{en:'Show us what’s wrong.',dv:'މައްސަލަ ކޮބައިތޯ ބުނެލާ.'},problemHelp:{en:'A short description and clear photos help providers understand the job before they respond.',dv:'ކުރު ތަފްޞީލެއް އަދި ސާފު ފޮޓޯތަކުން ޕްރޮވައިޑަރަށް މަސައްކަތް ރަނގަޅަށް ދޭހަވާނެ.'},whatProblem:{en:'What is the problem?',dv:'މައްސަލަ ކޮބައި؟'},anythingElse:{en:'Anything else?',dv:'އިތުރަށް ކަމެއް ހުރިތޯ؟'},addPhotos:{en:'Add photos',dv:'ފޮޓޯ އިތުރުކުރޭ'},
 schedule:{en:'Schedule',dv:'ސެޑިއުލް'},whenHelp:{en:'When do you need help?',dv:'އެހީ ބޭނުންވަނީ ކޮން އިރަކު؟'},scheduleHelp:{en:'Choose urgency and a preferred date. The provider can confirm the exact inspection time later.',dv:'އަވަސްކަމާއި ބޭނުން ތާރީޚު ހޮވާ. އިންސްޕެކްޝަން ޓައިމް ޕްރޮވައިޑަރު ފަހުން ޔަގީންކުރާނެ.'},urgent:{en:'Urgent',dv:'އަވަސް'},asap:{en:'As soon as possible',dv:'އެންމެ އަވަހަށް'},standard:{en:'Standard',dv:'ސްޓޭންޑަޑް'},normalSchedule:{en:'Normal scheduling',dv:'އާންމު ސެޑިއުލް'},scheduled:{en:'Scheduled',dv:'ސެޑިއުލްކޮށް'},usePreferred:{en:'Use my preferred date',dv:'މަގޭ ބޭނުން ތާރީޚު ބޭނުންކުރޭ'},preferredDate:{en:'Preferred date',dv:'ބޭނުން ތާރީޚު'},
 review:{en:'Review',dv:'ރިވިއު'},readySend:{en:'Ready to send?',dv:'ފޮނުވަން ތައްޔާރު؟'},reviewHelp:{en:'Check the essentials. Providers who match the service and area can then respond.',dv:'މުހިއްމު ތަފްޞީލުތައް ޗެކްކުރޭ. ދެން ޚިދުމަތާއި ސަރަހައްދާ ގުޅޭ ޕްރޮވައިޑަރުން ޖަވާބު ދެވޭނެ.'},urgency:{en:'Urgency',dv:'އަވަސްކަން'},photos:{en:'Photos',dv:'ފޮޓޯތައް'},attached:{en:'attached',dv:'ގުޅުވާފައި'},payment:{en:'Payment',dv:'ފައިސާ'},directProvider:{en:'Directly to provider',dv:'ސީދާ ޕްރޮވައިޑަރަށް'},uploading:{en:'Uploading photos…',dv:'ފޮޓޯ އަޕްލޯޑްކުރަނީ…'},cancel:{en:'Cancel',dv:'ކެންސަލް'},back:{en:'Back',dv:'ފަހަތަށް'},continue:{en:'Continue',dv:'ކުރިއަށް'},sendRequest:{en:'Send Request',dv:'ރިކުއެސްޓް ފޮނުވާ'},sending:{en:'Sending…',dv:'ފޮނުވަނީ…'},saveDraft:{en:'Save draft',dv:'ޑްރާފްޓް ސޭވްކުރޭ'},draftSaved:{en:'Draft saved',dv:'ޑްރާފްޓް ސޭވްވެއްޖެ'},profile:{en:'Profile',dv:'ޕްރޮފައިލް'},signIn:{en:'Sign in',dv:'ލޮގިން'}
} as const;

export type FixitCopyKey=keyof typeof COPY;

export function useFixitLocale(){
 const[language,setLanguageState]=useState<FixitLanguage>('en');
 useEffect(()=>{const saved=localStorage.getItem('fixit:language');setLanguageState(saved==='dv'?'dv':'en');},[]);
 const setLanguage=(next:FixitLanguage)=>{setLanguageState(next);localStorage.setItem('fixit:language',next);document.documentElement.lang=next;document.documentElement.dir=next==='dv'?'rtl':'ltr';};
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='dv'?'rtl':'ltr';},[language]);
 const t=useMemo(()=>((key:FixitCopyKey)=>COPY[key][language]),[language]);
 return{language,setLanguage,t,isDhivehi:language==='dv'};
}
