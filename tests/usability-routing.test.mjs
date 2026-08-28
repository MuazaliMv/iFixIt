import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('provider profile resolves to the shared account profile',async()=>{
 const source=await read('app/provider/profile/page.tsx');
 const menu=await read('app/GlobalRoleMenu.tsx');
 assert.match(source,/redirect\('\/profile'\)/);
 assert.doesNotMatch(menu,/window\.location\.replace\('\/provider\/profile'\)/);
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

test('customer bottom navigation stays inside the customer workspace',async()=>{
 const nav=await read('app/MobileNav.tsx');
 const routeNav=await read('app/RouteMobileNav.tsx');
 assert.match(nav,/href:'\/home',label:'Request Service'/);
 assert.match(nav,/p==='\/home'\|\|p\.startsWith\('\/home\/'\)/);
 assert.match(routeNav,/path==='\/home'\|\|path\.startsWith\('\/home\/'\)/);
});

test('provider application keeps customer navigation until provider approval',async()=>{
 const routeNav=await read('app/RouteMobileNav.tsx');
 assert.match(routeNav,/providerApplicationRoute=path==='\/provider\/onboarding'/);
 assert.match(routeNav,/providerRoute=path\.startsWith\('\/provider'\)&&!providerApplicationRoute/);
 assert.match(routeNav,/customerRoute\|\|providerApplicationRoute\)return <MobileNav role="customer"\/>/);
});

test('bottom navigation changes only after an explicit workspace selection',async()=>{
 const shell=await read('app/IOSWebAppShell.tsx');
 const guard=await read('app/RoleAccessGuard.tsx');
 const selection=await read('lib/workspaceSelection.ts');
 assert.match(shell,/useSyncExternalStore\(subscribeToSelectedWorkspace,readSelectedWorkspace/);
 assert.match(shell,/useSyncExternalStore\(subscribeToBrowserReady,getBrowserReady,getServerBrowserReady\)/);
 assert.match(shell,/if\(!browserReady\)return <nav className="iosTabBar iosTabBarPending"/);
 assert.match(shell,/persistSelectedWorkspace\(next\)/);
 assert.equal(shell.match(/persistSelectedWorkspace\(/g)?.length,1);
 assert.doesNotMatch(shell,/initialWorkspaceForPath/);
 assert.doesNotMatch(shell,/persistSelectedWorkspace\('customer'\)/);
 assert.doesNotMatch(guard,/persistSelectedWorkspace/);
 assert.match(selection,/WORKSPACE_SELECTED_EVENT='fixit:workspace-selected'/);
 assert.match(selection,/window\.dispatchEvent\(new CustomEvent/);
});

test('public provider CTA uses the canonical onboarding route',async()=>{
 const landing=await read('app/page.tsx');
 assert.match(landing,/href="\/provider\/onboarding"/);
 assert.doesNotMatch(landing,/href="\/provider\/apply"/);
});

test('cancelled requests stay out of normal customer request views and counters',async()=>{
 const source=await read('app/requests/page.tsx');
 assert.match(source,/!\['COMPLETED','CANCELLED'\]\.includes\(String\(r\.status\)\.toUpperCase\(\)\)/);
 assert.match(source,/requests\.filter\(r=>!\['COMPLETED','CANCELLED'\]\.includes\(String\(r\.status\)\.toUpperCase\(\)\)\)\.length/);
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
