'use client';

/*
 * LEGACY GLOBAL ROLE MENU — DISABLED FOR NOW.
 *
 * This component previously derived the active role from the current route and
 * maintained its own menu/session behavior. That conflicts with the canonical
 * workspace SSOT used by GlobalRoleMenuSSOT / IOSWebAppShell.
 *
 * The previous implementation is intentionally kept in Git history rather than
 * remaining executable in the application. Re-enable only after reconciling it
 * with the canonical workspace architecture.
 */

export default function GlobalRoleMenu(){
  return null;
}
