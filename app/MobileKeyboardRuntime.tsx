'use client';

import { useEffect } from 'react';

// Only controls that can summon the software keyboard belong in the keyboard
// runtime. Native <select> menus must be left entirely to iOS/WebKit; treating
// them as keyboard-editable changes page layout while the picker is opening and
// can make the Atoll / Region and Island / City menus appear unresponsive.
const EDITABLE_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"]';

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
    let blurTimer: number | null = null;

    const clearBlurTimer = () => {
      if (blurTimer !== null) {
        window.clearTimeout(blurTimer);
        blurTimer = null;
      }
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
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target as Element | null) || !isPhoneSizedViewport()) return;
      clearBlurTimer();

      // Let iOS/WebKit own the focused-field pan. Repeated scrollIntoView calls while
      // the keyboard and VisualViewport are animating can move the layout underneath
      // the native caret, which makes typed text and the visible cursor look detached.
      root.classList.add('app-editing', 'app-keyboard-open');
      updateViewportState();
    };

    const onFocusOut = () => {
      clearBlurTimer();
      blurTimer = window.setTimeout(() => {
        blurTimer = null;
        if (!isEditable(document.activeElement)) {
          root.classList.remove('app-editing', 'app-keyboard-open');
        }
        updateViewportState();
      }, 180);
    };

    const onViewportChange = () => {
      // Viewport events are state-only. Do not force-scroll the focused element;
      // Safari already positions it relative to the keyboard.
      updateViewportState();
    };

    updateViewportState();
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    viewport?.addEventListener('resize', onViewportChange);
    viewport?.addEventListener('scroll', onViewportChange);

    return () => {
      clearBlurTimer();
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
