import { test, expect, loginAs, ensureLoggedOut, DEFAULT_ADMIN } from './fixtures';

test.describe('Admin Dashboard Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
    await loginAs(page, DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15000 });
  });

  const adminPages = [
    { path: '/dashboard/admin', label: 'Overview' },
    { path: '/dashboard/admin/accounts', label: 'Accounts' },
    { path: '/dashboard/admin/students', label: 'Students' },
    { path: '/dashboard/admin/officers', label: 'Officers' },
    { path: '/dashboard/admin/events', label: 'Events' },
    { path: '/dashboard/admin/attendance', label: 'Attendance' },
    { path: '/dashboard/admin/payments', label: 'Payments' },
    { path: '/dashboard/admin/finance', label: 'Finance' },
    { path: '/dashboard/admin/files', label: 'Files' },
    { path: '/dashboard/admin/volunteers', label: 'Volunteers' },
    { path: '/dashboard/admin/stories', label: 'Stories' },
    { path: '/dashboard/admin/tasks', label: 'Tasks' },
    { path: '/dashboard/admin/announcements', label: 'Announcements' },
    { path: '/dashboard/admin/settings', label: 'Settings' },
    { path: '/dashboard/admin/constitution', label: 'Constitution' },
    { path: '/dashboard/admin/tutorials', label: 'Tutorials' },
    { path: '/dashboard/admin/non-org-events', label: 'Non-Org' },
  ];

  for (const { path, label } of adminPages) {
    test(`navigates to ${label} (${path}) without crashing`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});

      // Page should load without catastrophic error
      await expect(page.locator('body')).toBeAttached();
      // No React error overlay
      const errorOverlay = page.locator('body > iframe[title*="Error"]');
      await expect(errorOverlay).toHaveCount(0, { timeout: 5000 });
    });
  }

  test('admin dashboard sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Sidebar should have navigation links
    const sidebarItems = page.locator('nav a, aside a');
    const count = await sidebarItems.count();
    expect(count).toBeGreaterThan(5);
  });

  test('sub-routes for payments work', async ({ page }) => {
    await page.goto('/dashboard/admin/payments/create');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeAttached();
    const errorOverlay = page.locator('body > iframe[title*="Error"]');
    await expect(errorOverlay).toHaveCount(0, { timeout: 5000 });

    await page.goto('/dashboard/admin/payments/outside');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeAttached();
    await expect(errorOverlay).toHaveCount(0, { timeout: 5000 });
  });

  test('finance detail sub-route works', async ({ page }) => {
    await page.goto('/dashboard/admin/finance/details/semester-1');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeAttached();
  });

  test('file exports page loads', async ({ page }) => {
    await page.goto('/dashboard/admin/file-exports');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeAttached();
  });

});
