'use client';

import { useEffect } from 'react';

/**
 * iOS Safari/WKWebView can occasionally lose the synthetic click for fixed
 * action-dock buttons when browser chrome/visualViewport is moving. Convert a
 * completed touch on the wizard action buttons into one explicit click.
 */
export default function SendRequestTapRuntime() {
  useEffect(() => {
    let lastTouchAt = 0;

    const onTouchEnd = (event: TouchEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest('.c3ActionInner button') as HTMLButtonElement | null;
      if (!button || button.disabled) return;

      // Only handle a real single-finger tap that finishes on the action dock.
      if (event.changedTouches.length !== 1) return;
      event.preventDefault();
      lastTouchAt = Date.now();
      button.click();
    };

    // Suppress the delayed compatibility click after the touch-triggered click,
    // preventing duplicate request submissions on older WebKit builds.
    const onClickCapture = (event: MouseEvent) => {
      if (Date.now() - lastTouchAt > 700 || event.detail === 0) return;
      const target = event.target as Element | null;
      if (!target?.closest('.c3ActionInner button')) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
    document.addEventListener('click', onClickCapture, true);
    return () => {
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return null;
}
