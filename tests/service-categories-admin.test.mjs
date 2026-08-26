import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('legacy service categories route resolves to canonical services manager',async()=>{
 const page=await read('app/admin/service-categories/page.tsx');
 assert.match(page,/redirect\('\/admin\/services'\)/);
});

test('canonical services manager owns service-group CRUD without subcategories',async()=>{
 const page=await read('app/admin/services/page.tsx');
 assert.match(page,/catalog_list/);
 assert.match(page,/catalog_create_category/);
 assert.match(page,/catalog_update_category/);
 assert.match(page,/catalog_delete_category/);
 assert.doesNotMatch(page,/subcategor/i);
 assert.match(page,/Tap to select/);
});

test('database migration retires every supported subcategory representation',async()=>{
 const migration=await read('migrations/20260826_services_component_remove_subcategories.sql');
 assert.match(migration,/UPDATE service_subcategories[\s\S]*is_active = false/);
 assert.match(migration,/service_categories_must_be_top_level/);
 assert.match(migration,/request_intake_has_no_service_subcategory/);
 assert.match(migration,/DELETE FROM request_form_fields[\s\S]*service_subcategory/);
});
