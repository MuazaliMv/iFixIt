import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const providerPage=fs.readFileSync(new URL('../app/provider/page.tsx',import.meta.url),'utf8');
const providerDashboard=fs.readFileSync(new URL('../app/provider/MasterProviderDashboard.tsx',import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../app/master-role-workspaces.css',import.meta.url),'utf8');

test('provider root renders the Master dashboard instead of redirecting to legacy jobs',()=>{
 assert.match(providerPage,/MasterProviderDashboard/);
 assert.doesNotMatch(providerPage,/redirect\(/);
});

test('provider dashboard keeps live offer and marketplace APIs',()=>{
 assert.match(providerDashboard,/provider-offers/);
 assert.match(providerDashboard,/provider-marketplace/);
 assert.match(providerDashboard,/\/provider\/location/);
 assert.match(providerDashboard,/\/provider\/messages/);
});

test('shared provider-admin style layer loads after previous Master Suite layer',()=>{
 const prior=layout.indexOf("import './master-suite-live.css'");
 const shared=layout.indexOf("import './master-role-workspaces.css'");
 assert.ok(prior>=0&&shared>prior);
});

test('shared style layer is explicitly scoped to provider and admin workspaces',()=>{
 assert.match(styles,/data-fixit-workspace=\"provider\"/);
 assert.match(styles,/data-fixit-workspace=\"admin\"/);
 assert.match(styles,/masterRoleHero\.providerHero/);
});
