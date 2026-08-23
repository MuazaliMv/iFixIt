'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import CustomerPortal from './CustomerPortal';
import './landing.css';

type SessionState = 'loading' | 'signed-in' | 'signed-out';

const services = [
  { icon: '🔧', title: 'General repairs', text: 'Everyday fixes and maintenance' },
  { icon: '⚡', title: 'Electrical', text: 'Lights, wiring and electrical faults' },
  { icon: '🚿', title: 'Plumbing', text: 'Leaks, taps, pumps and pipe work' },
  { icon: '❄️', title: 'AC & refrigeration', text: 'Cooling, servicing and repair' },
  { icon: '🧹', title: 'Cleaning', text: 'Home and business cleaning' },
  { icon: '🪚', title: 'Carpentry', text: 'Furniture, doors and woodwork' },
  { icon: '🎨', title: 'Painting', text: 'Interior and exterior painting' },
  { icon: '💻', title: 'IT & technical', text: 'Devices, networks and setup' },
];

const steps = [
  ['01', 'Tell us what you need', 'Choose the service, location and describe the job.'],
  ['02', 'Get matched', 'iFix shares your request with suitable providers in your area.'],
  ['03', 'Choose with confidence', 'Review provider details, responses and ratings before you decide.'],
  ['04', 'Get it fixed', 'Confirm the provider, complete the work and leave a rating.'],
];

export default function HomePage() {
  const [sessionState, setSessionState] = useState<SessionState>('loading');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSessionState(data.session ? 'signed-in' : 'signed-out');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSessionState(session ? 'signed-in' : 'signed-out');
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (sessionState === 'signed-in') return <CustomerPortal />;

  if (sessionState === 'loading') {
    return (
      <div className="landingLoading" aria-label="Loading iFix">
        <div className="landingMark">i<span>Fix</span></div>
      </div>
    );
  }

  return (
    <div className="landingPage">
      <header className="landingHeader">
        <a className="landingBrand" href="/" aria-label="iFix Maldives home">
          <span className="landingBrandIcon">iF</span>
          <span className="landingBrandText">iFix<span>Maldives</span></span>
        </a>
        <nav className="landingNav" aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#how-it-works">How it works</a>
          <a href="#providers">For providers</a>
        </nav>
        <div className="landingHeaderActions">
          <a className="landingSignIn" href="/login">Sign in</a>
          <a className="landingHeaderCta" href="/login">Request a service</a>
        </div>
      </header>

      <main>
        <section className="landingHero">
          <div className="landingHeroGlow" />
          <div className="landingHeroInner">
            <div className="landingHeroCopy">
              <div className="landingEyebrow"><span /> Local services, made simple</div>
              <h1>Find trusted help.<br/><em>Get it fixed.</em></h1>
              <p>Connect with local service providers across the Maldives for repairs, maintenance and everyday jobs — all from one place.</p>
              <div className="landingHeroActions">
                <a className="landingPrimary" href="/login">Request a service <span>→</span></a>
                <a className="landingSecondary" href="#providers">Become a provider</a>
              </div>
              <div className="landingTrustRow">
                <span><b>✓</b> Verified providers</span>
                <span><b>✓</b> Local matching</span>
                <span><b>✓</b> Ratings & reviews</span>
              </div>
            </div>

            <div className="landingHeroCard" aria-label="Service request preview">
              <div className="landingHeroCardTop">
                <div><small>START A REQUEST</small><h2>What needs fixing?</h2></div>
                <span className="landingStatusDot">● Live</span>
              </div>
              <div className="landingFinder">
                <label>Service
                  <div className="landingFakeInput"><span>🔧</span><strong>Choose a service</strong><b>⌄</b></div>
                </label>
                <label>Location
                  <div className="landingFakeInput"><span>⌖</span><strong>Choose your island</strong><b>⌄</b></div>
                </label>
                <a href="/login" className="landingFindButton">Continue <span>→</span></a>
              </div>
              <div className="landingMiniCards">
                <div><span>⚡</span><p><strong>Fast matching</strong><small>Reach suitable providers nearby</small></p></div>
                <div><span>★</span><p><strong>Choose confidently</strong><small>See ratings before confirming</small></p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="landingSection landingServices" id="services">
          <div className="landingSectionHead">
            <div><small>POPULAR SERVICES</small><h2>Whatever needs doing,<br/>start with iFix.</h2></div>
            <p>From urgent repairs to planned maintenance, find the right local provider for the job.</p>
          </div>
          <div className="landingServiceGrid">
            {services.map((service) => (
              <a href="/login" className="landingServiceCard" key={service.title}>
                <span className="landingServiceIcon">{service.icon}</span>
                <div><strong>{service.title}</strong><small>{service.text}</small></div>
                <b>→</b>
              </a>
            ))}
          </div>
        </section>

        <section className="landingHow" id="how-it-works">
          <div className="landingHowInner">
            <div className="landingSectionHead light">
              <div><small>HOW IFIX WORKS</small><h2>From problem to solved,<br/>without the runaround.</h2></div>
              <p>One simple request puts you in touch with providers who can actually help.</p>
            </div>
            <div className="landingSteps">
              {steps.map(([number, title, text]) => (
                <div className="landingStep" key={number}>
                  <span>{number}</span><h3>{title}</h3><p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landingSection landingSafety">
          <div className="landingSafetyCard">
            <div className="landingSafetyVisual">
              <span className="landingShield">✓</span>
              <div><strong>Provider verification</strong><small>Designed to make trust visible</small></div>
            </div>
            <div className="landingSafetyCopy">
              <small>BUILT FOR TRUST</small>
              <h2>Know who you’re hiring.</h2>
              <p>iFix is built around verified provider profiles, clear service areas, ratings and transparent request tracking.</p>
              <div className="landingFeatureList">
                <span><b>✓</b> Provider identity and business verification</span>
                <span><b>✓</b> Ratings from completed service requests</span>
                <span><b>✓</b> Location-based provider matching</span>
                <span><b>✓</b> Request status from start to completion</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landingProvider" id="providers">
          <div className="landingProviderInner">
            <div>
              <small>FOR SERVICE PROVIDERS</small>
              <h2>More local jobs.<br/>Less time looking for them.</h2>
              <p>Join iFix as an individual professional or registered business. Set your services and locations, then receive requests that match what you do.</p>
              <div className="landingProviderBullets">
                <span>✓ Choose the services you provide</span>
                <span>✓ Set the locations you cover</span>
                <span>✓ Build your reputation with ratings</span>
              </div>
              <a className="landingProviderCta" href="/login">Join as a provider <span>→</span></a>
            </div>
            <div className="landingProviderGraphic">
              <div className="landingProviderCard"><span>New request</span><strong>AC servicing</strong><small>Hulhumalé · Standard</small><b>View job →</b></div>
              <div className="landingProviderCard second"><span>Completed</span><strong>Plumbing repair</strong><small>Malé · ★ 5.0</small><b>Great work</b></div>
            </div>
          </div>
        </section>

        <section className="landingFinalCta">
          <div><small>READY WHEN YOU ARE</small><h2>Need something fixed?</h2><p>Tell us what you need. We’ll help you find the right local provider.</p></div>
          <a href="/login">Request a service <span>→</span></a>
        </section>
      </main>

      <footer className="landingFooter">
        <div className="landingFooterBrand"><span className="landingBrandIcon">iF</span><div><strong>iFix Maldives</strong><small>Local services. One simple place.</small></div></div>
        <div className="landingFooterLinks"><a href="#services">Services</a><a href="#how-it-works">How it works</a><a href="#providers">Providers</a><a href="/login">Sign in</a></div>
        <small>© 2026 iFix Maldives. All rights reserved.</small>
      </footer>
    </div>
  );
}
