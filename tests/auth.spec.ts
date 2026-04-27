import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  // Ensure tests run in order because they share the same test user state
  test.describe.configure({ mode: 'serial' });

  const timestamp = Date.now();
  const testUser = {
    fullName: 'Test User',
    username: `testuser_${timestamp}`,
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
      await expect(page.locator('text=Username must be at least 3 characters.')).toBeVisible();

      // Missing confirmPw
      await page.fill('input#username', 'edgecase');
      await page.fill('input#email', 'edge@test.com');
      await page.fill('input#password', 'password123');
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
      await expect(page.locator('text=Please select a target language.')).toBeVisible();

      // Select language but no goal
      await page.click('button:has-text("SPANISH")');
      await page.click('button:has-text("Create Account")');
      await expect(page.locator('text=Please choose a daily goal.')).toBeVisible();
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
      await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
    });

    test('should show error for correct password but wrong email', async ({ page }) => {
      await page.fill('input#email', 'nobody@test.com');
      await page.fill('input#password', testUser.password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
    });

    test('should show error for both wrong', async ({ page }) => {
      await page.fill('input#email', 'wrong@test.com');
      await page.fill('input#password', 'wrong_pass');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
    });

    test('should handle empty login', async ({ page }) => {
      await page.click('button[type="submit"]');
      // The frontend might show browser validation or the app error
      // Given your LoginView.tsx, it attempts to login with empty strings
      await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
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
