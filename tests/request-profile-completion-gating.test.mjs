import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('profile completion Continue follows visible required data',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/disabled=\{saving\|\|!validContact\}/);
 assert.match(source,/disabled=\{saving\|\|!addressFieldsReady\}/);
 assert.doesNotMatch(source,/disabled=\{saving\|\|!selectedAtoll\|\|!selectedIsland\}/);
});

test('saved Maldives location matching tolerates formatting differences',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/normalize\('NFKD'\)/);
 assert.match(source,/\(atoll\|region\|island\|city\|maldives\)/);
 assert.match(source,/sameLocationName\(a\.code,target\)/);
});

test('unresolved hidden location gives an actionable profile path',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/href="\/profile#service-addresses"/);
 assert.match(source,/saved location cannot be resolved/i);
});
