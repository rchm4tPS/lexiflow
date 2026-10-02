/**
 * PW-001..011 — registration regression suite.
 *
 * Deliberately small: each test guards a rule that has actually broken, rather
 * than mirroring the manual catalogue case-for-case. Boundary values and
 * character classes are folded into one test per field so a single failure
 * names the rule that regressed.
 */

import { test, expect } from '@playwright/test';
import {
  fillStep1, completeStep2, expectBlockedOn,
  CONTINUE, STEP2, CREATE_ACCOUNT, SUCCESS, createUser,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/signup');
});

test('PW-001 registers a valid account and does not sign the user in', async ({ page }) => {
  await fillStep1(page);
  await completeStep2(page);
  await page.click(CREATE_ACCOUNT);

  await expect(page.locator(SUCCESS)).toBeVisible();
  await expect(page.locator('text=Your account has been created.')).toBeVisible();
  await expect(page.locator('button:has-text("Go to Login")')).toBeVisible();

  // Registration alone must never establish a session.
  expect(await page.evaluate(() => localStorage.getItem('lingq_token'))).toBeNull();
});

test('PW-002 enforces the username length and character rules', async ({ page }) => {
  // Boundaries: 3 and 20 characters are accepted, 21 is not.
  for (const ok of ['abc', 'adaapadengancinta123']) {
    expect(ok.length).toBeLessThanOrEqual(20);
    await fillStep1(page, { username: ok });
    await page.click(CONTINUE);
    await expect(page.locator(STEP2)).toBeVisible();
    await page.click('button:has-text("← Back")');
  }

  await fillStep1(page, { username: 'adaapadengancinta123a' }); // 21 chars
  await page.click(CONTINUE);
  await expectBlockedOn(page, 'username', /20 characters or fewer/);

  // Must contain a letter, and only ASCII letters, digits and underscore.
  for (const bad of ['123456', '____', 'john doe', 'john@doe', 'жож']) {
    await fillStep1(page, { username: bad });
    await page.click(CONTINUE);
    await expectBlockedOn(page, 'username', /at least one letter|letters, numbers and underscores/);
  }
});

test('PW-003 enforces the full name rules', async ({ page }) => {
  // Minimum length: 2 passes, 1 does not.
  await fillStep1(page, { fullName: 'Jo' });
  await page.click(CONTINUE);
  await expect(page.locator(STEP2)).toBeVisible();
  await page.click('button:has-text("← Back")');

  await fillStep1(page, { fullName: 'A' });
  await page.click(CONTINUE);
  await expectBlockedOn(page, 'fullName', /at least 2 characters/);

  // No digits or stray punctuation; apostrophe, dash and umlaut are fine.
  for (const bad of ['John3', 'john@', '1234', 'Ada_Lovelace']) {
    await fillStep1(page, { fullName: bad });
    await page.click(CONTINUE);
    await expectBlockedOn(page, 'fullName', /no digits or other symbols/);
  }

  await fillStep1(page, { fullName: "O'Connor-Müller" });
  await page.click(CONTINUE);
  await expect(page.locator(STEP2)).toBeVisible();
});

test('PW-004 rejects malformed email addresses', async ({ page }) => {
  for (const bad of ['@example.test', 'userexample.test', 'user@', 'user@example', 'ada=love@example.test']) {
    await fillStep1(page, { email: bad });
    await page.click(CONTINUE);
    await expectBlockedOn(page, 'email', /Enter a valid email/);
  }
});

test('PW-005 enforces password length and confirmation match', async ({ page }) => {
  await fillStep1(page, { password: '12345', confirmPw: '12345' });
  await page.click(CONTINUE);
  await expectBlockedOn(page, 'password', /at least 6 characters/);

  // 6 characters is the accepted boundary.
  await fillStep1(page, { password: '123456', confirmPw: '123456' });
  await page.click(CONTINUE);
  await expect(page.locator(STEP2)).toBeVisible();
  await page.click('button:has-text("← Back")');

  await fillStep1(page, { password: 'secret1', confirmPw: 'secret2' });
  await page.click(CONTINUE);
  await expectBlockedOn(page, 'confirmPw', /do not match/);
});

test('PW-006 reports an error beside the invalid field and keeps valid input', async ({ page }) => {
  const { email, password } = await fillStep1(page, { username: 'ab' });
  await page.click(CONTINUE);

  await expect(page.locator('#username-error')).toHaveText(/at least 3 characters/);
  await expect(page.locator('input#email')).toHaveValue(email);
  await expect(page.locator('input#password')).toHaveValue(password);
});

test('PW-007 trims outer whitespace before validating', async ({ page }) => {
  await fillStep1(page, { fullName: '  John Doe  ', email: '  ws@example.test  ' });
  await page.click(CONTINUE);

  await expect(page.locator(STEP2)).toBeVisible();
  await expect(page.locator('#fullName-error')).toHaveCount(0);
  await expect(page.locator('#email-error')).toHaveCount(0);
});

test('PW-008 rejects a duplicate username or email', async ({ page, request }) => {
  const existing = await createUser(request);

  // Stub the advisory availability lookup as "available" so the authoritative
  // server constraint is what rejects the registration. That path is
  // deterministic; the lookup itself is debounced and rate-limited, so the rest
  // of the suite would otherwise make this assertion depend on ordering.
  await page.route('**/api/v1/auth/check-availability', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ username: { available: true }, email: { available: true } }),
  }));

  await fillStep1(page, { username: existing.username });
  await completeStep2(page);
  await page.click(CREATE_ACCOUNT);

  await expect(page.locator('#username-error')).toHaveText(/already taken/);
  await expect(page.locator(SUCCESS)).toHaveCount(0);

  await page.reload();
  await fillStep1(page, { email: existing.email });
  await completeStep2(page);
  await page.click(CREATE_ACCOUNT);

  await expect(page.locator('#email-error')).toHaveText(/already exists/);
  await expect(page.locator(SUCCESS)).toHaveCount(0);
});

test('PW-009 gates step 1 and step 2 correctly', async ({ page }) => {
  // An invalid step 1 blocks progression.
  await fillStep1(page, { username: 'ab' });
  await page.click(CONTINUE);
  await expect(page.locator(STEP2)).toHaveCount(0);

  // Valid step 1 advances.
  await page.reload();
  await fillStep1(page);
  await page.click(CONTINUE);
  await expect(page.locator(STEP2)).toBeVisible();

  // Step 2 requires a language (a goal is selected, so language is the gap).
  await page.click('button:has-text("Calm")');
  await page.click(CREATE_ACCOUNT);
  await expect(page.locator('text=Please select at least one target language.')).toBeVisible();
  await expect(page.locator(SUCCESS)).toHaveCount(0);

  // Step 2 requires a goal — checked from a clean form so the goal is the only
  // missing value and the assertion cannot be satisfied by the selection above.
  await page.reload();
  await fillStep1(page);
  await page.click(CONTINUE);
  await expect(page.locator(STEP2)).toBeVisible();

  await page.click('button:has-text("SPANISH")');
  await page.click(CREATE_ACCOUNT);
  await expect(page.locator('text=Please choose a daily goal.')).toBeVisible();
  await expect(page.locator(SUCCESS)).toHaveCount(0);
});

test('PW-010 enforces target language and daily goal selection rules', async ({ page }) => {
  await fillStep1(page);
  await page.click(CONTINUE);
  await page.locator(STEP2).waitFor();

  const spanish = page.locator('button:has-text("SPANISH")');
  const french = page.locator('button:has-text("FRENCH")');

  // At least one language stays selected; multiple are allowed.
  await spanish.click();
  await expect(page.locator('text=1 selected')).toBeVisible();
  await french.click();
  await expect(page.locator('text=2 selected')).toBeVisible();
  await expect(spanish).toHaveAttribute('aria-pressed', 'true');

  // The last remaining language cannot be deselected.
  await spanish.click();
  await expect(page.locator('text=1 selected')).toBeVisible();
  await french.click();
  await expect(french).toHaveAttribute('aria-pressed', 'true');

  // Daily goal is mutually exclusive.
  const calm = page.locator('button', { hasText: 'Calm' }).first();
  const steady = page.locator('button', { hasText: 'Steady' }).first();
  await calm.click();
  await expect(calm).toContainText('✓');
  await steady.click();
  await expect(steady).toContainText('✓');
  await expect(calm).not.toContainText('✓');
});

test('PW-011 keeps the form usable when the backend is unavailable', async ({ page }) => {
  await page.route('**/api/v1/auth/register', (route) => route.abort('failed'));

  const { username } = await fillStep1(page);
  await completeStep2(page);
  await page.click(CREATE_ACCOUNT);

  // A recoverable notice rather than a crash or a false success.
  await expect(page.locator('p.animate-shake')).toBeVisible();
  await expect(page.locator(SUCCESS)).toHaveCount(0);

  // Step 2 preferences and step 1 values both survive for a retry.
  await expect(page.locator('button:has-text("SPANISH")')).toHaveAttribute('aria-pressed', 'true');
  await page.click('button:has-text("← Back")');
  await expect(page.locator('input#username')).toHaveValue(username);
});