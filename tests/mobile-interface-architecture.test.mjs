import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shellUrl = new URL('../app/IOSWebAppShell.tsx', import.meta.url);
const menuUrl = new URL('../app/GlobalRoleMenuSSOT.tsx', import.meta.url);
const cssUrl = new URL('../app/global-shell.css', import.meta.url);
const requestUrl = new URL('../app/requests/page.tsx', import.meta.url);

test('mobile shell keeps exactly four role-specific destinations', async () => {
  const source = await readFile(shellUrl, 'utf8');
  for (const label of ['Home','Requests','Bookings','Profile','Dashboard','Jobs','Earnings','Overview','Users','Dispatches','Settings/Profile']) {
    assert.match(source, new RegExp(`label:'${label.replace('/','\\/')}'`), `Missing required bottom-nav label: ${label}`);
  }
  assert.doesNotMatch(source, /hasWorkspaceSwitch/);
  assert.doesNotMatch(source, /<span>Switch<\/span>/);
  assert.match(source, /persistSelectedWorkspace\(next\)/);
  assert.match(source, /fixit:open-workspace-switch/);
});

test('workspace switching is deliberate and lives outside bottom navigation', async () => {
  const source = await readFile(menuUrl, 'utf8');
  assert.match(source, />Switch Workspace<\/button>/);
  assert.match(source, /dispatchEvent\(new Event\('fixit:open-workspace-switch'\)\)/);
  assert.doesNotMatch(source, /secondary:\{href:'\/messages'/);
});

test('authenticated app has one fixed mobile viewport and one scroll container', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /body:has\(>\.ssotMenuHeader\).*overflow:hidden/s);
  assert.match(css, />\.globalMainWorkspace[\s\S]*overflow-y:auto/);
  assert.match(css, />\.iosTabBar[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /--ifix-shell-max:28rem/);
  assert.match(css, /\.c3ActionDock[\s\S]*bottom:calc\(var\(--global-bottom-nav-height\) \+ 8px\)/);
});

test('request cards expose text status plus centralized tone classes and bookings view', async () => {
  const source = await readFile(requestUrl, 'utf8');
  const css = await readFile(cssUrl, 'utf8');
  assert.match(source, /statusClass\(status\)/);
  assert.match(source, /view'\)==='bookings'/);
  assert.match(source, /Request ID:/);
  assert.match(source, /service_location_text/);
  assert.match(source, /Attached Photos/);
  assert.match(css, /status-pending/);
  assert.match(css, /status-processing/);
  assert.match(css, /status-completed/);
  assert.match(css, /status-cancelled/);
});
