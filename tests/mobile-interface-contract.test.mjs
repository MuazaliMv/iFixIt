import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const layoutPath = new URL('../app/layout.tsx', import.meta.url);
const contractPath = new URL('../app/mobile-interface-contract.css', import.meta.url);

test('mobile interface contract is the final global CSS layer', async () => {
  const layout = await readFile(layoutPath, 'utf8');
  const shellImport = layout.indexOf("import './global-shell.css';");
  const contractImport = layout.indexOf("import './mobile-interface-contract.css';");

  assert.ok(shellImport >= 0, 'global shell CSS must remain imported');
  assert.ok(contractImport > shellImport, 'mobile interface contract must load after the shell and legacy global CSS');
});

test('root viewport remains mobile-safe', async () => {
  const layout = await readFile(layoutPath, 'utf8');

  assert.match(layout, /width:\s*'device-width'/);
  assert.match(layout, /initialScale:\s*1/);
  assert.match(layout, /viewportFit:\s*'cover'/);
});

test('mobile contract protects touch, form, safe-area and overflow behavior', async () => {
  const css = await readFile(contractPath, 'utf8');

  assert.match(css, /--mobile-touch-min:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*960px\)/);
  assert.match(css, /font-size:\s*16px\s*!important/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /100dvh/);
  assert.match(css, /prefers-reduced-motion/);
});
