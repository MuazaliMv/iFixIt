'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application route error', error);
  }, [error]);

  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section role="alert" style={{ width: 'min(520px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 24, boxShadow: '0 12px 36px rgba(0,0,0,.08)' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: '#86868b' }}>SYSTEM NOTICE</p>
        <h1 style={{ margin: '8px 0 8px', fontSize: 24 }}>This page could not load</h1>
        <p style={{ margin: 0, color: '#5f6368', lineHeight: 1.5 }}>Your last action may not have been saved. Try the page again. If the problem continues, an administrator can review the system error log.</p>
        {error.digest ? <p style={{ margin: '12px 0 0', fontSize: 12, color: '#86868b' }}>Reference: {error.digest}</p> : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <button type="button" onClick={reset}>Try again</button>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
          <button type="button" onClick={() => { window.location.href = '/'; }}>Go to home</button>
        </div>
      </section>
    </main>
  );
}
