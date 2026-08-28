'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type SuiteWorkspace = 'customer' | 'provider' | 'admin' | 'public';
type SuiteView =
  | 'landing'
  | 'home'
  | 'request'
  | 'tracking'
  | 'request-detail'
  | 'addresses'
  | 'profile'
  | 'provider'
  | 'provider-application'
  | 'admin'
  | 'other';

type SuiteContext = {
  workspace: SuiteWorkspace;
  view: SuiteView;
};

function setText(selector: string, text: string) {
  const node = document.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== text) node.textContent = text;
}

function suiteContext(pathname: string): SuiteContext {
  if (pathname === '/') return { workspace: 'public', view: 'landing' };

  if (pathname === '/home') {
    const isNewRequest = new URLSearchParams(window.location.search).get('new') === '1';
    return { workspace: 'customer', view: isNewRequest ? 'request' : 'home' };
  }

  if (pathname === '/requests') return { workspace: 'customer', view: 'tracking' };
  if (pathname.startsWith('/requests/')) return { workspace: 'customer', view: 'request-detail' };
  if (pathname === '/profile') return { workspace: 'customer', view: 'profile' };

  if (pathname === '/provider/onboarding') {
    return { workspace: 'customer', view: 'provider-application' };
  }
  if (pathname.startsWith('/provider')) return { workspace: 'provider', view: 'provider' };
  if (pathname.startsWith('/admin')) return { workspace: 'admin', view: 'admin' };

  return { workspace: 'public', view: 'other' };
}

function applySuitePresentation(pathname: string) {
  const context = suiteContext(pathname);

  document.body.dataset.fixitSuite = 'complete-application';
  document.body.dataset.fixitWorkspace = context.workspace;
  document.body.dataset.fixitView = context.view;

  // The Master Suite is a presentation and navigation contract only. It must
  // never write workspace/role localStorage itself; canonical workspace state
  // remains owned by lib/workspaceSelection.ts and explicit user actions.
  if (pathname === '/home') {
    setText('.c3Welcome small', 'Verified Expert Network');
    setText('.c3Welcome h1', 'Need a repair today?');
    setText(
      '.c3Welcome p',
      'Book certified electricians, plumbers, AC and repair experts across approved Maldivian regions.',
    );
    const heroButton = document.querySelector<HTMLButtonElement>('.c3Welcome .c3Primary');
    if (heroButton && heroButton.textContent?.trim() !== 'Book Service Now') {
      heroButton.textContent = 'Book Service Now';
    }
  }

  if (pathname === '/requests') {
    setText('.c3SectionHead h1', 'Your Service Requests');
    setText('.c3SectionHead h2', 'Your Service Requests');
  }

  if (pathname.startsWith('/provider/jobs')) {
    setText('.providerModeTop h1', 'Provider Operations');
    setText('.providerModeTop p', '● Online & Accepting Dispatches');
    setText('.providerSectionHead h2', 'Active Job Contracts');
  }

  if (pathname === '/provider/onboarding') {
    const headings = Array.from(document.querySelectorAll<HTMLElement>('h1,h2'));
    const first = headings.find((el) => /provider|application|onboarding/i.test(el.textContent || ''));
    if (first && first.textContent !== 'Service Provider Application') {
      first.textContent = 'Service Provider Application';
    }
  }

  if (pathname === '/admin') {
    const headings = Array.from(document.querySelectorAll<HTMLElement>('h1,h2'));
    const first = headings.find((el) => /admin|dashboard/i.test(el.textContent || ''));
    if (first && first.textContent !== 'Admin Control Panel') {
      first.textContent = 'Admin Control Panel';
    }
  }
}

export default function CompleteApplicationRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => applySuitePresentation(pathname);
    apply();

    // Several production screens hydrate catalogue/profile/request data after
    // the route renders. Re-apply presentation copy when those nodes arrive.
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const applySearchState = () => applySuitePresentation(window.location.pathname);
    window.addEventListener('popstate', applySearchState);
    return () => {
      window.removeEventListener('popstate', applySearchState);
      delete document.body.dataset.fixitSuite;
      delete document.body.dataset.fixitWorkspace;
      delete document.body.dataset.fixitView;
    };
  }, []);

  return null;
}
