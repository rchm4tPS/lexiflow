/**
 * PW-012..014 — login regression suite.
 *
 * Covers the happy path, client-side field validation, the deliberately
 * generic credential error, and the brute-force lockout.
 */

import { test, expect } from '@playwright/test';
import { createUser, type TestUser } from './fixtures';

let user: TestUser;

test.beforeAll(async ({ request }) => {
  user = await createUser(request);
});

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
});

test('PW-012 signs in with valid credentials and lands in the workspace', async ({ page }) => {
  await page.fill('input#email', user.email);
  await page.fill('input#password', user.password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/me\/.+\/library/);
  await expect(page.getByRole('link', { name: 'Lessons', exact: true })).toBeVisible();
});

test('PW-013 validates login fields and returns a generic credential error', async ({ page }) => {
  // Empty and malformed input is caught against the field, before dispatch.
  await page.click('button[type="submit"]');
  await expect(page.locator('#email-error')).toHaveText(/Email is required/);
  await expect(page.locator('#password-error')).toHaveText(/Password is required/);

  await page.fill('input#email', 'not-an-email');
  await page.fill('input#password', 'Password123');
  await page.click('button[type="submit"]');
  await expect(page.locator('#email-error')).toHaveText(/Enter a valid email/);
  await expect(page.locator('#password-error')).toHaveCount(0);

  // Wrong password and unknown email must be indistinguishable.
  await page.fill('input#email', user.email);
  await page.fill('input#password', 'wrong-pass');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Invalid email or password.')).toBeVisible();

  await page.fill('input#email', 'nobody@example.test');
  await page.fill('input#password', 'Password123');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Invalid email or password.')).toBeVisible();

  // A failed attempt must not leave a session behind.
  expect(await page.evaluate(() => localStorage.getItem('lingq_token'))).toBeNull();
});

test('PW-014 locks out after repeated failed logins', async ({ page, request }) => {
  // Each attempt is a round trip; the threshold is configurable, so allow room.
  test.setTimeout(90_000);

  // A dedicated account so this lockout cannot disturb the other specs.
  const victim = await createUser(request);

  const emailInput = page.locator('input#email');
  const passwordInput = page.locator('input#password');
  const submit = page.getByRole('button', { name: /Log In|Creating/ });
  const lockoutBanner = page.locator('text=Too many failed attempts');

  // Burn attempts up to, but not including, the threshold. Each one is followed
  // by an assertion on the 401 banner, which paces the loop deterministically:
  // without that wait the loop outruns the server, and because typing the next
  // value clears the previous banner the assertion can never pass on stale text.
  // The threshold attempt itself already answers 429 rather than 401.
  const threshold = Number(process.env.MAX_LOGIN_ATTEMPTS ?? 5);

  for (let attempt = 0; attempt < threshold - 1; attempt += 1) {
    await emailInput.fill(victim.email);
    // At least 6 characters: a shorter value is rejected client-side, so the
    // request never reaches the server and no attempt is ever counted.
    await passwordInput.fill(`WrongPass${attempt}`);
    await submit.click();
    await expect(page.locator('text=Invalid email or password.')).toBeVisible();
  }

  // The threshold attempt trips the lockout.
  await emailInput.fill(victim.email);
  await passwordInput.fill('WrongPassFinal');
  await submit.click();

  await expect(lockoutBanner).toBeVisible();

  // The control is disabled and a countdown is shown.
  const lockedSubmit = page.getByRole('button', { name: /Locked/ });
  await expect(lockedSubmit).toBeDisabled();
  await expect(lockedSubmit).toContainText(/\d+:\d\d/);

  // Correct credentials are still refused while the lockout holds.
  await page.fill('input#password', victim.password);
  expect(await page.evaluate(() => localStorage.getItem('lingq_token'))).toBeNull();
});