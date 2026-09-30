import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  // Ensure tests run in order because they share the same test user state
  test.describe.configure({ mode: 'serial' });

  const timestamp = Date.now();
  const testUser = {
    fullName: 'Test User',
    // Usernames are capped at 20 characters (letters, digits, underscore, and
    // at least one letter). `t${Date.now()}` is 14 chars — `testuser_${ts}`
    // would be 22 and get rejected by step 1.
    username: `t${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'Password123'
  };

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/signup');

    // Step 1: Identity
    await page.fill('input#fullName', testUser.fullName);
    await page.fill('input#username', testUser.username);
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.fill('input#confirmPw', testUser.password);

    await page.click('button:has-text("Continue →")');

    // Step 2: Preferences
    // Wait for the language options to appear
    await expect(page.locator('text=Step 2 · Your Preferences')).toBeVisible();

    // Select a language (e.g., Spanish)
    await page.click('button:has-text("SPANISH")');

    // Select a goal (e.g., Casual)
    await page.click('button:has-text("Calm")');

    // Submit
    await page.click('button:has-text("Create Account")');

    // Verify Success
    await expect(page.locator('text=You\'re all set!')).toBeVisible();
    await expect(page.locator('text=Your account has been created.')).toBeVisible();
  });

  test.describe('Registration Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
    });

    test('should show error for invalid email formats', async ({ page }) => {
      const invalidEmails = ['nodomain@', 'no-at-symbol', '@nodocker.com'];
      for (const email of invalidEmails) {
        await page.fill('input#email', email);
        await page.click('button:has-text("Continue →")');
        await expect(page.locator('text=Enter a valid email.')).toBeVisible();
      }
    });

    test('should show error when Step 1 is incomplete', async ({ page }) => {
      // Empty submit
      await page.click('button:has-text("Continue →")');
      await expect(page.locator('text=Full name is required.')).toBeVisible();

      // Only full name
      await page.fill('input#fullName', 'Edge Case');
      await page.click('button:has-text("Continue →")');
      // An empty username is reported as missing, distinct from "too short".
      await expect(page.locator('text=Username is required.')).toBeVisible();

      // Missing confirmPw — an empty field is reported as missing, which is
      // distinct from typing a genuinely different password.
      await page.fill('input#username', 'edgecase');
      await page.fill('input#email', 'edge@test.com');
      await page.fill('input#password', 'password123');
      await page.click('button:has-text("Continue →")');
      await expect(page.locator('text=Please confirm your password.')).toBeVisible();

      // Now a real mismatch rather than an empty field.
      await page.fill('input#confirmPw', 'somethingelse');
      await page.click('button:has-text("Continue →")');
      await expect(page.locator('text=Passwords do not match.')).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      await page.fill('input#fullName', 'Short Pass');
      await page.fill('input#username', 'shorty');
      await page.fill('input#email', 'short@test.com');
      await page.fill('input#password', '123');
      await page.fill('input#confirmPw', '123');
      await page.click('button:has-text("Continue →")');
      await expect(page.locator('text=Password must be at least 6 characters.')).toBeVisible();
    });

    test('should show error when Step 2 preferences are missing', async ({ page }) => {
      // Complete Step 1
      await page.fill('input#fullName', 'Step Two');
      await page.fill('input#username', 'steptwo');
      await page.fill('input#email', 'step2@test.com');
      await page.fill('input#password', 'password123');
      await page.fill('input#confirmPw', 'password123');
      await page.click('button:has-text("Continue →")');

      // Click Create without selecting anything
      await page.click('button:has-text("Create Account")');
      await expect(page.locator('text=Please select at least one target language.')).toBeVisible();

      // Select language but no goal
      await page.click('button:has-text("SPANISH")');
      await page.click('button:has-text("Create Account")');
      await expect(page.locator('text=Please choose a daily goal.')).toBeVisible();
    });

    test('should require at least 2 characters for full name', async ({ page }) => {
      await page.fill('input#fullName', 'A');
      await page.fill('input#username', 'ab');
      await page.fill('input#email', 'min@test.com');
      await page.fill('input#password', 'password123');
      await page.fill('input#confirmPw', 'password123');
      await page.click('button:has-text("Continue →")');
      await expect(page.locator('#fullName-error')).toHaveText(/at least 2 characters/);
      // The username is also too short — each message must sit on its own field.
      await expect(page.locator('#username-error')).toHaveText(/at least 3 characters/);
    });

    test('should reject digits and stray punctuation in full name', async ({ page }) => {
      for (const bad of ['Ada2', 'Agent 007', 'Ada_Lovelace', 'Ada=Hacker']) {
        await page.fill('input#fullName', bad);
        await page.fill('input#username', 'punc');
        await page.fill('input#email', 'punc@test.com');
        await page.fill('input#password', 'password123');
        await page.fill('input#confirmPw', 'password123');
        await page.click('button:has-text("Continue →")');
        await expect(page.locator('#fullName-error')).toHaveText(/no digits or other symbols/);
      }
    });

    test('should accept apostrophes and umlauts in full name', async ({ page }) => {
      for (const good of ["Seamus O'Brien", 'Jörg Müller']) {
        await page.fill('input#fullName', good);
        await page.fill('input#username', 'gute');
        await page.fill('input#email', 'gute@test.com');
        await page.fill('input#password', 'password123');
        await page.fill('input#confirmPw', 'password123');
        await page.click('button:has-text("Continue →")');
        await expect(page.locator('text=Step 2 · Your Preferences')).toBeVisible();
        await page.click('button:has-text("← Back")');
      }
    });

    test('should allow selecting several target languages', async ({ page }) => {
      await page.fill('input#fullName', 'Multi Lang');
      await page.fill('input#username', 'multi');
      await page.fill('input#email', 'multi@test.com');
      await page.fill('input#password', 'password123');
      await page.fill('input#confirmPw', 'password123');
      await page.click('button:has-text("Continue →")');

      await expect(page.locator('text=Select at least one')).toBeVisible();

      const spanish = page.locator('button:has-text("SPANISH")');
      const french = page.locator('button:has-text("FRENCH")');

      // First selection.
      await spanish.click();
      await expect(page.locator('text=1 selected')).toBeVisible();
      await expect(spanish).toHaveAttribute('aria-pressed', 'true');

      // Adding a second must keep the first.
      await french.click();
      await expect(page.locator('text=2 selected')).toBeVisible();
      await expect(spanish).toHaveAttribute('aria-pressed', 'true');
      await expect(french).toHaveAttribute('aria-pressed', 'true');

      // Removing one leaves the other selected.
      await spanish.click();
      await expect(page.locator('text=1 selected')).toBeVisible();
      await expect(spanish).toHaveAttribute('aria-pressed', 'false');
      await expect(french).toHaveAttribute('aria-pressed', 'true');

      // The single remaining selection cannot be deselected — clicking it again
      // is a deliberate no-op, so the form can never be emptied.
      await french.click();
      await expect(french).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('text=1 selected')).toBeVisible();

      // ...and another language can still be added alongside it.
      await spanish.click();
      await expect(page.locator('text=2 selected')).toBeVisible();
      await expect(spanish).toHaveAttribute('aria-pressed', 'true');
      await expect(french).toHaveAttribute('aria-pressed', 'true');
    });

    test('should keep the visibility toggle visible after blur', async ({ page }) => {
      await page.fill('input#password', 'password123');
      await page.fill('input#confirmPw', 'password123');
      await page.fill('input#username', 'toggle');
      await page.fill('input#email', 'toggle@test.com');

      for (const field of ['password', 'confirmPw']) {
        const toggle = page.locator(`#${field}-visibility`);
        await expect(toggle).toBeVisible();
        // Blur must not remove it.
        await page.locator(`input#${field}`).blur();
        await expect(toggle).toBeVisible();
        // Neither must emptying the field.
        await page.fill(`input#${field}`, '');
        await expect(toggle).toBeVisible();
      }

      // Toggling switches the type without changing the value.
      await page.fill('input#password', 'password123');
      await page.locator('input#password').click();
      await page.locator('#password-visibility').click();
      await expect(page.locator('input#password')).toHaveAttribute('type', 'text');
      await page.locator('input#password').blur();
      await expect(page.locator('input#password')).toHaveAttribute('type', 'text');
      await expect(page.locator('input#password')).toHaveValue('password123');
    });
  });

  test('should login successfully', async ({ page }) => {
    // Note: This assumes the user was registered in the previous test or exists.
    // For a cleaner test, we should register or use a seeded user.
    // Here we'll try to login with the user we just registered (if run in order)
    // or a known test user.

    await page.goto('/login');

    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);

    await page.click('button[type="submit"]');

    // Verify redirection to library (checking for "Lessons" or "/library" in URL)
    await expect(page).toHaveURL(/.*\/library/);
    await expect(page.getByRole('link', { name: 'Lessons', exact: true })).toBeVisible();
  });

  test.describe('Login Failures', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should show error for correct email but wrong password', async ({ page }) => {
      await page.fill('input#email', testUser.email);
      await page.fill('input#password', 'wrong_pass');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid email or password.')).toBeVisible();
    });

    test('should show error for correct password but wrong email', async ({ page }) => {
      await page.fill('input#email', 'nobody@test.com');
      await page.fill('input#password', testUser.password);
      await page.click('button[type="submit"]');
      // Deliberately the same string as a wrong password, so the endpoint
      // cannot be used to discover which emails are registered.
      await expect(page.locator('text=Invalid email or password.')).toBeVisible();
    });

    test('should show error for both wrong', async ({ page }) => {
      await page.fill('input#email', 'wrong@test.com');
      await page.fill('input#password', 'wrong_pass');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid email or password.')).toBeVisible();
    });

    test('should report empty fields against the field itself', async ({ page }) => {
      await page.click('button[type="submit"]');
      // Both fields are flagged in place; no request is dispatched.
      await expect(page.locator('#email-error')).toHaveText(/Email is required/);
      await expect(page.locator('#password-error')).toHaveText(/Password is required/);
    });

    test('should report a malformed email against the email field', async ({ page }) => {
      await page.fill('input#email', 'not-an-email');
      await page.fill('input#password', 'Password123');
      await page.click('button[type="submit"]');
      // Matched as a substring: the field also renders a decorative "⚠" glyph
      // (aria-hidden, so screen readers skip it, but present in textContent).
      await expect(page.locator('#email-error')).toHaveText(/Enter a valid email\./);
      // The password was fine, so it must not be blamed.
      await expect(page.locator('#password-error')).toHaveCount(0);
    });

    test('should report a short password against the password field', async ({ page }) => {
      await page.fill('input#email', 'someone@example.com');
      await page.fill('input#password', 'abc');
      await page.click('button[type="submit"]');
      await expect(page.locator('#password-error')).toHaveText(/at least 6 characters/);
      await expect(page.locator('#email-error')).toHaveCount(0);
    });

    test('should clear a field error once the field is edited', async ({ page }) => {
      await page.click('button[type="submit"]');
      await expect(page.locator('#email-error')).toBeVisible();
      await page.fill('input#email', testUser.email);
      await expect(page.locator('#email-error')).toHaveCount(0);
    });
  });

  test('should logout successfully', async ({ page }) => {
    // 1. Prepare: Login first
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/library/);

    // 2. Go to Profile
    // The profile link is in the header, usually an avatar or specific link.
    // In Header.tsx, it's a Link to `/me/${languageCode || 'en'}/profile`
    // We can just navigate directly or click the avatar.
    await page.click('a[title="View Profile"]');
    await expect(page).toHaveURL(/.*\/profile/);

    // 3. Click Logout
    await page.click('button:has-text("Log Out")');

    // 4. Verify redirected to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });
});
