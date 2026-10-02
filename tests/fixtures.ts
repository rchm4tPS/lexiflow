import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Shared helpers for the PW-* regression suites.
 *
 * Fixtures are created through the API rather than the UI: it is faster, and it
 * keeps authentication-dependent specs independent of each other, so one
 * failure cannot cascade into an unrelated area.
 */

const REGISTER_URL = '/api/v1/auth/register';
const LOGIN_URL = '/api/v1/auth/login';

/** Short and collision-resistant; usernames are capped at 20 characters. */
export const stamp = () =>
  `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export interface TestUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

/**
 * Creates a real account via the API and returns its credentials.
 * Throws if the backend rejects it, so callers fail fast with a clear reason.
 */
export async function createUser(
  request: APIRequestContext,
  overrides: Partial<TestUser> = {},
): Promise<TestUser> {
  const s = stamp();
  const user: TestUser = {
    fullName: 'Regression User',
    username: `r${s}`,
    email: `r_${s}@example.test`,
    password: 'Password123',
    ...overrides,
  };

  const res = await request.post(REGISTER_URL, {
    data: {
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: user.password,
      targetLanguages: ['es'],
      dailyGoalTier: 'calm',
    },
  });

  if (res.status() !== 200) {
    throw new Error(`fixture registration failed (${res.status()}): ${await res.text()}`);
  }
  return user;
}

/** Signs in through the UI and waits for the authenticated workspace. */
export async function loginViaUi(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.fill('input#email', user.email);
  await page.fill('input#password', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/me\/.+\/library/);
}

interface Step1Overrides {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPw?: string;
}

/** Fills every step-1 field with valid data unless a test overrides one. */
export async function fillStep1(page: Page, overrides: Step1Overrides = {}) {
  const s = stamp();
  const values: Required<Step1Overrides> = {
    fullName: 'Ada Lovelace',
    username: `u${s}`,
    email: `reg_${s}@example.test`,
    password: 'Password123',
    confirmPw: 'Password123',
    ...overrides,
  };

  await page.fill('input#fullName', values.fullName);
  await page.fill('input#username', values.username);
  await page.fill('input#email', values.email);
  await page.fill('input#password', values.password);
  await page.fill('input#confirmPw', values.confirmPw);
  return values;
}

export const CONTINUE = 'button:has-text("Continue →")';
export const STEP2 = 'text=Step 2 · Your Preferences';
export const CREATE_ACCOUNT = 'button:has-text("Create Account")';
export const SUCCESS = "text=You're all set!";

/** Advances to step 2 and selects one language plus a daily goal. */
export async function completeStep2(page: Page, language = 'SPANISH', goal = 'Calm') {
  await page.click(CONTINUE);
  await page.locator(STEP2).waitFor();
  await page.click(`button:has-text("${language}")`);
  await page.click(`button:has-text("${goal}")`);
}

/** Asserts step 1 refused to advance and blamed this specific field. */
export async function expectBlockedOn(page: Page, field: string, message: RegExp) {
  await expect(page.locator(`#${field}-error`)).toHaveText(message);
  await expect(page.locator(STEP2)).toHaveCount(0);
}