/**
 * PW-015..017 — session and protected-route regression suite.
 *
 * These guard the boundaries between authenticated and unauthenticated state:
 * what survives a refresh, what a bad token does, and what logout revokes.
 */

import { test, expect } from '@playwright/test';
import { createUser, loginViaUi, type TestUser } from './fixtures';

let user: TestUser;

test.beforeAll(async ({ request }) => {
  user = await createUser(request);
});

test('PW-015 redirects to Login on protected routes without a valid session', async ({ page }) => {
  // No token at all.
  await page.goto('/me/en/library');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('text=Welcome back')).toBeVisible();

  // A token that exists but is not valid must be treated the same way, and
  // must not leave the app stuck believing it is signed in.
  await page.evaluate(() => localStorage.setItem('lingq_token', 'corrupted.token.value'));
  await page.goto('/me/en/library');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('text=Welcome back')).toBeVisible();
});

test('PW-016 keeps the session across a refresh and the active language', async ({ page }) => {
  await loginViaUi(page, user);

  await page.reload();
  // Still authenticated — no credential prompt.
  await expect(page).toHaveURL(/\/me\/.+\/library/);
  await expect(page.getByRole('link', { name: 'Lessons', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('lingq_token'))).toBeTruthy();

  // An authenticated user sent to /login is bounced to the workspace.
  await page.goto('/login');
  await expect(page).not.toHaveURL(/\/login/);
});

test('PW-017 logs out and revokes access to protected routes', async ({ page }) => {
  await loginViaUi(page, user);
  await expect(page).toHaveURL(/\/me\/.+\/library/);

  await page.goto(`/me/en/profile`);
  await page.click('button:has-text("Log Out")');

  // Session context is gone, not merely hidden.
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('lingq_token'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('lingq_user'))).toBeNull();

  // Protected routes stay closed, including after a refresh and a Back.
  await page.goto('/me/en/library');
  await expect(page).toHaveURL(/\/login/);

  await page.reload();
  await expect(page).toHaveURL(/\/login/);

  await page.goBack();
  await expect(page).toHaveURL(/\/login/);

  // Re-authentication with the same account still works.
  await loginViaUi(page, user);
  await expect(page).toHaveURL(/\/me\/.+\/library/);
});