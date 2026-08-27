import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const roots=['app','lib'];
const allowedExtensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);
function walk(dir){
 const out=[];
 if(!fs.existsSync(dir))return out;
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())out.push(...walk(full));
  else if(allowedExtensions.has(path.extname(entry.name)))out.push(full);
 }
 return out;
}

test('runtime code does not query legacy public.users',()=>{
 const offenders=[];
 for(const root of roots){
  for(const file of walk(root)){
   const text=fs.readFileSync(file,'utf8');
   if(/\.from\(\s*['"]users['"]\s*\)/.test(text))offenders.push(file);
  }
 }
 assert.deepEqual(offenders,[],`Legacy users table referenced by runtime code: ${offenders.join(', ')}`);
});
