'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable="true"]';

function isEditable(element: Element | null): element is HTMLElement {
  return !!element && element instanceof HTMLElement && element.matches(EDITABLE_SELECTOR);
}

export default function MobileKeyboardRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let focusTimer: number | undefined;

    const ensureActiveFieldVisible = () => {
      const active = document.activeElement;
      if (!isEditable(active)) return;

      const vv = window.visualViewport;
      const top = vv?.offsetTop ?? 0;
      const height = vv?.height ?? window.innerHeight;
      const bottom = top + height;
      const rect = active.getBoundingClientRect();
      const topGuard = 84;
      const bottomGuard = 28;

      if (rect.bottom > bottom - bottomGuard || rect.top < top + topGuard) {
        active.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
    };

    const updateViewportState = () => {
      const vv = window.visualViewport;
      const viewportHeight = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - offsetTop);
      const keyboardOpen = keyboardInset > 120;

      root.style.setProperty('--app-visual-viewport-height', `${viewportHeight}px`);
      root.style.setProperty('--app-keyboard-inset', `${keyboardInset}px`);
      root.classList.toggle('app-keyboard-open', keyboardOpen);

      if (keyboardOpen) {
        window.requestAnimationFrame(ensureActiveFieldVisible);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target as Element | null)) return;
      window.clearTimeout(focusTimer);
      updateViewportState();
      focusTimer = window.setTimeout(() => {
        updateViewportState();
        ensureActiveFieldVisible();
      }, 260);
    };

    const onFocusOut = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(updateViewportState, 120);
    };

    updateViewportState();
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', updateViewportState);
    viewport?.addEventListener('resize', updateViewportState);
    viewport?.addEventListener('scroll', updateViewportState);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', updateViewportState);
      viewport?.removeEventListener('resize', updateViewportState);
      viewport?.removeEventListener('scroll', updateViewportState);
      root.classList.remove('app-keyboard-open');
      root.style.removeProperty('--app-visual-viewport-height');
      root.style.removeProperty('--app-keyboard-inset');
    };
  }, []);

  return null;
}
