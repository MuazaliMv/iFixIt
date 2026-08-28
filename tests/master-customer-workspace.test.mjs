import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../app/home/page.tsx', import.meta.url), 'utf8');
const requestsLayout = readFileSync(new URL('../app/requests/layout.tsx', import.meta.url), 'utf8');
const requestsCss = readFileSync(new URL('../app/requests/master-requests.css', import.meta.url), 'utf8');
const profileLayout = readFileSync(new URL('../app/profile/layout.tsx', import.meta.url), 'utf8');
const profileCss = readFileSync(new URL('../app/profile/master-profile.css', import.meta.url), 'utf8');

test('customer request wizard keeps production logic inside Master Suite shell', () => {
  assert.match(home, /masterCustomerWizard/);
  assert.match(home, /<CustomerPortal\s*\/>/);
  assert.match(home, /<MasterCustomerHome\s*\/>/);
});

test('requests list and detail inherit the Master Suite workspace shell', () => {
  assert.match(requestsLayout, /masterRequestsWorkspace/);
  assert.match(requestsCss, /\.masterRequestsWorkspace/);
  assert.match(requestsCss, /\.c3RequestCard/);
  assert.match(requestsCss, /\.requestModelHeader/);
});

test('profile and service-address UI inherit the Master Suite profile shell', () => {
  assert.match(profileLayout, /masterProfileWorkspace/);
  assert.match(profileCss, /\.masterProfileWorkspace/);
  assert.match(profileCss, /profileFormGrid/);
  assert.match(profileCss, /service-addresses/);
});
