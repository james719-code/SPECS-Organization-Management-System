import { test as base, expect } from '@playwright/test';

/**
 * Mock auth helpers. The app uses localStorage `appwrite_session` for session tracking.
 * The mock API seeds a default admin account (admin@specs.org / password123).
 */

export const DEFAULT_ADMIN = {
  email: 'admin@specs.org',
  password: 'admin123',
  role: 'admin',
};

export async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 }).catch(() => {});
  const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]')).first();
  const passwordInput = page.locator('input[type="password"]').or(page.locator('input[name="password"]')).first();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
}

export async function ensureLoggedOut(page: any) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('appwrite_session');
    localStorage.removeItem('theme');
    sessionStorage.clear();
  });
}

export const test = base;
export { expect };
