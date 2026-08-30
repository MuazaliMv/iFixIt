import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('customer service tiles have a mobile tap fallback and stale Continue unlock',async()=>{
 const runtime=await read('app/CustomerServiceTapRuntime.tsx');
 const layout=await read('app/layout.tsx');
 assert.match(runtime,/\.c3Wizard \.c3ServiceTile/);
 assert.match(runtime,/pointerup/);
 assert.match(runtime,/touchend/);
 assert.match(runtime,/button\.click\(\)/);
 assert.match(runtime,/\.c3ServiceTile\.selected/);
 assert.match(runtime,/continueButton\.disabled=false/);
 assert.match(layout,/CustomerServiceTapRuntime/);
 assert.match(layout,/<CustomerServiceTapRuntime\/>/);
});
