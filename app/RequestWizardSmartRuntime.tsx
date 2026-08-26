'use client';

import { useEffect } from 'react';

/**
 * Keeps the customer request wizard usable across iOS/Android viewport sizes
 * without continuously mutating/observing the whole document.
 */
export default function RequestWizardSmartRuntime() {
  useEffect(() => {
    let dockObserver: ResizeObserver | null = null;
    let observedDock: HTMLElement | null = null;
    let mutationObserver: MutationObserver | null = null;
    let refreshScheduled = false;

    const wizardRoot = () => document.querySelector<HTMLElement>('.c3Wizard');

    const isVisible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      return element.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const measureDock = () => {
      const wizard = wizardRoot();
      const dock = wizard?.querySelector<HTMLElement>('.c3ActionDock') || null;
      if (!dock || !isVisible(dock)) {
        document.documentElement.style.removeProperty('--request-action-height');
        return;
      }
      const height = Math.ceil(dock.getBoundingClientRect().height);
      if (height > 0) document.documentElement.style.setProperty('--request-action-height', `${height}px`);
    };

    const simplifySingleRequestType = () => {
      const wizard = wizardRoot();
      if (!wizard) return;
      wizard.querySelectorAll<HTMLElement>('.c3Urgency').forEach(group => {
        const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button')).filter(isVisible);
        if (buttons.length !== 1) {
          group.classList.remove('smartSingleRequestType');
          return;
        }

        const only = buttons[0];
        const label = (only.textContent || '').trim().toLowerCase();
        if (!label.includes('standard')) return;

        // Avoid synthetic clicks unless React state is genuinely out of sync.
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
      const wizard = wizardRoot();
      if (!wizard) return null;
      const nodes = Array.from(wizard.querySelectorAll<HTMLElement>('.c3Notice,.c3Warning,[role="alert"]'));
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
      const wizard = wizardRoot();
      if (!wizard) return null;
      const text = message.toLowerCase();
      const selector = text.includes('contact name') ? 'input[name*="contact" i], input[placeholder*="name" i]' :
        text.includes('phone') ? 'input[type="tel"], input[name*="phone" i]' :
        text.includes('preferred date') ? 'input[type="date"]' :
        text.includes('problem') ? 'textarea' :
        text.includes('service') ? '.c3ServiceTile' : null;
      return selector ? wizard.querySelector<HTMLElement>(selector) : null;
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
      if (!target?.closest('.c3Wizard .c3ActionInner button')) return;
      revealValidation();
    };

    const attachDockObserver = () => {
      const wizard = wizardRoot();
      const dock = wizard?.querySelector<HTMLElement>('.c3ActionDock') || null;
      if (dock === observedDock) {
        measureDock();
        return;
      }
      dockObserver?.disconnect();
      observedDock = dock;
      if (!dock) {
        document.documentElement.style.removeProperty('--request-action-height');
        return;
      }
      dockObserver = new ResizeObserver(measureDock);
      dockObserver.observe(dock);
      measureDock();
    };

    const refresh = () => {
      refreshScheduled = false;
      if (!wizardRoot()) {
        dockObserver?.disconnect();
        dockObserver = null;
        observedDock = null;
        document.documentElement.style.removeProperty('--request-action-height');
        return;
      }
      attachDockObserver();
      simplifySingleRequestType();
    };

    const scheduleRefresh = () => {
      if (refreshScheduled) return;
      refreshScheduled = true;
      window.requestAnimationFrame(refresh);
    };

    // Observe structural React changes only. Watching class/style mutations caused
    // this runtime to observe its own mutations and could starve the main thread.
    mutationObserver = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation =>
        Array.from(mutation.addedNodes).some(node =>
          node instanceof HTMLElement &&
          (node.matches('.c3Wizard,.c3ActionDock,.c3Urgency,.c3Notice') || Boolean(node.querySelector?.('.c3Wizard,.c3ActionDock,.c3Urgency,.c3Notice')))
        ) ||
        Array.from(mutation.removedNodes).some(node => node instanceof HTMLElement && (node.matches('.c3Wizard') || Boolean(node.querySelector?.('.c3Wizard'))))
      );
      if (relevant) scheduleRefresh();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

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
