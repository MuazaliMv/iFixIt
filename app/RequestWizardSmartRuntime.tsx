'use client';

import { useEffect } from 'react';

/**
 * Keeps the customer request wizard usable across iOS/Android viewport sizes.
 * - measures the fixed action dock instead of relying on guessed padding
 * - auto-selects Standard when it is the only visible request type
 * - removes the now-redundant scheduling prompt
 * - brings validation feedback/its field into view after Continue/Submit
 */
export default function RequestWizardSmartRuntime() {
  useEffect(() => {
    let dockObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const isVisible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      return element.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const measureDock = () => {
      const dock = document.querySelector<HTMLElement>('.c3ActionDock');
      if (!dock || !isVisible(dock)) return;
      const height = Math.ceil(dock.getBoundingClientRect().height);
      if (height > 0) document.documentElement.style.setProperty('--request-action-height', `${height}px`);
    };

    const simplifySingleRequestType = () => {
      document.querySelectorAll<HTMLElement>('.c3Urgency').forEach(group => {
        const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button')).filter(isVisible);
        if (buttons.length !== 1) {
          group.classList.remove('smartSingleRequestType');
          return;
        }

        const only = buttons[0];
        const label = (only.textContent || '').trim().toLowerCase();
        if (!label.includes('standard')) return;

        if (!only.classList.contains('selected') && only.getAttribute('aria-pressed') !== 'true') {
          only.click();
        }

        group.classList.add('smartSingleRequestType');
        const previous = group.previousElementSibling as HTMLElement | null;
        if (previous?.classList.contains('c3Question')) {
          const text = (previous.textContent || '').toLowerCase();
          if (text.includes('schedule') || text.includes('when do you need help') || text.includes('preferred date')) {
            previous.classList.add('smartAutoSection');
          }
        }
      });
    };

    const relevantValidationNode = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('.c3Notice,.c3Warning,[role="alert"]'));
      return nodes.find(node => {
        if (!isVisible(node)) return false;
        const text = (node.textContent || '').trim().toLowerCase();
        return Boolean(text) && (
          text.includes('choose') || text.includes('enter') || text.includes('complete') ||
          text.includes('add an') || text.includes('tell us') || text.includes('required') ||
          text.includes('unable') || text.includes('expired')
        );
      }) || null;
    };

    const fieldForMessage = (message: string) => {
      const text = message.toLowerCase();
      const selector = text.includes('contact name') ? 'input[name*="contact" i], input[placeholder*="name" i]' :
        text.includes('phone') ? 'input[type="tel"], input[name*="phone" i]' :
        text.includes('preferred date') ? 'input[type="date"]' :
        text.includes('problem') ? 'textarea' :
        text.includes('service') ? '.c3ServiceTile' : null;
      return selector ? document.querySelector<HTMLElement>(selector) : null;
    };

    const revealValidation = () => {
      window.setTimeout(() => {
        const alert = relevantValidationNode();
        if (!alert) return;
        const field = fieldForMessage(alert.textContent || '');
        const target = field?.closest<HTMLElement>('.c3Field') || field || alert;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
          window.setTimeout(() => field.focus({ preventScroll: true }), 260);
        }
      }, 80);
    };

    const onActionClick = (event: Event) => {
      const target = event.target as Element | null;
      if (!target?.closest('.c3ActionInner button')) return;
      revealValidation();
    };

    const attachDockObserver = () => {
      dockObserver?.disconnect();
      const dock = document.querySelector<HTMLElement>('.c3ActionDock');
      if (!dock) return;
      dockObserver = new ResizeObserver(measureDock);
      dockObserver.observe(dock);
      measureDock();
    };

    const refresh = () => {
      attachDockObserver();
      simplifySingleRequestType();
    };

    mutationObserver = new MutationObserver(() => refresh());
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    document.addEventListener('click', onActionClick, true);
    window.addEventListener('resize', measureDock, { passive: true });
    window.visualViewport?.addEventListener('resize', measureDock, { passive: true });

    refresh();

    return () => {
      dockObserver?.disconnect();
      mutationObserver?.disconnect();
      document.removeEventListener('click', onActionClick, true);
      window.removeEventListener('resize', measureDock);
      window.visualViewport?.removeEventListener('resize', measureDock);
      document.documentElement.style.removeProperty('--request-action-height');
    };
  }, []);

  return null;
}
