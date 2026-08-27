import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('provider profile resolves to the shared account profile',async()=>{
 const source=await read('app/provider/profile/page.tsx');
 assert.match(source,/redirect\('\/profile'\)/);
});

test('provider verification remains available separately',async()=>{
 const verification=await read('app/provider/verification/page.tsx');
 const profile=await read('app/profile/ProfileClient.tsx');
 assert.match(verification,/Verification Documents/);
 assert.match(profile,/\/provider\/verification/);
});

test('client sign-out events clear the server session too',async()=>{
 const source=await read('app/ServerSessionSignOutSync.tsx');
 assert.match(source,/SIGNED_OUT/);
 assert.match(source,/\/api\/auth\/logout/);
 assert.match(source,/credentials:'same-origin'/);
});

test('customers get a provider application route instead of a blocked provider switch',async()=>{
 const source=await read('app/GlobalModeSwitch.tsx');
 assert.match(source,/Become a Service Provider/);
 assert.match(source,/href="\/provider\/onboarding"/);
 assert.match(source,/canUseProvider\?<Link/);
 assert.doesNotMatch(source,/href="\/login"[^>]*>\s*<span[^>]*>[^<]*Service Provider/s);
});

test('cancelled requests stay out of normal customer request views and counters',async()=>{
 const source=await read('app/requests/page.tsx');
 assert.match(source,/!\['COMPLETED','CANCELLED'\]\.includes\(r\.status\)/);
 assert.match(source,/requests\.filter\(r=>!\['COMPLETED','CANCELLED'\]\.includes\(r\.status\)\)\.length/);
});

test('provider status actions disable the current state and lock during saves',async()=>{
 const source=await read('app/admin/providers/[userId]/page.tsx');
 assert.match(source,/const statusBusy=busyStatus!==null/);
 assert.match(source,/disabled=\{statusBusy\|\|status==='APPROVED'\}/);
 assert.match(source,/disabled=\{statusBusy\|\|status==='SUSPENDED'\}/);
 assert.match(source,/status==='APPROVED'\?'Approved':'Approve Provider'/);
});

test('unified control family is loaded after page-specific styles',async()=>{
 const layout=await read('app/layout.tsx');
 const styles=await read('app/unified-control-family.css');
 assert.match(layout,/import '\.\/unified-control-family\.css';/);
 assert.match(styles,/--control-family-height:48px/);
 assert.match(styles,/button:disabled/);
 assert.match(styles,/\.badge,/);
 assert.match(styles,/\.pill,/);
});

test('frozen global navigation remains visible on customer, provider and admin routes',async()=>{
 const[layout,menu,menuStyles,shellStyles,finalStyles]=await Promise.all([
  read('app/layout.tsx'),
  read('app/GlobalRoleMenu.tsx'),
  read('app/global-role-menu.css'),
  read('app/global-shell.css'),
  read('app/usability-consolidation.css'),
 ]);
 assert.match(layout,/<GlobalRoleMenu\/>/);
 assert.match(layout,/<IOSWebAppShell\/>/);
 assert.match(menu,/className="globalMenuSecondary"/);
 assert.doesNotMatch(menuStyles,/\.globalMenuSecondary\s*\{[^}]*display\s*:\s*none/i);
 assert.doesNotMatch(finalStyles,/\.globalMenuSecondary\s*\{[^}]*display\s*:\s*none/i);
 assert.match(shellStyles,/globalMenuHeaderWrap[\s\S]*?visibility:visible!important;[\s\S]*?opacity:1!important;/);
 assert.match(shellStyles,/iosTabBar[\s\S]*?visibility:visible!important;[\s\S]*?opacity:1!important;/);
 assert.match(shellStyles,/@media\(max-width:960px\)[\s\S]*?iosTabBar[\s\S]*?display:grid!important;/);
 assert.match(shellStyles,/@media\(min-width:961px\)[\s\S]*?iosTabBar[\s\S]*?display:grid;/);
});
