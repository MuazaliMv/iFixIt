import { expect, test } from '@playwright/test';

const projectRef = 'yzlhlilxiszefneshatm';

test('admin dashboard renders operational controls for an Admin session', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(key, JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user: {
        id: 'admin-test-user',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.test',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      },
    }));
  }, { key: `sb-${projectRef}-auth-token` });

  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, profile: { role: 'ADMIN', full_name: 'Test Admin', provider_approved: true } }),
  }));

  // .maybeSingle() asks PostgREST for an object response, so mirror the real
  // singleton response shape rather than returning a one-item array.
  await page.route('**/rest/v1/auth_profiles**', route => route.fulfill({
    status: 200,
    contentType: 'application/vnd.pgrst.object+json',
    body: JSON.stringify({ role: 'ADMIN', full_name: 'Test Admin' }),
  }));

  await page.route('**/functions/v1/admin-operations', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      requests: [
        { status: 'NEW', created_at: new Date().toISOString() },
        { status: 'COMPLETED', created_at: new Date().toISOString() },
      ],
      users: [{ user_id: 'u1' }, { user_id: 'u2' }],
      providers: [{ provider_approved: false, onboarding: { submitted_at: new Date().toISOString() } }],
    }),
  }));

  await page.route('**/functions/v1/admin-escalations', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ escalations: [{ severity: 'HIGH', first_detected_at: new Date().toISOString() }] }),
  }));

  await page.goto('/admin');
  await expect(page.getByText('Admin attention', { exact: true })).toBeVisible();
  await expect(page.getByText('Marketplace status', { exact: true })).toBeVisible();
  await expect(page.getByText('Platform overview', { exact: true })).toBeVisible();
});
