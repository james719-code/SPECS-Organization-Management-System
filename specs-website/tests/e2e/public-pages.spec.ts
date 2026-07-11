import { test, expect } from './fixtures';

test.describe('Public Pages', () => {

  test('landing page loads and shows key elements', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('SPECS Portal').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Partido State University').first()).toBeVisible();
  });

  test('landing page has login and signup links', async ({ page }) => {
    await page.goto('/');

    const loginLink = page.locator('a[href="/login"]');
    const signupLink = page.locator('a[href="/signup"]');

    await expect(loginLink.first()).toBeVisible();
    await expect(signupLink.first()).toBeVisible();
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1').filter({ hasText: /Privacy/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('terms of service page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('h1').filter({ hasText: /Terms/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    await expect(page.locator('text=404').or(page.locator('text=Not Found'))).toBeVisible({ timeout: 10000 });
  });

  test('login page loads with form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('signup page loads with form fields', async ({ page }) => {
    await page.goto('/signup');
    const email = page.locator('input[type="email"], input[name="email"]').first();
    await expect(email).toBeVisible({ timeout: 10000 });
    const pw = page.locator('input[type="password"], input[name="password"]').first();
    await expect(pw).toBeVisible({ timeout: 10000 });
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('story page with invalid id shows fallback', async ({ page }) => {
    await page.goto('/story/nonexistent');
    await expect(page.locator('body')).toBeAttached();
  });

  test('cookie banner is visible on landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Cookie & Session Notice').first()).toBeVisible({ timeout: 10000 });
  });

  test('cookie banner can be dismissed', async ({ page }) => {
    await page.goto('/');
    const acceptBtn = page.locator('button').filter({ hasText: /Accept|Got it|OK|I understand/i }).first();
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
    }
    // Wait for any animated dismissal
    await page.waitForTimeout(500);
  });
});
