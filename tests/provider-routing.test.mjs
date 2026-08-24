import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('provider workspace never redirects an authorised provider to the public landing page',async()=>{
 const source=await read('app/provider/useProviderMode.ts');
 assert.doesNotMatch(source,/window\.location\.href\s*=\s*['\"]\/['\"]/);
 assert.match(source,/status:'SETUP_REQUIRED'/);
 assert.match(source,/ready:true/);
});

test('provider portal access remains role based at the server gate',async()=>{
 const access=await read('lib/roleAccess.ts');
 const proxy=await read('proxy.ts');
 assert.match(access,/portal==='provider'\)return role==='PROVIDER'\|\|role==='ADMIN'/);
 assert.match(proxy,/Service Provider permission required/);
 assert.match(proxy,/NextResponse\.redirect\(new URL\('\/home'/);
});
