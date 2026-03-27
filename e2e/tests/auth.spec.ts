import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@avgjoe.com';
const ADMIN_PASSWORD = 'Admin1234!';

// ─── Page rendering ───────────────────────────────────────────────────────────

test.describe('Login page', () => {
  test('renders title, email field, password field and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /average joe/i })).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  test('shows sanitized error (not raw Prisma trace) on failed login attempt', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    // Use wrong password so login actually fails
    await page.getByLabel('Password').fill('WrongPassword999!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for error to appear
    const errorBox = page.locator('text=/invalid|incorrect|credentials|error/i').first();
    await expect(errorBox).toBeVisible({ timeout: 8000 });

    // Must NOT expose internal Prisma details
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('prisma.user');
    expect(bodyText).not.toContain('localhost:5432');
    expect(bodyText).not.toContain('invocation in');
  });
});

test.describe('Signup page', () => {
  test('renders all fields and create account button', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /average joe/i })).toBeVisible();
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('shows sanitized error (not raw Prisma trace) on duplicate signup', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Name').fill('Admin');
    // Use existing admin email to trigger "already exists" error
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('Admin1234!');
    await page.getByRole('button', { name: 'Create account' }).click();

    const errorBox = page.locator('text=/exists|taken|unavailable|already|error/i').first();
    await expect(errorBox).toBeVisible({ timeout: 8000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('prisma.user');
    expect(bodyText).not.toContain('localhost:5432');
  });
});

// ─── Auth guards ─────────────────────────────────────────────────────────────

test.describe('Protected route redirects', () => {
  const protectedRoutes = ['/dashboard', '/workouts', '/ai', '/history', '/profile'];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated user to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 6000 });
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    });
  }
});

// ─── Dark theme ───────────────────────────────────────────────────────────────

test.describe('Dark theme', () => {
  test('login page has dark background', async ({ page }) => {
    await page.goto('/login');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('background-color') ||
      getComputedStyle(document.body).getPropertyValue('background-color')
    );
    // #0a0a0a = rgb(10, 10, 10)
    expect(bg.trim()).toMatch(/rgb\(10,\s*10,\s*10\)|#0a0a0a/i);
  });
});
