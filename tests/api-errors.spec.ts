/**
 * Transport-layer error handling: what the API client does when a response
 * never arrives as JSON, or when the server cannot be reached at all.
 */
import { test, expect } from '@playwright/test';

test.describe('API transport error handling', () => {
  test('a 502 from the proxy is logged with detail and reported as unavailable', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });

    // Stands in for the dev proxy failing to reach a stopped backend.
    await page.route('**/api/v1/auth/login-lockout*', (route) =>
      route.fulfill({ status: 502, contentType: 'text/html', body: '' }));

    await page.goto('/login');
    await expect(page.locator('input#email')).toBeEnabled();
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // The log must carry enough to diagnose it, not just an empty body.
    const diagnostic = logs.find((l) => l.includes('/auth/login-lockout'));
    expect(diagnostic, 'a diagnostic log should be emitted').toBeTruthy();
    expect(diagnostic).toContain('502');
    expect(diagnostic).toContain('content-type');
  });

  test('a 502 on login is reported as temporarily unavailable', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({ status: 502, contentType: 'text/html', body: '' }));

    await page.goto('/login');
    await page.fill('input#email', 'tester22@gmail.com');
    await page.fill('input#password', 'Password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=temporarily unavailable')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lingq_token'))).toBeNull();
  });

  test('a hard network failure is reported clearly, not as "Failed to fetch"', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) => route.abort('connectionrefused'));

    await page.goto('/login');
    await page.fill('input#email', 'tester22@gmail.com');
    await page.fill('input#password', 'Password123');
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Can't reach the server")).toBeVisible();
    // The raw TypeError text must never reach the user.
    await expect(page.locator('text=Failed to fetch')).toHaveCount(0);
  });

  test('a 200 with a non-JSON body does not crash the screen', async ({ page }) => {
    await page.route('**/api/v1/auth/login-lockout*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>oops</html>' }));

    await page.goto('/login');

    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('a dead lockout check never blocks signing in', async ({ page }) => {
    await page.route('**/api/v1/auth/login-lockout*', (route) =>
      route.fulfill({ status: 502, contentType: 'text/html', body: '' }));

    await page.goto('/login');

    // The lockout endpoint failing must leave the form fully usable.
    await expect(page.locator('input#email')).toBeEnabled();
    await expect(page.locator('input#password')).toBeEnabled();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });
});
