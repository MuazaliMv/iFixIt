import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('customer request selection proceeds with one service group',async()=>{
 const portal=await read('app/CustomerPortal.tsx');
 assert.match(portal,/if\(step===1&&!selectedService\)\{setMessage\('Choose a service\.'\);return;\}/);
 assert.match(portal,/onClick=\{\(\)=>setServiceCode\(item\.code\)\}/);
 assert.match(portal,/type Step=1\|2\|3\|4\|5/);
 assert.match(portal,/Step \{step\} of 5/);
 assert.match(portal,/setStep\(Math\.min\(5,step\+1\) as Step\)/);
 assert.doesNotMatch(portal,/subcategor/i);
 assert.doesNotMatch(portal,/serviceSubcategoryCode/);
 assert.doesNotMatch(portal,/c3Subchips/);
});

test('landing and global runtime no longer expose child service choices',async()=>{
 const landing=await read('app/page.tsx');
 const layout=await read('app/layout.tsx');
 assert.doesNotMatch(landing,/subcategor/i);
 assert.doesNotMatch(layout,/ACCustomIssueRuntime/);
});
