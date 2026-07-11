import { test, expect, loginAs, ensureLoggedOut } from './fixtures';

const OFFICER_USER = {
  email: 'maria.santos@student.edu',
  password: 'officer123',
};

test.describe('Officer Dashboard Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
    await loginAs(page, OFFICER_USER.email, OFFICER_USER.password);
    await expect(page).toHaveURL(/\/dashboard\/officer/, { timeout: 15000 });
  });

  const officerPages = [
    { path: '/dashboard/officer', label: 'Overview' },
    { path: '/dashboard/officer/profile', label: 'My Profile' },
    { path: '/dashboard/officer/my-attendance', label: 'My Attendance' },
    { path: '/dashboard/officer/constitution', label: 'Constitution' },
    { path: '/dashboard/officer/tutorials', label: 'Officer Tutorials' },
    { path: '/dashboard/officer/students', label: 'Students' },
    { path: '/dashboard/officer/volunteers', label: 'Volunteers' },
    { path: '/dashboard/officer/events', label: 'Events' },
    { path: '/dashboard/officer/attendance', label: 'Attendance logs' },
    { path: '/dashboard/officer/non-org-events', label: 'Non-Org Events' },
    { path: '/dashboard/officer/stories', label: 'Stories' },
    { path: '/dashboard/officer/files', label: 'Files' },
    { path: '/dashboard/officer/tasks', label: 'Tasks' },
    { path: '/dashboard/officer/file-exports', label: 'File Exports' },
    { path: '/dashboard/officer/finance', label: 'Finance Summary' },
    { path: '/dashboard/officer/payments', label: 'Payments Tracker' },
  ];

  for (const { path, label } of officerPages) {
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

  test('officer dashboard sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/dashboard/officer');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Sidebar/Navigation should have links
    const navItems = page.locator('nav a, aside a');
    const count = await navItems.count();
    expect(count).toBeGreaterThan(5);
  });
});
