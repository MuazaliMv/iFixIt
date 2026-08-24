'use client';

import { useEffect } from 'react';

/**
 * Mobile/iOS safety net for the request wizard action dock.
 *
 * Some iOS Safari/WKWebView layouts can place a transparent/fixed element over
 * the visible action button. In that case event.target is not the button even
 * though the finger is visibly inside it. Hit-test the touch coordinates against
 * the actual button rectangles and trigger the intended button directly.
 */
export default function SendRequestTapRuntime() {
  useEffect(() => {
    let lastTouchAt = 0;
    let lastButton: HTMLButtonElement | null = null;

    const buttonAtPoint = (x: number, y: number) => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.c3ActionInner button')
      ).filter(button => !button.disabled && button.offsetParent !== null);

      return buttons.find(button => {
        const rect = button.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      }) || null;
    };

    const triggerButton = (button: HTMLButtonElement | null) => {
      if (!button || button.disabled) return false;
      lastTouchAt = Date.now();
      lastButton = button;
      button.click();
      return true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const target = event.target as Element | null;
      const directButton = target?.closest('.c3ActionInner button') as HTMLButtonElement | null;
      const button = directButton || buttonAtPoint(touch.clientX, touch.clientY);
      if (!button || button.disabled) return;

      event.preventDefault();
      event.stopPropagation();
      triggerButton(button);
    };

    // Pointer events are more reliable than click on newer iOS builds. This is
    // also coordinate-based, so a transparent overlay cannot swallow the action.
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (Date.now() - lastTouchAt < 500) return;
      const button = buttonAtPoint(event.clientX, event.clientY);
      if (!button || button.disabled) return;

      event.preventDefault();
      event.stopPropagation();
      triggerButton(button);
    };

    // Suppress only the delayed native compatibility click for the same button.
    // Programmatic button.click() has detail === 0 and must be allowed through.
    const onClickCapture = (event: MouseEvent) => {
      if (event.detail === 0 || Date.now() - lastTouchAt > 700) return;
      const target = event.target as Element | null;
      const button = target?.closest('.c3ActionInner button') as HTMLButtonElement | null;
      if (!button || button !== lastButton) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
    document.addEventListener('pointerup', onPointerUp, { capture: true, passive: false });
    document.addEventListener('click', onClickCapture, true);

    return () => {
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return null;
}
