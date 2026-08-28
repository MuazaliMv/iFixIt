import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const apiRoot = new URL('../app/api/', import.meta.url);

async function collectTsFiles(dirUrl) {
  const dirPath = dirUrl.pathname;
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) files.push(...await collectTsFiles(new URL(`file://${full}/`)));
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

test('Supabase PostgREST builders are awaited instead of Promise catch-chained', async () => {
  const files = await collectTsFiles(apiRoot);
  const violations = [];
  const builderCatch = /\.from\([^)]*\)[\s\S]{0,1800}?\.catch\s*\(/g;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (builderCatch.test(source)) violations.push(path.relative(process.cwd(), file));
    builderCatch.lastIndex = 0;
  }

  assert.deepEqual(
    violations,
    [],
    `Do not call .catch() directly on Supabase PostgREST builders. Await the query inside try/catch instead. Violations: ${violations.join(', ')}`,
  );
});
