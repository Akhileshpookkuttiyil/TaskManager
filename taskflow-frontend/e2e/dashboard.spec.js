import { test, expect } from '@playwright/test';
import {
  generateTestCredentials,
  registerUserViaApi,
  createTaskViaApi,
  cleanupUsers,
  setAuthenticatedSession,
} from './helpers/test-setup.js';

test.describe('Journey B: Dashboard & Metrics', () => {
  const createdUserIds = [];

  test.afterAll(async () => {
    await cleanupUsers(createdUserIds);
  });

  test('dashboard renders greeting, action controls, and empty state for a new user', async ({ page }) => {
    const creds = generateTestCredentials('dash_empty');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await setAuthenticatedSession(page, token, '/');

    // Verify user greeting
    await expect(page.getByRole('heading', { name: new RegExp(user.name.split(' ')[0], 'i') })).toBeVisible({
      timeout: 15000,
    });

    // Verify navigation buttons
    await expect(page.getByRole('link', { name: /open workspace/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible();

    // Verify initial 0 metrics
    const totalStat = page.locator('.card', { hasText: 'TOTAL TASKS' });
    await expect(totalStat).toContainText('0');

    // Verify empty state schedules
    await expect(page.getByText(/no work scheduled for today/i)).toBeVisible();
    await expect(page.getByText(/no upcoming tasks scheduled/i)).toBeVisible();
  });

  test('statistics reflect actual database records when tasks are added and completed', async ({ page }) => {
    const creds = generateTestCredentials('dash_stats');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    // Seed tasks directly into database via backend API:
    // 1 pending task, 1 completed task
    await createTaskViaApi(token, {
      title: 'Database Record Task 1',
      status: 'pending',
      priority: 'high',
    });

    await createTaskViaApi(token, {
      title: 'Database Record Task 2',
      status: 'completed',
      priority: 'medium',
    });

    await setAuthenticatedSession(page, token, '/');

    // Verify StatCards
    const totalCard = page.locator('.card', { hasText: 'TOTAL TASKS' });
    await expect(totalCard).toContainText('2', { timeout: 15000 });

    const completedCard = page.locator('.card', { hasText: 'COMPLETED' });
    await expect(completedCard).toContainText('1');

    const pendingCard = page.locator('.card', { hasText: 'PENDING' });
    await expect(pendingCard).toContainText('1');
  });

  test('Add Task action on dashboard opens task creation workflow', async ({ page }) => {
    const creds = generateTestCredentials('dash_action');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await setAuthenticatedSession(page, token, '/');

    // Click "Add Task"
    await page.getByRole('button', { name: /add task/i }).click();

    // Verify redirection to /tasks and TaskDetailDrawer opens
    await expect(page).toHaveURL(/\/tasks/);
    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#drawer-title')).toBeVisible();
  });
});
