import { test, expect, Page } from '@playwright/test';

const API = 'http://localhost:8000';
const ADMIN_EMAIL = 'admin@avgjoe.com';
const ADMIN_PASSWORD = 'Admin1234!';

async function loginAs(page: Page) {
  await page.goto('/login');
  const res = await page.request.post(`${API}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const { token } = await res.json();
  await page.evaluate((t) => localStorage.setItem('avgjoe_jwt', t), token);
}

test.describe('Profile update', () => {
  test('profile page loads with user info', async ({ page }) => {
    await loginAs(page);
    await page.goto('/profile');

    await expect(page.locator('h1, h2').filter({ hasText: /profile/i }).first())
      .toBeVisible({ timeout: 6000 });

    // Email should be visible (read-only)
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
  });

  test('can update display name and see confirmation', async ({ page }) => {
    await loginAs(page);
    await page.goto('/profile');

    // Find the name input
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 6000 });

    // Clear and set a new name
    await nameInput.fill('');
    await nameInput.fill('Admin Updated');

    // Click save / update profile button
    const saveBtn = page.getByRole('button', { name: /save|update profile/i }).first();
    await saveBtn.click();

    // Should show success feedback
    await expect(
      page.locator('text=/saved|updated|success/i').first()
    ).toBeVisible({ timeout: 6000 });

    // Name should persist on the page
    await expect(nameInput).toHaveValue('Admin Updated', { timeout: 3000 });

    // Restore original name
    await nameInput.fill('Admin');
    await saveBtn.click();
  });

  test('AI settings section is visible with API key input', async ({ page }) => {
    await loginAs(page);
    await page.goto('/profile');

    await expect(page.locator('text=/AI settings|Anthropic|API key/i').first())
      .toBeVisible({ timeout: 6000 });

    const apiKeyInput = page.locator('input[type="password"][placeholder*="sk-" i], input[name*="anthropic" i], input[placeholder*="api key" i]').first();
    await expect(apiKeyInput).toBeVisible();
  });
});
