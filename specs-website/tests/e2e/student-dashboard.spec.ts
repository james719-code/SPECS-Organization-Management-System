import { test, expect, loginAs, ensureLoggedOut } from './fixtures';

const STUDENT_USER = {
  email: 'john.doe@student.edu',
  password: 'student123',
};

test.describe('Student Dashboard Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
    await loginAs(page, STUDENT_USER.email, STUDENT_USER.password);
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15000 });
  });

  const studentPages = [
    { path: '/dashboard/student', label: 'My Profile' },
    { path: '/dashboard/student/tutorials', label: 'Student Tutorials' },
    { path: '/dashboard/student/constitution', label: 'Constitution' },
    { path: '/dashboard/student/events', label: 'Event Calendar' },
    { path: '/dashboard/student/attendance', label: 'My Attendance' },
    { path: '/dashboard/student/posts', label: 'My Stories' },
    { path: '/dashboard/student/payments', label: 'My Payments' },
  ];

  for (const { path, label } of studentPages) {
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

  test('student dashboard sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/dashboard/student');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Sidebar/Navigation should have links
    const navItems = page.locator('nav a, aside a');
    const count = await navItems.count();
    expect(count).toBeGreaterThan(3);
  });
});
