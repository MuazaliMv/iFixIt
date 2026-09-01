import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Dhivehi localisation provider controls language, direction and persistence',async()=>{
  const provider=await read('app/i18n/I18nProvider.tsx');
  assert.match(provider,/localStorage\.setItem\(STORAGE_KEY,normalized\)/);
  assert.match(provider,/root\.lang=language/);
  assert.match(provider,/root\.dir=language==='dv'\?'rtl':'ltr'/);
  assert.match(provider,/fixit:language-change/);
});

test('root layout installs localisation globally',async()=>{
  const layout=await read('app/layout.tsx');
  assert.match(layout,/import I18nProvider/);
  assert.match(layout,/import '\.\/localization\.css'/);
  assert.match(layout,/<I18nProvider>/);
  assert.match(layout,/<html lang="en" dir="ltr" suppressHydrationWarning>/);
});

test('persistent shell navigation and workspace menu use translations',async()=>{
  const shell=await read('app/IOSWebAppShell.tsx');
  const menu=await read('app/GlobalRoleMenuSSOT.tsx');
  assert.match(shell,/useI18n/);
  assert.match(shell,/t\('workspace_customer'\)/);
  assert.match(shell,/t\('workspace_provider'\)/);
  assert.match(menu,/i18nLanguageSwitch/);
  assert.match(menu,/setLanguage\('dv'\)/);
  assert.match(menu,/t\('sign_out'\)/);
});

test('RTL styles protect Thaana typography and LTR numeric fields',async()=>{
  const css=await read('app/localization.css');
  assert.match(css,/html\[lang="dv"\] body/);
  assert.match(css,/html\[dir="rtl"\] input\[type="tel"\]/);
  assert.match(css,/unicode-bidi:isolate/);
  assert.match(css,/transform:scaleX\(-1\)/);
});

test('English and Dhivehi dictionaries expose required navigation keys',async()=>{
  const en=JSON.parse(await read('app/i18n/en.json'));
  const dv=JSON.parse(await read('app/i18n/dv.json'));
  for(const key of ['nav_home','nav_requests','hero_title','start_request','workspace_customer','sign_out']){
    assert.equal(typeof en[key],'string');
    assert.ok(en[key].length>0);
    assert.equal(typeof dv[key],'string');
    assert.ok(dv[key].length>0);
  }
});
