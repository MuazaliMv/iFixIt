import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('customer dispatch UI has no provider-selection or wait-more action',async()=>{
 const source=await read('app/DispatchLivePanel.tsx');
 assert.doesNotMatch(source,/Select Provider/);
 assert.doesNotMatch(source,/Wait for More/);
 assert.doesNotMatch(source,/Choose a provider/);
 assert.match(source,/first eligible provider who accepts is assigned automatically/i);
 assert.match(source,/You do not need to choose or confirm a provider/i);
});

test('latest migration retires customer confirmation and customer response timeouts',async()=>{
 const source=await read('migrations/0101_unify_provider_acceptance_flow.sql');
 assert.match(source,/customer confirmation is not part of the\s+--\s+acceptance path/i);
 assert.match(source,/Provider assignment is automatic after provider acceptance; customer selection is not required/);
 assert.match(source,/'customer_retries',0/);
 assert.match(source,/'customer_timeouts',0/);
 assert.match(source,/dispatch_state='SECURED'/);
 assert.match(source,/status='ACCEPTED'/);
 assert.match(source,/CREATE OR REPLACE FUNCTION public\.customer_select_marketplace_provider/);
 assert.match(source,/A provider is already assigned to this request/);
});

test('provider job card explains immediate assignment and shows no more than three request photos',async()=>{
 const source=await read('app/provider/jobs/page.tsx');
 assert.match(source,/assigns this request to you immediately/i);
 assert.match(source,/customer does not need to choose or confirm you/i);
 assert.match(source,/slice\(0,3\)/);
 assert.doesNotMatch(source,/slice\(0,5\)/);
});
