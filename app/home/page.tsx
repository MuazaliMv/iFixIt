'use client';

import { useEffect } from 'react';
import CustomerPortal from '../CustomerPortal';

export default function CustomerHomePage() {
  useEffect(() => {
    const shouldOpen = new URLSearchParams(window.location.search).get('new') === '1';
    if (!shouldOpen) return;

    const openWizard = () => {
      const button = document.querySelector<HTMLButtonElement>('.c3Welcome .c3Primary');
      if (!button) return false;
      button.click();
      return true;
    };

    // Open immediately when the portal is already rendered.
    if (openWizard()) return;

    // The customer portal can take longer to render while auth/catalogue data loads.
    // Watch the DOM until the New Request button actually exists instead of giving up
    // after a fixed timeout.
    const observer = new MutationObserver(() => {
      if (openWizard()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <CustomerPortal />;
}
