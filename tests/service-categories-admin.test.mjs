import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('legacy service categories route resolves to canonical services manager',async()=>{
 const page=await read('app/admin/service-categories/page.tsx');
 assert.match(page,/redirect\('\/admin\/services'\)/);
});

test('canonical services manager owns category and subcategory CRUD',async()=>{
 const page=await read('app/admin/services/page.tsx');
 assert.match(page,/catalog_list/);
 assert.match(page,/catalog_create_category/);
 assert.match(page,/catalog_update_category/);
 assert.match(page,/catalog_delete_category/);
 assert.match(page,/catalog_create_subcategory/);
 assert.match(page,/catalog_update_subcategory/);
 assert.match(page,/catalog_delete_subcategory/);
 assert.match(page,/Tap to select/);
});

test('AC service catalogue contains the required customer choices',async()=>{
 const migration=await read('migrations/20260826_services_component_ac_catalogue.sql');
 for(const label of [
  'AC Diagnose',
  'New AC Installation',
  'AC Water leak Fix',
  'AC Full Service Outdoor and Indoor',
  'AC indoor service',
  'AC Relocation',
  'Or describe your own issue',
 ]) assert.match(migration,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(migration,/AC_OTHER_ISSUE/);
});
