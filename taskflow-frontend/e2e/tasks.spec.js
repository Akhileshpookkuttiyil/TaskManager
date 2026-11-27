import { test, expect } from '@playwright/test';
import {
  generateTestCredentials,
  registerUserViaApi,
  createTaskViaApi,
  cleanupUsers,
  setAuthenticatedSession,
} from './helpers/test-setup.js';

test.describe('Journey C: Task Management & Lifecycle', () => {
  const createdUserIds = [];

  test.afterAll(async () => {
    await cleanupUsers(createdUserIds);
  });

  test('creates a new task with complete details and verifies persistence after reload', async ({ page }) => {
    const creds = generateTestCredentials('tasks_create');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await setAuthenticatedSession(page, token, '/tasks');

    // Click "New task" button
    await page.getByRole('button', { name: /new task/i }).first().click();

    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible({ timeout: 10000 });

    const taskTitle = `E2E Full Task ${Date.now()}`;
    await page.locator('#drawer-title').fill(taskTitle);
    await page.locator('#drawer-priority').selectOption('high');
    await page.locator('#drawer-description').fill('This is a comprehensive task description created via E2E testing.');
    await page.locator('#drawer-tags').fill('e2e, testing, automated');

    // Submit task creation
    await page.getByRole('button', { name: /create task/i }).click();

    // Verify drawer closes and task card appears
    await expect(drawer).not.toBeVisible({ timeout: 10000 });
    const taskCard = page.locator('.card', { hasText: taskTitle });
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await expect(taskCard).toContainText(/high/i);

    // Verify persistence across reload
    await page.reload();
    const persistedCard = page.locator('.card', { hasText: taskTitle });
    await expect(persistedCard).toBeVisible({ timeout: 15000 });
    await expect(persistedCard).toContainText(/high/i);
  });

  test('edits task details, priority, and status with immediate feedback', async ({ page }) => {
    const creds = generateTestCredentials('tasks_edit');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    // Seed task
    const originalTitle = `Editable Task ${Date.now()}`;
    const task = await createTaskViaApi(token, {
      title: originalTitle,
      priority: 'low',
      status: 'pending',
    });

    await setAuthenticatedSession(page, token, '/tasks');

    // Open task drawer by clicking task card
    const card = page.locator(`[id="task-${task.id || task._id}"]`);
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible();

    // Edit Title with response wait
    const updatedTitle = `${originalTitle} [UPDATED]`;
    const titleResp = page.waitForResponse((r) => r.url().includes('/api/tasks') && r.request().method() === 'PUT');
    await page.locator('#drawer-title').fill(updatedTitle);
    await page.locator('#drawer-title').blur();
    await titleResp;

    // Edit Priority to Medium with response wait
    const priorityResp = page.waitForResponse((r) => r.url().includes('/api/tasks') && r.request().method() === 'PUT');
    await page.locator('#drawer-priority').selectOption('medium');
    await priorityResp;

    // Edit Status to In Progress with response wait
    const statusResp = page.waitForResponse((r) => r.url().includes('/api/tasks') && r.request().method() === 'PUT');
    await page.locator('#drawer-status').selectOption('in_progress');
    await statusResp;

    // Close drawer
    await page.getByRole('button', { name: /close drawer/i }).click();
    await expect(drawer).not.toBeVisible();

    // Verify card updated
    const updatedCard = page.locator('.card', { hasText: updatedTitle });
    await expect(updatedCard).toBeVisible({ timeout: 10000 });
    await expect(updatedCard).toContainText(/medium/i);

    // Refresh and check persistence
    await page.reload();
    await expect(page.locator('.card', { hasText: updatedTitle })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.card', { hasText: updatedTitle })).toContainText(/medium/i);
  });

  test('creates subtasks, toggles completion, and tracks progress rollup', async ({ page }) => {
    const creds = generateTestCredentials('tasks_subtasks');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    const parentTitle = `Parent Task ${Date.now()}`;
    const task = await createTaskViaApi(token, {
      title: parentTitle,
      priority: 'medium',
    });

    await setAuthenticatedSession(page, token, '/tasks');

    const card = page.locator(`[id="task-${task.id || task._id}"]`);
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible();

    // Add first subtask
    const subtaskInput = page.getByRole('textbox', { name: /new subtask title/i });
    await subtaskInput.fill('First Subtask Implementation');
    await page.locator('form', { has: subtaskInput }).getByRole('button', { name: /add/i }).click();

    // Verify subtask appears in list (exact match to avoid audit history collision)
    await expect(drawer.getByText('First Subtask Implementation', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(drawer.getByText('0/1 (0%)')).toBeVisible();

    // Add second subtask
    await subtaskInput.fill('Second Subtask Verification');
    await page.locator('form', { has: subtaskInput }).getByRole('button', { name: /add/i }).click();
    await expect(drawer.getByText('Second Subtask Verification', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(drawer.getByText('0/2 (0%)')).toBeVisible();

    // Complete first subtask by clicking its checkbox button
    const completeSubtaskBtn = drawer.getByRole('button', { name: /mark subtask complete/i }).first();
    await completeSubtaskBtn.click();

    // Verify progress roll-up updates to 1/2 (50%)
    await expect(drawer.getByText('1/2 (50%)')).toBeVisible({ timeout: 10000 });

    // Close drawer and verify task card rollup badge
    await page.getByRole('button', { name: /close drawer/i }).click();
    await expect(page.locator('.card', { hasText: parentTitle })).toContainText('1/2');
  });

  test('deletes a task and verifies its removal from database and view', async ({ page }) => {
    const creds = generateTestCredentials('tasks_delete');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    const taskToDelete = `Task To Delete ${Date.now()}`;
    const task = await createTaskViaApi(token, {
      title: taskToDelete,
      priority: 'low',
    });

    await setAuthenticatedSession(page, token, '/tasks');

    const card = page.locator(`[id="task-${task.id || task._id}"]`);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Hover card to reveal action buttons and click delete
    await card.hover();
    const deleteBtn = card.getByRole('button', { name: new RegExp(`delete task ${taskToDelete}`, 'i') });
    await deleteBtn.click();

    // Verify task is removed from UI
    await expect(page.locator('.card', { hasText: taskToDelete })).not.toBeVisible({ timeout: 8000 });

    // Reload page to ensure deletion was persisted to database
    await page.reload();
    await expect(page.locator('.card', { hasText: taskToDelete })).not.toBeVisible();
  });
});
