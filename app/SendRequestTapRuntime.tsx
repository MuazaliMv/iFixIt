'use client';

import { useEffect } from 'react';

/**
 * iOS/mobile fallback for the request wizard action dock.
 *
 * Important: never cancel the browser's native click. The previous fallback
 * used preventDefault/stopPropagation on touch/pointer events, which could
 * swallow the real React onClick on some iOS Safari builds. This version lets
 * the native click happen first and only synthesizes a click when no native
 * click arrives shortly after the touch.
 */
export default function SendRequestTapRuntime() {
  useEffect(() => {
    let lastNativeClickAt = 0;
    let fallbackTimer: number | null = null;

    const visibleButtons = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('.c3ActionInner button'))
        .filter(button => !button.disabled && button.offsetParent !== null);

    const buttonAtPoint = (x: number, y: number) =>
      visibleButtons().find(button => {
        const rect = button.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      }) || null;

    const scheduleFallback = (button: HTMLButtonElement | null) => {
      if (!button || button.disabled) return;
      const startedAt = Date.now();
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = null;
        if (button.disabled) return;
        // If Safari/React already delivered the click, do nothing.
        if (lastNativeClickAt >= startedAt) return;
        button.click();
      }, 120);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const target = event.target as Element | null;
      const direct = target?.closest('.c3ActionInner button') as HTMLButtonElement | null;
      scheduleFallback(direct || buttonAtPoint(touch.clientX, touch.clientY));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const target = event.target as Element | null;
      const direct = target?.closest('.c3ActionInner button') as HTMLButtonElement | null;
      scheduleFallback(direct || buttonAtPoint(event.clientX, event.clientY));
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('.c3ActionInner button')) return;
      lastNativeClickAt = Date.now();
    };

    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    document.addEventListener('click', onClick, true);

    return () => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}
