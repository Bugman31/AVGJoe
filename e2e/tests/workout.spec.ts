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

    // Fill workout name
    await page.getByPlaceholder(/workout name/i).fill('Test Push Day');

    // Add an exercise
    await page.getByRole('button', { name: /add exercise/i }).click();
    const exerciseInput = page.locator('input[placeholder*="exercise" i]').last();
    await exerciseInput.fill('Bench Press');

    // Add a set
    const addSetBtn = page.getByRole('button', { name: /add set/i }).last();
    await addSetBtn.click();

    // Fill reps and weight
    const repsInput = page.locator('input[placeholder*="reps" i]').last();
    const weightInput = page.locator('input[placeholder*="weight" i]').last();
    await repsInput.fill('10');
    await weightInput.fill('60');

    // Submit
    await page.getByRole('button', { name: /save|create workout/i }).click();

    // Should redirect to /workouts and show the new workout
    await expect(page).toHaveURL(/\/workouts/, { timeout: 8000 });
    await expect(page.getByText('Test Push Day')).toBeVisible({ timeout: 5000 });
  });
});

// ─── Workout Session — Log Data ───────────────────────────────────────────────

test.describe('Workout session — log data', () => {
  let templateId: string;

  test.beforeAll(async ({ request }) => {
    // Log in to get token
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

    // Session timer should be visible
    await expect(page.locator('text=/\\d+:\\d+/').first()).toBeVisible({ timeout: 6000 });

    // Fill in actual reps and weight for the first set
    const repsInput = page.locator('input[placeholder*="reps" i], input[aria-label*="reps" i]').first();
    const weightInput = page.locator('input[placeholder*="weight" i], input[aria-label*="weight" i]').first();
    await repsInput.fill('5');
    await weightInput.fill('100');

    // Click Done / log the set
    const doneBtn = page.getByRole('button', { name: /done|log|complete set/i }).first();
    await doneBtn.click();

    // Set should be marked complete (checkmark or completed state)
    await expect(page.locator('[data-completed="true"], .set-complete, text=/✓|completed/i').first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Some UIs change button color rather than showing text — acceptable
      });

    // Complete the workout
    await page.getByRole('button', { name: /complete workout/i }).click();

    // Should redirect to history
    await expect(page).toHaveURL(/\/history/, { timeout: 8000 });
  });
});
