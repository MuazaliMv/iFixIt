import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('legacy repair tables are retired without cascade',async()=>{
 const migration=await read('supabase/migrations/20260827_retire_legacy_repair_tables.sql');
 const executable=migration.replace(/--.*$/gm,'');
 assert.match(migration,/drop table public\.repair_requests;/);
 assert.match(migration,/drop table public\.repair_services;/);
 assert.match(migration,/drop table public\.service_subcategories;/);
 assert.doesNotMatch(executable,/drop\s+table[\s\S]*?\bcascade\b/i);
});

test('provider notification ticket lookup uses canonical request_intake',async()=>{
 const migration=await read('supabase/migrations/20260827_retire_legacy_repair_tables.sql');
 assert.match(migration,/from public\.request_intake where id=new\.request_id/);
 assert.doesNotMatch(migration,/from public\.repair_requests where id=new\.request_id/);
});
