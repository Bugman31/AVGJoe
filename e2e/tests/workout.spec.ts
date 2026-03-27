import { test, expect, Page } from '@playwright/test';

const API = 'http://localhost:8000';
const ADMIN_EMAIL = 'admin@avgjoe.com';
const ADMIN_PASSWORD = 'Admin1234!';

async function loginAs(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  const res = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password },
  });
  const { token } = await res.json();
  await page.evaluate((t) => localStorage.setItem('avgjoe_jwt', t), token);
}

// ─── Workout Creation ─────────────────────────────────────────────────────────

test.describe('Workout creation', () => {
  test('creates a new workout template and it appears in the list', async ({ page }) => {
    await loginAs(page);
    await page.goto('/workouts/new');

    // Fill workout name — label is "Workout Name"
    await page.getByLabel('Workout Name').fill('Test Push Day');

    // The form starts with one exercise row — fill its name input
    // placeholder is exactly "Exercise name"
    await page.locator('input[placeholder="Exercise name"]').first().fill('Bench Press');

    // Fill target reps and weight for the default set
    await page.locator('input[placeholder="Reps"]').first().fill('10');
    await page.locator('input[placeholder="Weight"]').first().fill('60');

    // Submit — button text is "Save Workout"
    await page.getByRole('button', { name: 'Save Workout' }).click();

    // Should redirect to /workouts and show the new workout
    await expect(page).toHaveURL(/\/workouts$/, { timeout: 8000 });
    await expect(page.getByText('Test Push Day').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─── Workout Session — Log Data ───────────────────────────────────────────────

test.describe('Workout session — log data', () => {
  let templateId: string;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { token } = await loginRes.json();

    // Create a template via API so we have a known ID
    const createRes = await request.post(`${API}/api/workouts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E Session Template',
        exercises: [
          {
            name: 'Squat',
            orderIndex: 0,
            sets: [{ setNumber: 1, targetReps: 5, targetWeight: 100, unit: 'kg' }],
          },
        ],
      },
    });
    const body = await createRes.json();
    templateId = body.template?.id ?? body.id;
  });

  test('starts a session, logs a set, and completes the workout', async ({ page }) => {
    await loginAs(page);
    await page.goto(`/workouts/${templateId}/start`);

    // Wait for session to initialise — timer span appears with font-mono class
    const timer = page.locator('span.font-mono').first();
    await expect(timer).toBeVisible({ timeout: 8000 });
    await expect(timer).toHaveText(/\d\d:\d\d/);

    // Fill in actual reps and weight for the first set
    await page.locator('input[placeholder="Reps"]').first().fill('5');
    await page.locator('input[placeholder="Weight"]').first().fill('100');

    // Click the "Mark done" button (title attribute, no visible text)
    await page.locator('button[title="Mark done"]').first().click();

    // Set is marked done when the button disappears (replaced by CheckCircle icon)
    await expect(page.locator('button[title="Mark done"]').first()).toBeHidden({ timeout: 5000 });

    // Complete the workout
    await page.getByRole('button', { name: /complete workout/i }).click();

    // Should redirect to history
    await expect(page).toHaveURL(/\/history/, { timeout: 8000 });
  });
});
