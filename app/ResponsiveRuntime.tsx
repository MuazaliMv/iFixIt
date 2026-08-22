'use client';

import { useEffect } from 'react';

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type ViewType = 'desktop' | 'tablet' | 'photo';

type FixItPrefs = {
  user_id: string;
  default_view: 'auto' | ViewType;
  image_quality_setting: 'auto' | 'thumbnail' | 'medium' | 'full';
  touch_mode_enabled: boolean;
  last_used_device: DeviceType;
};

const SETTINGS_KEY = 'fixit_responsive_preferences_v1';

const DEFAULTS: FixItPrefs = {
  user_id: 'local-user',
  default_view: 'auto',
  image_quality_setting: 'auto',
  touch_mode_enabled: true,
  last_used_device: 'desktop',
};

function loadSettings(): FixItPrefs {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(next: FixItPrefs) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // localStorage can be unavailable in private/restricted contexts.
  }
}

function detectDevice(ua = navigator.userAgent, width = window.innerWidth): DeviceType {
  const value = ua.toLowerCase();
  const ipad = /ipad/.test(value) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const androidTablet = /android/.test(value) && !/mobi/.test(value);
  const tabletToken = /tablet/.test(value) || ipad || androidTablet;

  if ((width >= 768 && width <= 1024) || tabletToken) return 'tablet';
  if (width < 768 || /mobi|iphone|ipod/.test(value)) return 'mobile';
  return 'desktop';
}

function photoContext(): boolean {
  if (document.fullscreenElement) return true;

  const active = document.activeElement as HTMLElement | null;
  const modal = active?.closest?.('[role="dialog"], .modal, .lightbox, .image-viewer, [data-photo-viewer]');
  if (modal?.querySelector('img')) return true;

  return Boolean(document.querySelector(
    '[role="dialog"] img, .modal.open img, .lightbox.open img, .image-viewer.open img, [data-photo-viewer="open"] img'
  ));
}

function resolveView(device: DeviceType, prefs: FixItPrefs): ViewType {
  if (prefs.default_view !== 'auto') return prefs.default_view;
  if (photoContext()) return 'photo';
  return device === 'tablet' ? 'tablet' : 'desktop';
}

function applyState() {
  const started = performance.now();
  const prefs = loadSettings();
  const device = detectDevice();
  const view = resolveView(device, prefs);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touch = prefs.touch_mode_enabled && (coarse || navigator.maxTouchPoints > 0 || device === 'tablet');

  const root = document.documentElement;
  root.dataset.fixitDevice = device;
  root.dataset.fixitView = view;
  root.dataset.fixitTouch = String(touch);

  if (prefs.last_used_device !== device) {
    saveSettings({ ...prefs, last_used_device: device });
  }

  const elapsed = performance.now() - started;
  root.dataset.fixitDetectMs = elapsed.toFixed(2);
}

export default function ResponsiveRuntime() {
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyState, 32);
    };

    applyState();

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    document.addEventListener('fullscreenchange', applyState);

    const observer = new MutationObserver(() => {
      if (document.querySelector('[role="dialog"] img, .modal img, .lightbox img, .image-viewer img, [data-photo-viewer] img')) {
        applyState();
      }
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'open', 'aria-hidden', 'data-photo-viewer'],
    });

    const onPointerUp = () => requestAnimationFrame(applyState);
    document.addEventListener('pointerup', onPointerUp, { passive: true });

    (window as typeof window & { FixItResponsive?: unknown }).FixItResponsive = {
      settings: {
        get: loadSettings,
        set: (patch: Partial<FixItPrefs>) => {
          const next = { ...loadSettings(), ...patch };
          saveSettings(next);
          applyState();
          return next;
        },
      },
      detectDevice,
      runBuiltInTests: () => {
        const cases = [
          {
            name: 'Desktop Chrome',
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            width: 1440,
            expected: 'desktop',
          },
          {
            name: 'iPad Safari',
            ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            width: 1024,
            expected: 'tablet',
          },
          {
            name: 'Android Tablet',
            ua: 'Mozilla/5.0 (Linux; Android 14; SM-X710 Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            width: 800,
            expected: 'tablet',
          },
        ];

        const results = cases.map((test) => {
          const start = performance.now();
          const detected = detectDevice(test.ua, test.width);
          const ms = performance.now() - start;
          return {
            ...test,
            detected,
            ms: Number(ms.toFixed(3)),
            pass: detected === test.expected && ms < 50,
          };
        });

        console.table(results);
        return results;
      },
    };

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('fullscreenchange', applyState);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return null;
}
