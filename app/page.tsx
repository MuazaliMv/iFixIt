'use client';

import { useEffect, useState } from 'react';
import './landing.css';
import './landing-blue.css';

type Lang = 'en' | 'dv';

const copy = {
  en: {
    signIn: 'Sign in',
    request: 'Request a service',
    ready: 'READY WHEN YOU ARE',
    needFixed: 'Need something fixed?',
    heroText: 'Choose a service and we’ll connect you with a suitable local provider.',
    how: 'HOW IT WORKS',
    steps: [
      ['01', 'Request', 'Tell us what you need.'],
      ['02', 'Provider accepts', 'A suitable provider accepts the job.'],
      ['03', 'Job completed', 'Track the request until the work is done.'],
    ],
    trust: 'VERIFIED PROVIDERS',
    trustTitle: 'Service you can trust.',
    trustText: 'Provider identity and business details are reviewed by iFix, with clear service areas and request tracking.',
    trustPoints: ['Provider verification', 'Location-based matching', 'Request progress tracking'],
    providerLink: 'Become a service provider',
  },
  dv: {
    signIn: 'ސައިން އިން',
    request: 'ޚިދުމަތެއް އެދޭ',
    ready: 'ތިބާ ތައްޔާރުވެގެން ހުންނަ އިރަށް',
    needFixed: 'ކަމެއް ހައްދަން ބޭނުންތޯ؟',
    heroText: 'ޚިދުމަތެއް ހޮވާ. މުނާސިބު ލޯކަލް ޕްރޮވައިޑަރަކާ ގުޅުވައިދޭނަން.',
    how: 'ކިހިނެއް ކުރަނީ',
    steps: [
      ['01', 'ރިކުއެސްޓް', 'ބޭނުން ޚިދުމަތް ބުނެދޭ.'],
      ['02', 'ޕްރޮވައިޑަރ ޤަބޫލުކުރާ', 'މުނާސިބު ޕްރޮވައިޑަރެއް މަސައްކަތް ޤަބޫލުކުރާ.'],
      ['03', 'މަސައްކަތް ނިމޭ', 'ނިމެންދެން ރިކުއެސްޓް ޓްރެކްކުރޭ.'],
    ],
    trust: 'ވެރިފައިޑް ޕްރޮވައިޑަރުން',
    trustTitle: 'އިތުބާރާއެކު ޚިދުމަތް.',
    trustText: 'ޕްރޮވައިޑަރގެ އައިޑެންޓިޓީ އަދި ބިޒްނަސް ތަފްޞީލު iFix އިން ބަލާ، ސާފު ޚިދުމަތް ސަރަހައްދާ ރިކުއެސްޓް ޓްރެކިންގ ދެއެވެ.',
    trustPoints: ['ޕްރޮވައިޑަރ ވެރިފިކޭޝަން', 'ލޮކޭޝަން މެޗިންގ', 'ރިކުއެސްޓް ޕްރޮގްރެސް'],
    providerLink: 'ޕްރޮވައިޑަރަކަށް ވާ',
  },
};

export default function IndexPage() {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ifixmv-language');
      if (saved === 'dv' || saved === 'en') setLang(saved);
    } catch {}
  }, []);

  const change = (next: Lang) => {
    setLang(next);
    try { localStorage.setItem('ifixmv-language', next); } catch {}
  };

  const t = copy[lang];
  const rtl = lang === 'dv';

  return (
    <div className={`landingPage landingFocused${rtl ? ' landingDhivehi' : ''}`} dir={rtl ? 'rtl' : 'ltr'} lang={rtl ? 'dv' : 'en'}>
      <header className="landingHeader">
        <a className="landingBrand" href="/" aria-label="iFix Maldives home">
          <span className="landingBrandIcon">iF</span>
          <span className="landingBrandText">iFix<span>Maldives</span></span>
        </a>
        <div className="landingHeaderActions">
          <div className="landingLanguage" role="group" aria-label="Language">
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => change('en')}>EN</button>
            <button type="button" className={lang === 'dv' ? 'active' : ''} onClick={() => change('dv')}>ދިވެހި</button>
          </div>
          <a className="landingSignIn" href="/login">{t.signIn}</a>
        </div>
      </header>

      <main className="landingFocusedMain">
        <section className="landingFinalCta landingFocusedHero">
          <div>
            <small>{t.ready}</small>
            <h1>{t.needFixed}</h1>
            <p>{t.heroText}</p>
          </div>
          <a href="/login">{t.request} <span>→</span></a>
        </section>

        <section className="landingFocusedSection" aria-labelledby="how-title">
          <div className="landingFocusedHeading">
            <small>{t.how}</small>
            <h2 id="how-title">{rtl ? 'ރިކުއެސްޓުން ނިމުމަށް' : 'From request to completed.'}</h2>
          </div>
          <div className="landingSteps landingFocusedSteps">
            {t.steps.map(([n, title, text]) => (
              <div className="landingStep" key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landingFocusedSection landingFocusedTrust">
          <div className="landingSafetyCopy">
            <small>{t.trust}</small>
            <h2>{t.trustTitle}</h2>
            <p>{t.trustText}</p>
            <div className="landingFeatureList">
              {t.trustPoints.map(point => <span key={point}><b>✓</b>{point}</span>)}
            </div>
          </div>
          <a className="landingProviderTextLink" href="/provider/apply">{t.providerLink} <span>→</span></a>
        </section>
      </main>
    </div>
  );
}
