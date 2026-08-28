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

  // Match only a direct PostgREST builder chain ending in .catch(...), not an
  // unrelated Promise catch later in the same function (for example request.json().catch()).
  const directBuilderCatch = /\.from\([^\n;]*?\)(?:\.[A-Za-z_$][\w$]*\([^\n;]*?\))*\.catch\s*\(/g;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (directBuilderCatch.test(source)) violations.push(path.relative(process.cwd(), file));
    directBuilderCatch.lastIndex = 0;
  }

  assert.deepEqual(
    violations,
    [],
    `Do not call .catch() directly on Supabase PostgREST builders. Await the query inside try/catch instead. Violations: ${violations.join(', ')}`,
  );
});
