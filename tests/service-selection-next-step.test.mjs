import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('customer request selection proceeds with one service group',async()=>{
 const portal=await read('app/CustomerPortal.tsx');
 assert.match(portal,/if\(current>=1&&\(!serviceCode\|\|!selectedCategory\)\)return'Choose an available service\.'/);
 assert.match(portal,/onClick=\{\(\)=>setServiceCode\(item\.code\)\}/);
 assert.match(portal,/That service is no longer available\. Please choose another service\./);
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
