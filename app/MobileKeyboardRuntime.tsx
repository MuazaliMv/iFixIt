'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable="true"]';

function isEditable(element: Element | null): element is HTMLElement {
  return !!element && element instanceof HTMLElement && element.matches(EDITABLE_SELECTOR);
}

function isPhoneSizedViewport() {
  return window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
}

export default function MobileKeyboardRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const timers = new Set<number>();

    const clearTimers = () => {
      timers.forEach(id => window.clearTimeout(id));
      timers.clear();
    };

    const ensureActiveFieldVisible = () => {
      const active = document.activeElement;
      if (!isEditable(active) || !isPhoneSizedViewport()) return;

      // iOS/WebKit can report stale viewport geometry while the keyboard animates.
      // scrollIntoView is therefore intentionally retried after focus/viewport changes.
      const rect = active.getBoundingClientRect();
      const vv = window.visualViewport;
      const visibleHeight = vv?.height ?? window.innerHeight;
      const visibleTop = Math.max(0, vv?.offsetTop ?? 0);
      const topGuard = 88;
      const bottomGuard = 36;
      const visibleBottom = visibleTop + visibleHeight;

      if (rect.top < visibleTop + topGuard || rect.bottom > visibleBottom - bottomGuard) {
        active.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      }
    };

    const scheduleVisibilityChecks = () => {
      [0, 80, 220, 420, 700].forEach(delay => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          ensureActiveFieldVisible();
        }, delay);
        timers.add(id);
      });
    };

    const updateViewportState = () => {
      const vv = window.visualViewport;
      const viewportHeight = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - offsetTop);
      const focusedEditable = isEditable(document.activeElement) && isPhoneSizedViewport();
      const keyboardOpen = focusedEditable || keyboardInset > 80;

      root.style.setProperty('--app-visual-viewport-height', `${viewportHeight}px`);
      root.style.setProperty('--app-keyboard-inset', `${keyboardInset}px`);
      root.classList.toggle('app-keyboard-open', keyboardOpen);
      root.classList.toggle('app-editing', focusedEditable);

      if (focusedEditable) scheduleVisibilityChecks();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target as Element | null) || !isPhoneSizedViewport()) return;
      clearTimers();
      // Do not wait for visualViewport resize: on iOS 26/WKWebView it can be late,
      // stale, or not match the actual visual pan while the keyboard animates.
      root.classList.add('app-editing', 'app-keyboard-open');
      updateViewportState();
      scheduleVisibilityChecks();
    };

    const onFocusOut = () => {
      clearTimers();
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!isEditable(document.activeElement)) {
          root.classList.remove('app-editing', 'app-keyboard-open');
        }
        updateViewportState();
      }, 180);
      timers.add(id);
    };

    const onViewportChange = () => {
      updateViewportState();
      if (isEditable(document.activeElement)) scheduleVisibilityChecks();
    };

    updateViewportState();
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    viewport?.addEventListener('resize', onViewportChange);
    viewport?.addEventListener('scroll', onViewportChange);

    return () => {
      clearTimers();
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
      viewport?.removeEventListener('resize', onViewportChange);
      viewport?.removeEventListener('scroll', onViewportChange);
      root.classList.remove('app-keyboard-open', 'app-editing');
      root.style.removeProperty('--app-visual-viewport-height');
      root.style.removeProperty('--app-keyboard-inset');
    };
  }, []);

  return null;
}
