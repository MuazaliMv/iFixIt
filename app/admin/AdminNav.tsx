'use client';

/**
 * Legacy admin operations-console navigation removed.
 *
 * Admin pages may still import <AdminNav /> while the application is being
 * cleaned up. Keeping this no-op component avoids breaking those imports,
 * while ensuring the obsolete header, primary navigation, submenu tabs,
 * theme toggle, and related console chrome are not rendered anywhere.
 */
export default function AdminNav() {
  return null;
}
