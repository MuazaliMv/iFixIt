'use client';

/**
 * Legacy admin command grid intentionally disabled.
 *
 * Admin navigation is provided by the global role menu, so this component
 * remains as a compatibility shim for existing page imports while rendering
 * nothing. This removes the duplicated Dashboard / Service Requests /
 * Providers / Users / Services / Locations / Reports / Settings tile grid
 * from every admin page without forcing each page to carry its own cleanup.
 */
export default function AdminNav(){
 return null;
}
