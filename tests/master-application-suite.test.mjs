import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const runtime = readFileSync(new URL('../app/CompleteApplicationRuntime.tsx', import.meta.url), 'utf8');
const workspaceSelection = readFileSync(new URL('../lib/workspaceSelection.ts', import.meta.url), 'utf8');

test('Master Suite maps production routes to the intended workspaces', () => {
  assert.match(runtime, /pathname === '\/home'/);
  assert.match(runtime, /pathname === '\/requests'/);
  assert.match(runtime, /pathname\.startsWith\('\/provider'\)/);
  assert.match(runtime, /pathname\.startsWith\('\/admin'\)/);
  assert.match(runtime, /dataset\.fixitWorkspace/);
  assert.match(runtime, /dataset\.fixitView/);
});

test('Master Suite presentation does not become a competing workspace state store', () => {
  assert.doesNotMatch(runtime, /localStorage\.setItem/);
  assert.doesNotMatch(runtime, /fixit:mobile-nav-role/);
  assert.doesNotMatch(runtime, /fixit:app-mode/);
  assert.match(workspaceSelection, /WORKSPACE_STORAGE_KEY='fixit:selected-workspace'/);
  assert.match(workspaceSelection, /persistSelectedWorkspace/);
});

test('Master Suite keeps the supplied workspace terminology in production presentation', () => {
  assert.match(runtime, /Need a repair today\?/);
  assert.match(runtime, /Your Service Requests/);
  assert.match(runtime, /Provider Operations/);
  assert.match(runtime, /Service Provider Application/);
  assert.match(runtime, /Admin Control Panel/);
});
