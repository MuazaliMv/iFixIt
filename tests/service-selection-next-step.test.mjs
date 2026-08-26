import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('service selection runtime blocks Continue until selection is complete',async()=>{
 const runtime=await read('app/ACCustomIssueRuntime.tsx');
 assert.match(runtime,/const selectionComplete=Boolean\(category\).*children\.length===0.*Boolean\(subcategory\)/s);
 assert.match(runtime,/const disabled=!ready/);
 assert.match(runtime,/if\(button\.disabled!==disabled\)button\.disabled=disabled/);
 assert.match(runtime,/Select a service to continue\./);
 assert.match(runtime,/Now select a service type\./);
 assert.match(runtime,/Selection complete\. Continue to choose the service location\./);
});

test('custom AC issue remains required and limited to 30 characters',async()=>{
 const runtime=await read('app/ACCustomIssueRuntime.tsx');
 assert.match(runtime,/input\.maxLength=30/);
 assert.match(runtime,/Describe your issue to continue\./);
 assert.match(runtime,/const customValid=!ownIssueSelected/);
});
