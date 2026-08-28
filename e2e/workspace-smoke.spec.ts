import { expect, test, type Page } from '@playwright/test';

const profileByRole = {
  customer: { role: 'CUSTOMER', full_name: 'Test Customer', provider_approved: false },
  provider: { role: 'PROVIDER', full_name: 'Test Provider', provider_approved: true },
  admin: { role: 'ADMIN', full_name: 'Test Admin', provider_approved: true },
};

async function mockApi(page: Page, role: keyof typeof profileByRole) {
  const profile = profileByRole[role];
  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, profile }),
  }));
  await page.route('**/api/user/profile', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ profile }),
  }));
  await page.route('**/api/services/catalog', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ services: [
      { id: 'svc-1', code: 'PLUMBING', name: 'Plumbing' },
      { id: 'svc-2', code: 'ELECTRICAL', name: 'Electrical' },
    ] }),
  }));
  await page.route('**/api/legacy-edge?service=provider-onboarding', async route => {
    const request = route.request();
    let action = 'get';
    try { action = JSON.parse(request.postData() || '{}').action || 'get'; } catch {}
    const body = action === 'get' ? {
      profile: {
        provider_type: 'INDIVIDUAL', public_name: 'Test Provider', business_name: '',
        onboarding_status: role === 'provider' || role === 'admin' ? 'APPROVED' : 'DRAFT',
        approved_at: role === 'provider' || role === 'admin' ? new Date().toISOString() : null,
        availability_status: 'BY_APPOINTMENT',
      },
      authProfile: profile,
      categories: [{ id: 'svc-1', code: 'PLUMBING', name: 'Plumbing' }],
      selectedCategoryIds: ['svc-1'],
      hours: [],
      serviceAreas: [{ islandId: 'island-1', atollId: 'atoll-1', islandName: 'Malé', locationUnitId: null }],
    } : { onboardingStatus: 'DRAFT' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/api/legacy-edge?service=provider-subscription', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ subscription: { status: 'ACTIVE', active: true, daysRemaining: 30, current_period_ends_at: new Date(Date.now() + 86400000 * 30).toISOString(), priceMvr: 0, gateway: 'TEST' } }),
  }));
  await page.route('**/api/legacy-edge?service=provider-offers', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ offers: [{ id: 'offer-1', request: { ticket_number: 'FX-1001', service_name: 'Plumbing', service_location_text: 'Malé' } }] }),
  }));
  await page.route('**/api/legacy-edge?service=provider-marketplace', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ requests: [{ ticket_number: 'FX-1002', service_name: 'Electrical', service_location_text: 'Malé', status: 'ACCEPTED' }] }),
  }));
  await page.route('**/api/legacy-edge?service=location-catalogue', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ atolls: [{ id: 'atoll-1', code: 'MLE', display_name: 'Malé City' }], islands: [{ id: 'island-1', atoll_id: 'atoll-1', display_name: 'Malé' }], locationUnits: [] }),
  }));
  await page.route('**/api/legacy-edge?service=provider-setup-data', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ documents: [{ id: 'doc-1', document_type: 'ID_CARD', review_status: 'APPROVED' }] }),
  }));
}

test('protected customer route sends unauthenticated users to login', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/user/profile', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login\?next=/);
});

test('customer home renders the Master customer workspace', async ({ page }) => {
  await mockApi(page, 'customer');
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Hi Test' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What needs fixing today?' })).toBeVisible();
  await expect(page.getByText('Plumbing', { exact: true }).first()).toBeVisible();
});

test('provider dashboard renders live operational cards with mocked backend data', async ({ page }) => {
  await mockApi(page, 'provider');
  await page.goto('/provider');
  await expect(page.getByRole('heading', { name: 'Service Provider' })).toBeVisible();
  await expect(page.getByText('1 new request waiting')).toBeVisible();
  await expect(page.getByText('Electrical', { exact: true })).toBeVisible();
});

test('provider onboarding stays an Admin-reviewed application', async ({ page }) => {
  await mockApi(page, 'customer');
  await page.goto('/provider/onboarding');
  await expect(page.getByRole('heading', { name: 'Become a Service Provider' })).toBeVisible();
  await expect(page.getByText('Provider capability is added only after Admin approval.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit for Admin Approval' })).toBeVisible();
});

test('explicit workspace selection persists across navigation', async ({ page }) => {
  await mockApi(page, 'provider');
  await page.addInitScript(() => localStorage.setItem('fixit:selected-workspace', 'provider'));
  await page.goto('/provider');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fixit:selected-workspace'))).toBe('provider');
  await page.goto('/provider/jobs');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fixit:selected-workspace'))).toBe('provider');
});
