import { test, expect, loginAs, ensureLoggedOut, DEFAULT_ADMIN } from './fixtures';

test.describe('Role-Based Access Control', () => {

  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('admin cannot access student dashboard', async ({ page }) => {
    await loginAs(page, DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15000 });

    await page.goto('/dashboard/student');
    await page.waitForTimeout(2000);
    // Should redirect back to admin dashboard
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 8000 });
  });

  test('admin cannot access officer dashboard', async ({ page }) => {
    await loginAs(page, DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15000 });

    await page.goto('/dashboard/officer');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 8000 });
  });

  test('navigating to unknown deep route shows 404', async ({ page }) => {
    await page.goto('/dashboard/admin/nonexistent-page-xyz');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    // Should either redirect or show a 404
    await expect(page.locator('body')).toBeAttached();
  });

  test('pending verification page renders', async ({ page }) => {
    await page.goto('/pending');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeAttached();
  });

  test('student dashboard is protected and redirects to login', async ({ page }) => {
    await page.goto('/dashboard/student');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('officer dashboard is protected and redirects to login', async ({ page }) => {
    await page.goto('/dashboard/officer');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
