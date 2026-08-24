'use client';

import { useEffect, useState } from 'react';
import './landing.css';
import './landing-blue.css';
import './landing-mobile-services.css';

type Lang='en'|'dv';
type ServiceData=[string,string,string,string[]];

const copy={
 en:{
  nav:['Services','How it works','For providers'],signIn:'Sign in',request:'Request a service',eyebrow:'Maldives service marketplace',hero1:'Find trusted local help.',hero2:'Get it fixed.',heroText:'Find service providers across the Maldives for repairs, maintenance and everyday jobs — all from one simple place.',become:'Become a provider',trust:['Verified providers','Location matching','Ratings & reviews'],start:'START A REQUEST',needs:'What needs fixing?',live:'Live',service:'Service',chooseService:'Choose a service',location:'Location',chooseIsland:'Choose your island',continue:'Continue',fast:'Fast matching',fastText:'Reach suitable providers nearby',choose:'Choose confidently',chooseText:'See ratings before confirming',popular:'POPULAR SERVICES',servicesTitle:'Whatever needs doing, start with iFix.',servicesText:'From urgent repairs to planned maintenance, find the right local provider for the job.',how:'HOW IFIX WORKS',howTitle:'From problem to solved, without the runaround.',howText:'One simple request puts you in touch with providers who can actually help.',trustTitle:'BUILT FOR TRUST',know:'Know who you’re hiring.',trustText:'iFix is built around verified provider profiles, clear service areas, ratings and transparent request tracking.',verify:'Provider verification',verifyText:'Designed to make trust visible',features:['Provider identity and business verification','Ratings from completed service requests','Location-based provider matching','Request status from start to completion'],forProviders:'FOR SERVICE PROVIDERS',providerTitle:'More local jobs. Less time looking for them.',providerText:'Join iFix as an individual professional or registered business. Set your services and locations, then receive requests that match what you do.',providerBullets:['Choose the services you provide','Set the locations you cover','Build your reputation with ratings'],join:'Join as a provider',ready:'READY WHEN YOU ARE',needFixed:'Need something fixed?',finalText:'Tell us what you need. We’ll help you find the right local provider.',footer:'Local services. One simple place.',rights:'All rights reserved.'},
 dv:{
  nav:['ޚިދުމަތްތައް','ކިހިނެއް ކުރަނީ','ޕްރޮވައިޑަރުން'],signIn:'ސައިން އިން',request:'ޚިދުމަތެއް އެދޭ',eyebrow:'ދިވެހިރާއްޖޭގެ ޚިދުމަތް މާކެޓްޕްލޭސް',hero1:'އިތުބާރުހުރި ދިވެހި އެހީ ހޯދާ.',hero2:'މައްސަލަ ހައްލު ކުރާ.',heroText:'މަރާމާތު، މެއިންޓެނެންސް އަދި ދުވަހުން ދުވަހަށް ބޭނުންވާ މަސައްކަތްތަކަށް ދިވެހިރާއްޖޭގައި ޚިދުމަތްދޭ ފަރާތްތައް އެއް ތަނަކުން ހޯދާ.',become:'ޕްރޮވައިޑަރަކަށް ވާ',trust:['ވެރިފައިޑް ޕްރޮވައިޑަރުން','ތަނާ ގުޅޭ މެޗިންގ','ރޭޓިންގ އަދި ރިވިއު'],start:'ރިކުއެސްޓެއް ފަށާ',needs:'ކޮބައިތޯ ހައްދަން ޖެހެނީ؟',live:'ލައިވް',service:'ޚިދުމަތް',chooseService:'ޚިދުމަތެއް ހޮވާ',location:'ތަން',chooseIsland:'ރަށެއް ހޮވާ',continue:'ކުރިއަށް',fast:'އަވަސް މެޗިންގ',fastText:'ކައިރީގައި ހުރި މުނާސިބު ޕްރޮވައިޑަރުން ހޯދާ',choose:'އިތުބާރާއެކު ހޮވާ',chooseText:'ކަށަވަރު ކުރުމުގެ ކުރިން ރޭޓިންގ ބަލާ',popular:'މަޤްބޫލު ޚިދުމަތްތައް',servicesTitle:'ކޮންމެ މަސައްކަތަކަށްވެސް iFix އިން ފަށާ.',servicesText:'އަވަސް މަރާމާތުން ފެށިގެން ޕްލޭން ކުރެވިފައިވާ މެއިންޓެނެންސްއަށް، މުނާސިބު ޕްރޮވައިޑަރެއް ހޯދާ.',how:'IFIX ކިހިނެއް ކުރަނީ',howTitle:'މައްސަލައިން ހައްލަށް، ދަތިތަކެއް ނެތި.',howText:'އެއް ސާދާ ރިކުއެސްޓަކުން ތިބާއަށް އެހީވެދޭ ޕްރޮވައިޑަރުންނާ ގުޅުވައިދޭ.',trustTitle:'އިތުބާރަށް ބިނާކުރެވިފައި',know:'ތިބާ ހޮވަނީ ކާކުކަން ދަންނާ.',trustText:'iFix ބިނާކުރެވިފައިވަނީ ވެރިފައިޑް ޕްރޮވައިޑަރ ޕްރޮފައިލް، ސާފު ޚިދުމަތް ސަރަހައްދު، ރޭޓިންގ އަދި ރިކުއެސްޓް ޓްރެކިންގ މަތީގައެވެ.',verify:'ޕްރޮވައިޑަރ ވެރިފިކޭޝަން',verifyText:'އިތުބާރު ފެންނަ ގޮތަށް ހެދިފައި',features:['ޕްރޮވައިޑަރގެ އައިޑެންޓިޓީ އަދި ބިޒްނަސް ވެރިފިކޭޝަން','ނިމިފައިވާ ރިކުއެސްޓްތަކުން ރޭޓިންގ','ތަން ބަލައި ޕްރޮވައިޑަރ މެޗިންގ','ފެށުމުން ނިމުމަށް ރިކުއެސްޓް ސްޓޭޓަސް'],forProviders:'ޚިދުމަތްދޭ ފަރާތްތަކަށް',providerTitle:'ގިނަ ލޯކަލް މަސައްކަތް. ހޯދުމުގައި މަދު ވަގުތު.',providerText:'އިންޑިވިޖުއަލް ޕްރޮފެޝަނަލެއް ނުވަތަ ރަޖިސްޓަރޑް ބިޒްނަހަކަށް iFix އާ ގުޅޭ. ތިބާގެ ޚިދުމަތްތަކާ ތަންތަން ސެޓް ކޮށް، ތިބާ ކުރާ މަސައްކަތާ ގުޅޭ ރިކުއެސްޓްތައް ލިބޭ.',providerBullets:['ތިބާ ދޭ ޚިދުމަތްތައް ހޮވާ','ތިބާ ޚިދުމަތްދޭ ތަންތަން ސެޓް ކުރޭ','ރޭޓިންގތަކުން ތިބާގެ ރެޕިއުޓޭޝަން ބޮޑުކުރޭ'],join:'ޕްރޮވައިޑަރަކަށް ގުޅޭ',ready:'ތިބާ ތައްޔާރުވެގެން ހުންނަ އިރަށް',needFixed:'ކަމެއް ހައްދަން ބޭނުންތޯ؟',finalText:'ތިބާއަށް ބޭނުން ކަން ބުނެދޭ. މުނާސިބު ލޯކަލް ޕްރޮވައިޑަރެއް ހޯދުމަށް އެހީވެދޭނަން.',footer:'ލޯކަލް ޚިދުމަތް. އެއް ސާދާ ތަނެއް.',rights:'ހުރިހާ ޙައްޤެއް މަޙްފޫޒު.'}
};

const serviceData:Record<Lang,ServiceData[]>={
 en:[
  ['🔧','General repairs','Everyday fixes and maintenance',['Wall repair','Door repair','Furniture fix','Hardware','+2 more']],
  ['⚡','Electrical','Lights, wiring and electrical faults',['Lighting','Switches','Wiring','Circuit breaker','+2 more']],
  ['🚿','Plumbing','Leaks, taps, pumps and pipe work',['Leak repair','Tap install','Pipe repair','Pump repair','+2 more']],
  ['❄️','AC & refrigeration','Cooling, servicing and repair',['AC service','AC repair','Installation','Refrigerator','+1 more']],
  ['🧹','Cleaning','Home and business cleaning',['Home cleaning','Deep cleaning','Office cleaning','Post renovation','+2 more']],
  ['🪚','Carpentry','Furniture, doors and woodwork',['Door install','Wardrobe','Shelving','Custom furniture','+2 more']],
  ['🎨','Painting','Interior and exterior painting',['Interior paint','Exterior paint','Wall texture','Touch up','+1 more']],
  ['💻','IT & technical','Devices, networks and setup',['Device setup','Wi-Fi setup','Network support','Troubleshooting','+1 more']]
 ],
 dv:[
  ['🔧','އާންމު މަރާމާތު','ދުވަހުން ދުވަހަށް ބޭނުންވާ މަރާމާތު އަދި މެއިންޓެނެންސް',['ފާރު މަރާމާތު','ދޮރު މަރާމާތު','ފަރުނީޗަރު','ހާޑްވެއަރ','+2']],
  ['⚡','އިލެކްޓްރިކަލް','ލައިޓް، ވަޔަރިންގ އަދި އިލެކްޓްރިކަލް މައްސަލަ',['ލައިޓިންގ','ސްވިޗް','ވަޔަރިންގ','ސާކިޓް ބްރޭކަރ','+2']],
  ['🚿','ޕްލަމްބިންގ','ލީކް، ޓެޕް، ޕަމްޕް އަދި ޕައިޕް',['ލީކް މަރާމާތު','ޓެޕް ހަރުކުރުން','ޕައިޕް މަރާމާތު','ޕަމްޕް މަރާމާތު','+2']],
  ['❄️','އޭސީ އަދި ރެފްރިޖަރޭޝަން','ކޫލިންގ، ސާވިސް އަދި މަރާމާތު',['އޭސީ ސާވިސް','އޭސީ މަރާމާތު','އިންސްޓޯލް','ރެފްރިޖެރޭޓަރ','+1']],
  ['🧹','ސާފުކުރުން','ގޭދޮރު އަދި ބިޒްނަސް ސާފުކުރުން',['ގެ ސާފު','ޑީޕް ކްލީނިންގ','އޮފީސް','ރެނޮވޭޝަން ފަހު','+2']],
  ['🪚','ކާޕެންޓްރީ','ފަރުނީޗަރު، ދޮރު އަދި ލަކުޑީގެ މަސައްކަތް',['ދޮރު ހަރުކުރުން','ވޯޑްރޯބް','ޝެލްފް','ކަސްޓަމް ފަރުނީޗަރު','+2']],
  ['🎨','ކުލަލުން','އެތެރެ އަދި ބޭރު ކުލަލުން',['އެތެރެ ކުލަ','ބޭރު ކުލަ','ފާރު ޓެކްސްޗަރ','ޓަޗް އަޕް','+1']],
  ['💻','އައިޓީ އަދި ޓެކްނިކަލް','ޑިވައިސް، ނެޓްވޯކް އަދި ސެޓަޕް',['ޑިވައިސް ސެޓަޕް','ވައި-ފައި','ނެޓްވޯކް','ޓްރަބަލްޝޫޓް','+1']]
 ]
};

const stepData={
 en:[['01','Tell us what you need','Choose the service, location and describe the job.'],['02','Get matched','iFix shares your request with suitable providers in your area.'],['03','Choose with confidence','Review provider details, responses and ratings before you decide.'],['04','Get it fixed','Confirm the provider, complete the work and leave a rating.']],
 dv:[['01','ބޭނުން ކަން ބުނެދޭ','ޚިދުމަތް އަދި ތަން ހޮވައި، މަސައްކަތް ތަފްޞީލު ކުރޭ.'],['02','މެޗް ކުރޭ','iFix އިން ތިބާގެ ސަރަހައްދުގައި ހުރި މުނާސިބު ޕްރޮވައިޑަރުންނާ ރިކުއެސްޓް ހިއްސާކުރާ.'],['03','އިތުބާރާއެކު ހޮވާ','ހޮވުމުގެ ކުރިން ޕްރޮވައިޑަރ ތަފްޞީލު، ޖަވާބު އަދި ރޭޓިންގ ބަލާ.'],['04','މަސައްކަތް ނިންމާ','ޕްރޮވައިޑަރ ކަށަވަރު ކޮށް، މަސައްކަތް ނިންމައި ރޭޓިންގެއް ދޭ.']]
};

export default function IndexPage(){
 const[lang,setLang]=useState<Lang>('en');
 useEffect(()=>{try{const saved=localStorage.getItem('ifixmv-language');if(saved==='dv'||saved==='en')setLang(saved);}catch{}},[]);
 const change=(next:Lang)=>{setLang(next);try{localStorage.setItem('ifixmv-language',next);}catch{}};
 const t=copy[lang];const rtl=lang==='dv';
 return <div className={`landingPage${rtl?' landingDhivehi':''}`} dir={rtl?'rtl':'ltr'} lang={lang==='dv'?'dv':'en'}>
  <header className="landingHeader">
   <a className="landingBrand" href="/" aria-label="iFix Maldives home"><span className="landingBrandIcon">iF</span><span className="landingBrandText">iFix<span>Maldives</span></span></a>
   <nav className="landingNav" aria-label="Primary navigation"><a href="#services">{t.nav[0]}</a><a href="#how-it-works">{t.nav[1]}</a><a href="#providers">{t.nav[2]}</a></nav>
   <div className="landingHeaderActions"><div className="landingLanguage" role="group" aria-label="Language"><button type="button" className={lang==='en'?'active':''} onClick={()=>change('en')}>EN</button><button type="button" className={lang==='dv'?'active':''} onClick={()=>change('dv')}>ދިވެހި</button></div><a className="landingSignIn" href="/login">{t.signIn}</a><a className="landingHeaderCta" href="/login">{t.request}</a></div>
  </header>
  <main>
   <section className="landingHero"><div className="landingHeroGlow"/><div className="landingHeroInner"><div className="landingHeroCopy"><div className="landingEyebrow"><span/>{t.eyebrow}</div><h1>{t.hero1}<br/><em>{t.hero2}</em></h1><p>{t.heroText}</p><div className="landingHeroActions"><a className="landingPrimary" href="/login">{t.request} <span>→</span></a><a className="landingSecondary" href="#providers">{t.become}</a></div><div className="landingTrustRow">{t.trust.map(x=><span key={x}><b>✓</b>{x}</span>)}</div></div>
    <div className="landingHeroCard"><div className="landingHeroCardTop"><div><small>{t.start}</small><h2>{t.needs}</h2></div><span className="landingStatusDot">● {t.live}</span></div><div className="landingFinder"><label>{t.service}<div className="landingFakeInput"><span>🔧</span><strong>{t.chooseService}</strong><b>⌄</b></div></label><label>{t.location}<div className="landingFakeInput"><span>⌖</span><strong>{t.chooseIsland}</strong><b>⌄</b></div></label><a href="/login" className="landingFindButton">{t.continue} <span>→</span></a></div><div className="landingMiniCards"><div><span>⚡</span><p><strong>{t.fast}</strong><small>{t.fastText}</small></p></div><div><span>★</span><p><strong>{t.choose}</strong><small>{t.chooseText}</small></p></div></div></div></div></section>
   <section className="landingSection landingServices" id="services"><div className="landingSectionHead"><div><small>{t.popular}</small><h2>{t.servicesTitle}</h2></div><p>{t.servicesText}</p></div><div className="landingServiceGrid">{serviceData[lang].map(([icon,title,text,subcategories])=><a href="/login" className="landingServiceCard" key={title}><span className="landingServiceIcon">{icon}</span><div><strong>{title}</strong><small>{text}</small></div><b>→</b><div className="landingSubcategories" aria-label={`${title} subcategories`}>{subcategories.map(item=><span className={`landingSubcategory${item.startsWith('+')?' landingSubcategoryMore':''}`} key={item}>{item}</span>)}</div></a>)}</div></section>
   <section className="landingHow" id="how-it-works"><div className="landingHowInner"><div className="landingSectionHead light"><div><small>{t.how}</small><h2>{t.howTitle}</h2></div><p>{t.howText}</p></div><div className="landingSteps">{stepData[lang].map(([n,title,text])=><div className="landingStep" key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>
   <section className="landingSection landingSafety"><div className="landingSafetyCard"><div className="landingSafetyVisual"><span className="landingShield">✓</span><div><strong>{t.verify}</strong><small>{t.verifyText}</small></div></div><div className="landingSafetyCopy"><small>{t.trustTitle}</small><h2>{t.know}</h2><p>{t.trustText}</p><div className="landingFeatureList">{t.features.map(x=><span key={x}><b>✓</b>{x}</span>)}</div></div></div></section>
   <section className="landingProvider" id="providers"><div className="landingProviderInner"><div><small>{t.forProviders}</small><h2>{t.providerTitle}</h2><p>{t.providerText}</p><div className="landingProviderBullets">{t.providerBullets.map(x=><span key={x}>✓ {x}</span>)}</div><a className="landingProviderCta" href="/login">{t.join} <span>→</span></a></div><div className="landingProviderGraphic"><div className="landingProviderCard"><span>{lang==='dv'?'އާ ރިކުއެސްޓް':'New request'}</span><strong>{lang==='dv'?'އޭސީ ސާވިސް':'AC servicing'}</strong><small>Hulhumalé · Standard</small><b>{lang==='dv'?'މަސައްކަތް ބަލާ →':'View job →'}</b></div><div className="landingProviderCard second"><span>{lang==='dv'?'ނިމިފައި':'Completed'}</span><strong>{lang==='dv'?'ޕްލަމްބިންގ މަރާމާތު':'Plumbing repair'}</strong><small>Malé · ★ 5.0</small><b>{lang==='dv'?'ރަނގަޅު މަސައްކަތް':'Great work'}</b></div></div></div></section>
   <section className="landingFinalCta"><div><small>{t.ready}</small><h2>{t.needFixed}</h2><p>{t.finalText}</p></div><a href="/login">{t.request} <span>→</span></a></section>
  </main>
  <footer className="landingFooter"><div className="landingFooterBrand"><span className="landingBrandIcon">iF</span><div><strong>iFix Maldives</strong><small>{t.footer}</small></div></div><div className="landingFooterLinks"><a href="#services">{t.nav[0]}</a><a href="#how-it-works">{t.nav[1]}</a><a href="#providers">{t.nav[2]}</a><a href="/login">{t.signIn}</a></div><small>© 2026 iFix Maldives. {t.rights}</small></footer>
 </div>;
}
