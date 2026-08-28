import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('saved workspace never grants admin permission',async()=>{
  const shell=await read('app/IOSWebAppShell.tsx');
  assert.match(shell,/const adminSession=signedIn&&accountRole==='ADMIN'/);
  assert.doesNotMatch(shell,/accountRole==='ADMIN'\|\|workspace==='admin'/);
  assert.match(shell,/canAccessPortal\(accountRole,selectedWorkspace,providerApproved\)/);
});

test('provider workspace remains approval gated',async()=>{
  const access=await read('lib/roleAccess.ts');
  const shell=await read('app/IOSWebAppShell.tsx');
  assert.match(access,/if\(portal==='provider'\)return providerApproved&&!providerSuspended/);
  assert.match(shell,/if\(!canAccessPortal\(accountRole,next,providerApproved\)\)return/);
});

test('workspace persistence happens only in explicit switch action',async()=>{
  const shell=await read('app/IOSWebAppShell.tsx');
  assert.equal(shell.match(/persistSelectedWorkspace\(/g)?.length,1);
  assert.match(shell,/function openWorkspace\(next:PortalRole\)/);
});
