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

    // Page heading visible
    await expect(page.locator('h1, h2').filter({ hasText: /AI|generate|workout/i }).first())
      .toBeVisible({ timeout: 6000 });

    // Goal textarea present and fillable
    const goalInput = page.locator('textarea').first();
    await expect(goalInput).toBeVisible();
    await goalInput.fill('Build upper body strength 3 days per week with dumbbells');

    // Fitness level selector
    const levelSelect = page.locator('select').first();
    if (await levelSelect.isVisible()) {
      await levelSelect.selectOption({ index: 1 });
    }

    // Submit button present and enabled
    const submitBtn = page.getByRole('button', { name: /generate|create|submit/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('submitting the AI form shows a response or graceful error — no crash', async ({ page }) => {
    await loginAs(page);
    await page.goto('/ai');

    await page.locator('textarea').first().fill('Lose weight with bodyweight exercises');

    const submitBtn = page.getByRole('button', { name: /generate|create|submit/i });
    await submitBtn.click();

    // Wait for either: a workout preview OR an error message (not a crash)
    // The API key may not be configured — that's OK, we just need a handled response
    await expect(
      page.locator([
        'text=/generated|workout|saved|preview/i',
        'text=/error|unavailable|key|configure/i',
        '[role="alert"]',
        '.error, .success, .preview',
      ].join(', ')).first()
    ).toBeVisible({ timeout: 20000 });

    // Page must not show an unhandled runtime error
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Unhandled Runtime Error');
    expect(bodyText).not.toContain('TypeError');
  });
});
