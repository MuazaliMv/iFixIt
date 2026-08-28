'use client';

import { useEffect, useRef, useState } from 'react';

type Notice = { id: number; kind: 'warning' | 'error' | 'success'; message: string };

function userMessage(message: string) {
  const text = message.toLowerCase();
  if (text.includes('network') || text.includes('fetch') || text.includes('offline')) return 'Connection problem. Check your internet and try again.';
  if (text.includes('unauthorized') || text.includes('401') || text.includes('session')) return 'Your session may have expired. Please sign in again.';
  if (text.includes('forbidden') || text.includes('403') || text.includes('permission')) return 'You do not have permission to complete this action.';
  if (text.includes('timeout')) return 'This is taking longer than expected. Please try again.';
  return 'Something went wrong. Your work may not have been saved. Please try again.';
}

export default function ErrorRuntime() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(1);
  const sentAt = useRef<number[]>([]);

  useEffect(() => {
    function notify(kind: Notice['kind'], message: string) {
      const id = nextId.current++;
      setNotices(current => [...current.slice(-2), { id, kind, message }]);
      window.setTimeout(() => setNotices(current => current.filter(item => item.id !== id)), 6500);
    }

    async function report(error: unknown, extra: Record<string, unknown> = {}) {
      const now = Date.now();
      sentAt.current = sentAt.current.filter(time => now - time < 60_000);
      if (sentAt.current.length >= 5) return;
      sentAt.current.push(now);

      const normalized = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unexpected application error');
      notify('error', userMessage(normalized.message));

      try {
        // Runtime reporting uses the same authoritative, cookie-bound FixIt session
        // as the rest of the app. A missing legacy browser Supabase session must not
        // suppress telemetry for a valid signed-in user.
        await fetch('/api/system/errors', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: normalized.message,
            stack: normalized.stack,
            severity: 'error',
            route: window.location.pathname,
            online: navigator.onLine,
            ...extra,
          }),
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // Error reporting must never create another visible failure.
      }
    }

    const onError = (event: ErrorEvent) => {
      void report(event.error || event.message, { component: 'window', action: 'runtime_error' });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      void report(event.reason, { component: 'promise', action: 'unhandled_rejection' });
    };
    const onOffline = () => notify('warning', 'You are offline. Changes may not save until your connection returns.');
    const onOnline = () => notify('success', 'Connection restored.');

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    if (!navigator.onLine) onOffline();

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!notices.length) return null;

  return (
    <div aria-live="assertive" aria-atomic="false" style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 10000, display: 'grid', gap: 8, pointerEvents: 'none' }}>
      {notices.map(notice => (
        <div key={notice.id} role={notice.kind === 'error' ? 'alert' : 'status'} style={{ margin: '0 auto', width: 'min(560px, 100%)', borderRadius: 14, padding: '12px 14px', background: '#fff', border: `1px solid ${notice.kind === 'error' ? '#fecaca' : notice.kind === 'warning' ? '#fde68a' : '#bbf7d0'}`, boxShadow: '0 8px 24px rgba(0,0,0,.12)', color: '#1d1d1f', pointerEvents: 'auto', fontSize: 14, fontWeight: 600 }}>
          {notice.message}
        </div>
      ))}
    </div>
  );
}
