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

test.describe('AI workout generation', () => {
  test('AI page loads and form is interactive', async ({ page }) => {
    await loginAs(page);
    await page.goto('/ai');

    // Page heading visible — h1 contains "AI Workout Generator"
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/AI/i, { timeout: 6000 });

    // Goal textarea present and fillable
    const goalInput = page.locator('textarea').first();
    await expect(goalInput).toBeVisible();
    await goalInput.fill('Build upper body strength 3 days per week with dumbbells');

    // Fitness level selector
    const levelSelect = page.locator('select').first();
    await expect(levelSelect).toBeVisible();
    await levelSelect.selectOption({ index: 1 });

    // Submit button present and enabled — "Generate Workout"
    const submitBtn = page.getByRole('button', { name: /generate workout/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('submitting the AI form shows a response or graceful error — no crash', async ({ page }) => {
    await loginAs(page);
    await page.goto('/ai');

    await page.locator('textarea').first().fill('Lose weight with bodyweight exercises');

    await page.getByRole('button', { name: /generate workout/i }).click();

    // Wait for either a result preview OR an error message — not a crash
    // Use .or() to combine locators without invalid regex/CSS mixing
    const result = page.getByText(/generated|workout plan/i)
      .or(page.getByText(/error|unavailable|key|configure|failed/i))
      .or(page.locator('[role="alert"]'))
      .or(page.locator('p.text-danger'));

    await expect(result.first()).toBeVisible({ timeout: 30000 });

    // Page must not show an unhandled runtime error
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Unhandled Runtime Error');
    expect(bodyText).not.toContain('TypeError');
  });
});
