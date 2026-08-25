import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('admin navigation exposes Service Categories management',async()=>{
 const nav=await read('app/admin/AdminNav.tsx');
 assert.match(nav,/label:'Service Categories',href:'\/admin\/service-categories'/);
 assert.match(nav,/path\.startsWith\('\/admin\/service-categories'\)/);
});

test('service categories page provides admin CRUD controls',async()=>{
 const page=await read('app/admin/service-categories/page.tsx');
 assert.match(page,/admin-service-categories/);
 assert.match(page,/action:form\.id\?'update':'create'/);
 assert.match(page,/action:'delete'/);
 assert.match(page,/Category Name/);
 assert.match(page,/Status/);
 assert.match(page,/Created Date/);
 assert.match(page,/Add Category/);
});
