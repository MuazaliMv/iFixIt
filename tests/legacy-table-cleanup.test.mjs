import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function files(dir){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const p=join(dir,entry.name);
    if(entry.isDirectory()) out.push(...await files(p));
    else if(/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

test('runtime code does not use legacy repair catalogue tables', async()=>{
  const targets=['repair_requests','repair_services','service_subcategories'];
  const runtime=[...(await files('app')),...(await files('lib'))];
  const offenders=[];
  for(const path of runtime){
    const text=await readFile(path,'utf8');
    for(const table of targets){
      if(text.includes(table)) offenders.push(`${path}: ${table}`);
    }
  }
  assert.deepEqual(offenders,[],`Legacy repair catalogue references found:\n${offenders.join('\n')}`);
});
