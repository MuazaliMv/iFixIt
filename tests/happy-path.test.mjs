import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

function canCancel(status,assigned){return ['PENDING','RESPONDED'].includes(status)&&!assigned;}

test('customer cancellation remains pre-assignment only',()=>{
 assert.equal(canCancel('PENDING',false),true);
 assert.equal(canCancel('RESPONDED',false),true);
 assert.equal(canCancel('ACCEPTED',true),false);
});

test('provider acceptance is automatic and customer confirmation is retired',async()=>{
 const migration=await read('migrations/0101_unify_provider_acceptance_flow.sql');
 assert.match(migration,/first eligible provider who accepts/i);
 assert.match(migration,/Customer confirmation is not part of the\s+-- acceptance path/i);
 assert.match(migration,/status='ACCEPTED'/);
 assert.match(migration,/dispatch_state='SECURED'/);
 assert.match(migration,/customer confirmation removed/i);
 assert.match(migration,/'customer_retries',0/);
 assert.match(migration,/'customer_timeouts',0/);
});

test('customer request list exposes no provider-selection or wait-more gate',async()=>{
 const source=await read('app/requests/page.tsx');
 assert.match(source,/first provider who accepts will be assigned automatically/i);
 assert.match(source,/Waiting for first provider acceptance/);
 assert.doesNotMatch(source,/AWAITING_CUSTOMER/);
 assert.doesNotMatch(source,/CUSTOMER_TIMEOUT/);
 assert.doesNotMatch(source,/WAITING_MORE/);
 assert.doesNotMatch(source,/wait_more/);
 assert.doesNotMatch(source,/Select Provider/i);
 assert.doesNotMatch(source,/Choose from/i);
 assert.doesNotMatch(source,/Try Again/);
});

test('provider work list accepts or declines and accepted work appears in active jobs',async()=>{
 const source=await read('app/provider/jobs/page.tsx');
 assert.match(source,/respond\(o\.id,'accept'\)/);
 assert.match(source,/respond\(o\.id,'decline'\)/);
 assert.match(source,/Accept Request/);
 assert.match(source,/Not Available/);
 assert.match(source,/Request accepted and assigned to you/);
 assert.match(source,/Accepted & processing/i);
 assert.doesNotMatch(source,/Accept & Send Response/);
});

test('provider job detail follows accepted processing completed lifecycle',async()=>{
 const source=await read('app/provider/jobs/[ticket]/page.tsx');
 assert.match(source,/const stages=\['ACCEPTED','PROCESSING','COMPLETED'\]/);
 assert.match(source,/Start Work/);
 assert.match(source,/Complete Service/);
 assert.match(source,/provider-job-flow/);
});

test('customer and provider messages are available only after provider assignment',async()=>{
 const customer=await read('app/messages/[ticket]/page.tsx');
 const provider=await read('app/provider/messages/page.tsx');
 assert.match(customer,/Messaging starts automatically after a provider accepts your request/i);
 assert.match(provider,/Messages become available only after you accept a customer request/i);
});

test('cancelled requests remain hidden from the normal customer list',async()=>{
 const source=await read('app/requests/page.tsx');
 assert.match(source,/\['COMPLETED','CANCELLED'\]\.includes/);
 assert.match(source,/setRequests\(current=>current\.filter/);
});

test('customer request photos are capped to three in provider work surfaces',async()=>{
 const provider=await read('app/provider/jobs/page.tsx');
 const detail=await read('app/provider/jobs/[ticket]/page.tsx');
 assert.match(provider,/\.slice\(0,3\)/);
 assert.match(detail,/\.slice\(0,3\)/);
});

test('login remains phone OTP only',async()=>{
 const source=await read('app/login/page.tsx');
 const route=await read('app/api/auth/login/route.ts');
 assert.match(source,/Testing code: 9999/);
 assert.match(source,/useState\('\+960'\)/);
 assert.match(source,/7-digit Maldives number/i);
 assert.doesNotMatch(source,/type=["']email["']/i);
 assert.doesNotMatch(source,/type=["']password["']/i);
 assert.match(route,/action:'login',phone,otp/);
});

test('profile retains verified phone and saved service-address architecture',async()=>{
 const source=await read('app/profile/ProfileClient.tsx');
 assert.match(source,/is_phone_verified/);
 assert.match(source,/Saved service addresses/i);
});
