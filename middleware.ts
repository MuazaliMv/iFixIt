import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin provider records are operational screens and must never be served from
 * a stale browser/CDN cache. These pages reflect live approval, rejection,
 * suspension, document-review, and provider-profile state.
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');

  return response;
}

export const config = {
  matcher: ['/admin/providers/:path*'],
};
