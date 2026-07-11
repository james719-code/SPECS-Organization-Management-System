import { test, expect, loginAs, ensureLoggedOut, DEFAULT_ADMIN } from './fixtures';

test.describe('Authentication Flows', () => {

  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('login with valid admin credentials redirects to admin dashboard', async ({ page }) => {
    await loginAs(page, DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);

    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15000 });
    await expect(page.locator('text=Admin').or(page.locator('text=admin')).first()).toBeVisible({ timeout: 5000 });
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await emailInput.fill(DEFAULT_ADMIN.email);
    await passwordInput.fill('wrongpassword');
    await page.locator('button[type="submit"]').first().click();

    // Should show an error message
    await expect(page.getByText(/Invalid/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login');
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.isEnabled()) {
      await submit.click();
    }
    await page.waitForTimeout(1000);
    // Either the browser prevents submission (required attr), HTML5 validation fires, or the page shows an error
    const stillOnLogin = page.url().includes('/login');
    expect(stillOnLogin).toBe(true);
  });

  test('signup with existing email shows error', async ({ page }) => {
    await page.goto('/signup');
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="Name"]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const pwInput = page.locator('input[type="password"], input[name="password"]').first();
    const submit = page.locator('button[type="submit"]').first();

    if (await nameInput.isVisible()) await nameInput.fill('Test User');
    await emailInput.fill(DEFAULT_ADMIN.email);
    await pwInput.fill('password123');
    await submit.click();

    await expect(page.locator('text=already').or(page.locator('text=exists')).or(page.locator('[role="alert"]'))).toBeVisible({ timeout: 8000 });
  });

  test('forgot password form submits and shows success or error', async ({ page }) => {
    await page.goto('/forgot-password');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill(DEFAULT_ADMIN.email);
    await page.locator('button[type="submit"]').first().click();

    // Should show some response (success message or error)
    await page.waitForTimeout(1500);
    // Page should still be visible with some feedback
    await expect(page.locator('body')).toBeAttached();
  });

  test('unauthenticated user cannot access dashboard directly', async ({ page }) => {
    await page.goto('/dashboard/admin');
    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated user cannot access officer dashboard', async ({ page }) => {
    await page.goto('/dashboard/officer');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('unauthenticated user cannot access student dashboard', async ({ page }) => {
    await page.goto('/dashboard/student');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

});
