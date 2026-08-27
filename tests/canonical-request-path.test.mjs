import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RUNTIME_ROOTS = ['app', 'lib'];
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function extension(path) {
  const match = path.match(/\.[^.\/]+$/);
  return match?.[0] ?? '';
}

test('runtime code never reads from or writes to legacy repair_requests', async () => {
  const violations = [];
  for (const root of RUNTIME_ROOTS) {
    const fullRoot = join(ROOT, root);
    try {
      if (!(await stat(fullRoot)).isDirectory()) continue;
    } catch {
      continue;
    }

    for (const file of await walk(fullRoot)) {
      if (!ALLOWED_EXTENSIONS.has(extension(file))) continue;
      const source = await readFile(file, 'utf8');
      if (/\brepair_requests\b/.test(source)) {
        violations.push(relative(ROOT, file));
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Legacy repair_requests must not be referenced by runtime code. Use request_intake -> service_jobs instead. Violations: ${violations.join(', ')}`,
  );
});

test('canonical request system remains request_intake -> service_jobs', async () => {
  const migration = await readFile(join(ROOT, 'migrations', '0019_normalized_service_job_lifecycle.sql'), 'utf8');
  assert.match(migration, /service_jobs/i);
  assert.match(migration, /request_intake/i);
});
