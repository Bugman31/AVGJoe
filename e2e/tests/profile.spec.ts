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

    // Page heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/profile/i, { timeout: 6000 });

    // Email shown in the card — AuthContext fetches /api/auth/me before rendering
    // Give it enough time for the API round-trip to complete
    await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible({ timeout: 8000 });
  });

  test('can update display name and see toast confirmation', async ({ page }) => {
    await loginAs(page);
    await page.goto('/profile');

    // Name input — label is "Display Name"
    const nameInput = page.getByLabel('Display Name');
    await expect(nameInput).toBeVisible({ timeout: 6000 });

    await nameInput.fill('');
    await nameInput.fill('Admin Updated');

    // Save — button text is "Save Profile"
    await page.getByRole('button', { name: 'Save Profile' }).click();

    // Toast notification appears in top-right
    await expect(page.getByText(/profile saved/i)).toBeVisible({ timeout: 6000 });

    // Restore original name
    await nameInput.fill('Admin');
    await page.getByRole('button', { name: 'Save Profile' }).click();
  });

  test('AI settings section is visible with API key input', async ({ page }) => {
    await loginAs(page);
    await page.goto('/profile');

    await expect(page.getByText(/AI Settings/i)).toBeVisible({ timeout: 6000 });

    // API key input — label is "Anthropic API Key", placeholder "sk-ant-..."
    const apiKeyInput = page.getByLabel('Anthropic API Key');
    await expect(apiKeyInput).toBeVisible();
  });
});
