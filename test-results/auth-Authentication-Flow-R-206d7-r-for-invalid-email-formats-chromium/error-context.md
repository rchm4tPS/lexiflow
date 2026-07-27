# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> Registration Validation >> should show error for invalid email formats
- Location: tests\auth.spec.ts:50:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Enter a valid email.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Enter a valid email.')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Lexiflow
      - paragraph [ref=e7]: Master a language through content you love.
    - list [ref=e8]:
      - listitem [ref=e9]:
        - generic [ref=e10]: ✦
        - text: Track every word you learn
      - listitem [ref=e11]:
        - generic [ref=e12]: ✦
        - text: Listen & read in sync
      - listitem [ref=e13]:
        - generic [ref=e14]: ✦
        - text: Build streaks, hit daily goals
      - listitem [ref=e15]:
        - generic [ref=e16]: ✦
        - text: Works with any language
  - generic [ref=e20]:
    - generic [ref=e21]:
      - heading "Create your account" [level=1] [ref=e22]
      - paragraph [ref=e23]: Join cases and start learning today.
    - generic [ref=e24]:
      - generic [ref=e25]: "1"
      - generic [ref=e27]: "2"
    - generic [ref=e28]:
      - paragraph [ref=e29]: Step 1 · Your Details
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]: Full Name
          - textbox "Full Name" [ref=e33]:
            - /placeholder: Ada Lovelace
        - generic [ref=e34]:
          - generic [ref=e35]: Username
          - textbox "Username" [ref=e36]:
            - /placeholder: ada_learns
        - generic [ref=e37]:
          - generic [ref=e38]: Email
          - textbox "Email" [ref=e39]:
            - /placeholder: ada@example.com
            - text: nodomain@
        - generic [ref=e40]:
          - generic [ref=e41]: Password
          - textbox "Password" [ref=e42]:
            - /placeholder: Min. 6 characters
        - generic [ref=e43]:
          - generic [ref=e44]: Confirm Password
          - textbox "Confirm Password" [ref=e45]:
            - /placeholder: Repeat password
      - paragraph [ref=e46]: Full name is required.
      - button "Continue →" [active] [ref=e47]
      - paragraph [ref=e48]:
        - text: Already have an account?
        - link "Log in" [ref=e49] [cursor=pointer]:
          - /url: /login
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Authentication Flow', () => {
  4   |   // Ensure tests run in order because they share the same test user state
  5   |   test.describe.configure({ mode: 'serial' });
  6   | 
  7   |   const timestamp = Date.now();
  8   |   const testUser = {
  9   |     fullName: 'Test User',
  10  |     username: `testuser_${timestamp}`,
  11  |     email: `test_${timestamp}@example.com`,
  12  |     password: 'Password123'
  13  |   };
  14  | 
  15  |   test('should register a new user successfully', async ({ page }) => {
  16  |     await page.goto('/signup');
  17  | 
  18  |     // Step 1: Identity
  19  |     await page.fill('input#fullName', testUser.fullName);
  20  |     await page.fill('input#username', testUser.username);
  21  |     await page.fill('input#email', testUser.email);
  22  |     await page.fill('input#password', testUser.password);
  23  |     await page.fill('input#confirmPw', testUser.password);
  24  | 
  25  |     await page.click('button:has-text("Continue →")');
  26  | 
  27  |     // Step 2: Preferences
  28  |     // Wait for the language options to appear
  29  |     await expect(page.locator('text=Step 2 · Your Preferences')).toBeVisible();
  30  | 
  31  |     // Select a language (e.g., Spanish)
  32  |     await page.click('button:has-text("SPANISH")');
  33  | 
  34  |     // Select a goal (e.g., Casual)
  35  |     await page.click('button:has-text("Calm")');
  36  | 
  37  |     // Submit
  38  |     await page.click('button:has-text("Create Account")');
  39  | 
  40  |     // Verify Success
  41  |     await expect(page.locator('text=You\'re all set!')).toBeVisible();
  42  |     await expect(page.locator('text=Your account has been created.')).toBeVisible();
  43  |   });
  44  | 
  45  |   test.describe('Registration Validation', () => {
  46  |     test.beforeEach(async ({ page }) => {
  47  |       await page.goto('/signup');
  48  |     });
  49  | 
  50  |     test('should show error for invalid email formats', async ({ page }) => {
  51  |       const invalidEmails = ['nodomain@', 'no-at-symbol', '@nodocker.com'];
  52  |       for (const email of invalidEmails) {
  53  |         await page.fill('input#email', email);
  54  |         await page.click('button:has-text("Continue →")');
> 55  |         await expect(page.locator('text=Enter a valid email.')).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  56  |       }
  57  |     });
  58  | 
  59  |     test('should show error when Step 1 is incomplete', async ({ page }) => {
  60  |       // Empty submit
  61  |       await page.click('button:has-text("Continue →")');
  62  |       await expect(page.locator('text=Full name is required.')).toBeVisible();
  63  | 
  64  |       // Only full name
  65  |       await page.fill('input#fullName', 'Edge Case');
  66  |       await page.click('button:has-text("Continue →")');
  67  |       await expect(page.locator('text=Username must be at least 3 characters.')).toBeVisible();
  68  | 
  69  |       // Missing confirmPw
  70  |       await page.fill('input#username', 'edgecase');
  71  |       await page.fill('input#email', 'edge@test.com');
  72  |       await page.fill('input#password', 'password123');
  73  |       await page.click('button:has-text("Continue →")');
  74  |       await expect(page.locator('text=Passwords do not match.')).toBeVisible();
  75  |     });
  76  | 
  77  |     test('should show error for short password', async ({ page }) => {
  78  |       await page.fill('input#fullName', 'Short Pass');
  79  |       await page.fill('input#username', 'shorty');
  80  |       await page.fill('input#email', 'short@test.com');
  81  |       await page.fill('input#password', '123');
  82  |       await page.fill('input#confirmPw', '123');
  83  |       await page.click('button:has-text("Continue →")');
  84  |       await expect(page.locator('text=Password must be at least 6 characters.')).toBeVisible();
  85  |     });
  86  | 
  87  |     test('should show error when Step 2 preferences are missing', async ({ page }) => {
  88  |       // Complete Step 1
  89  |       await page.fill('input#fullName', 'Step Two');
  90  |       await page.fill('input#username', 'steptwo');
  91  |       await page.fill('input#email', 'step2@test.com');
  92  |       await page.fill('input#password', 'password123');
  93  |       await page.fill('input#confirmPw', 'password123');
  94  |       await page.click('button:has-text("Continue →")');
  95  | 
  96  |       // Click Create without selecting anything
  97  |       await page.click('button:has-text("Create Account")');
  98  |       await expect(page.locator('text=Please select a target language.')).toBeVisible();
  99  | 
  100 |       // Select language but no goal
  101 |       await page.click('button:has-text("SPANISH")');
  102 |       await page.click('button:has-text("Create Account")');
  103 |       await expect(page.locator('text=Please choose a daily goal.')).toBeVisible();
  104 |     });
  105 |   });
  106 | 
  107 |   test('should login successfully', async ({ page }) => {
  108 |     // Note: This assumes the user was registered in the previous test or exists.
  109 |     // For a cleaner test, we should register or use a seeded user.
  110 |     // Here we'll try to login with the user we just registered (if run in order)
  111 |     // or a known test user.
  112 | 
  113 |     await page.goto('/login');
  114 | 
  115 |     await page.fill('input#email', testUser.email);
  116 |     await page.fill('input#password', testUser.password);
  117 | 
  118 |     await page.click('button[type="submit"]');
  119 | 
  120 |     // Verify redirection to library (checking for "Lessons" or "/library" in URL)
  121 |     await expect(page).toHaveURL(/.*\/library/);
  122 |     await expect(page.getByRole('link', { name: 'Lessons', exact: true })).toBeVisible();
  123 |   });
  124 | 
  125 |   test.describe('Login Failures', () => {
  126 |     test.beforeEach(async ({ page }) => {
  127 |       await page.goto('/login');
  128 |     });
  129 | 
  130 |     test('should show error for correct email but wrong password', async ({ page }) => {
  131 |       await page.fill('input#email', testUser.email);
  132 |       await page.fill('input#password', 'wrong_pass');
  133 |       await page.click('button[type="submit"]');
  134 |       await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
  135 |     });
  136 | 
  137 |     test('should show error for correct password but wrong email', async ({ page }) => {
  138 |       await page.fill('input#email', 'nobody@test.com');
  139 |       await page.fill('input#password', testUser.password);
  140 |       await page.click('button[type="submit"]');
  141 |       await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
  142 |     });
  143 | 
  144 |     test('should show error for both wrong', async ({ page }) => {
  145 |       await page.fill('input#email', 'wrong@test.com');
  146 |       await page.fill('input#password', 'wrong_pass');
  147 |       await page.click('button[type="submit"]');
  148 |       await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
  149 |     });
  150 | 
  151 |     test('should handle empty login', async ({ page }) => {
  152 |       await page.click('button[type="submit"]');
  153 |       // The frontend might show browser validation or the app error
  154 |       // Given your LoginView.tsx, it attempts to login with empty strings
  155 |       await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
```