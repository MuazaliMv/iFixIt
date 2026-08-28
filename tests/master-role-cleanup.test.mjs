import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roleCss=fs.readFileSync(new URL('../app/master-role-workspaces.css', import.meta.url),'utf8');
const adminLayout=fs.readFileSync(new URL('../app/admin/layout.tsx', import.meta.url),'utf8');
const onboarding=fs.readFileSync(new URL('../app/provider/onboarding/page.tsx', import.meta.url),'utf8');

test('provider onboarding inherits Master role styling even before provider workspace is active',()=>{
 assert.match(onboarding,/className="formGrid onboardingForm"/);
 assert.match(roleCss,/\.shell:has\(\.onboardingForm\)/);
 assert.match(roleCss,/linear-gradient\(135deg,#064e3b,#0ea5e9\)/);
});

test('admin layout no longer loads the retired navigation stylesheet',()=>{
 assert.match(adminLayout,/admin-system\.css/);
 assert.doesNotMatch(adminLayout,/admin-nav-system\.css/);
});
