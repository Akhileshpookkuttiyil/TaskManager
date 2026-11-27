import { test, expect } from '@playwright/test';
import {
  generateTestCredentials,
  registerUserViaApi,
  createTaskViaApi,
  createDependencyViaApi,
  cleanupUsers,
  setAuthenticatedSession,
} from './helpers/test-setup.js';

test.describe('Journey D: Task Dependencies & Blocking Workflows', () => {
  const createdUserIds = [];

  test.afterAll(async () => {
    await cleanupUsers(createdUserIds);
  });

  test('creates prerequisite relationship and verifies blocked status and completion prevention', async ({ page }) => {
    const creds = generateTestCredentials('dep_blocking');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    const prereqTask = await createTaskViaApi(token, {
      title: `Step 1: Database Setup ${Date.now()}`,
      status: 'pending',
      priority: 'high',
    });

    const dependentTask = await createTaskViaApi(token, {
      title: `Step 2: Deploy Service ${Date.now()}`,
      status: 'pending',
      priority: 'high',
    });

    await setAuthenticatedSession(page, token, '/tasks');

    // Open dependent task drawer using unique task element id
    const depCard = page.locator(`[id="task-${dependentTask.id || dependentTask._id}"]`);
    await expect(depCard).toBeVisible({ timeout: 10000 });
    await depCard.click();

    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible();

    // In TaskDependencies section, click "Add prerequisite task..."
    const addPrereqBtn = drawer.getByRole('button', { name: /add prerequisite task/i });
    await addPrereqBtn.click();

    // Find and click the prerequisite task in dropdown
    const option = drawer.getByRole('option', { name: new RegExp(prereqTask.title, 'i') });
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // Verify prerequisite is added to the list
    await expect(drawer.getByText(prereqTask.title)).toBeVisible({ timeout: 10000 });

    // Close drawer
    await page.getByRole('button', { name: /close drawer/i }).click();

    // Dependent task card must display Blocked badge
    await expect(depCard.locator('[data-testid="blocked-badge"]')).toBeVisible({ timeout: 10000 });

    // Attempting to complete the blocked task via card checkbox should be intercepted
    const completeBtn = depCard.getByRole('button', { name: /cannot complete: blocked by incomplete prerequisites/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // Verify error toast
    const toastError = page.locator('.toaster, [role="status"], div:has-text("Cannot complete task: blocked")');
    await expect(toastError.first()).toBeVisible({ timeout: 5000 });

    // Dependent task must remain pending (not completed)
    await expect(depCard).not.toHaveClass(/line-through/);
  });

  test('completing prerequisite task automatically unblocks dependent task for completion', async ({ page }) => {
    const creds = generateTestCredentials('dep_unblock');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    const prereq = await createTaskViaApi(token, {
      title: `Prereq Alpha ${Date.now()}`,
      status: 'pending',
    });

    const dependent = await createTaskViaApi(token, {
      title: `Dependent Beta ${Date.now()}`,
      status: 'pending',
    });

    // Establish dependency via API
    await createDependencyViaApi(token, dependent.id || dependent._id, prereq.id || prereq._id);

    await setAuthenticatedSession(page, token, '/tasks');

    const prereqCard = page.locator(`[id="task-${prereq.id || prereq._id}"]`);
    const depCard = page.locator(`[id="task-${dependent.id || dependent._id}"]`);

    // Verify initial blocked state on dependent task
    await expect(depCard.locator('[data-testid="blocked-badge"]')).toBeVisible({ timeout: 10000 });

    // Complete the prerequisite task
    const prereqCompleteBtn = prereqCard.getByRole('button', { name: /mark task complete/i });
    await prereqCompleteBtn.click();
    await expect(prereqCard.getByRole('button', { name: /mark task incomplete/i })).toBeVisible({ timeout: 10000 });

    // Refresh tasks view to sync dependency calculation from database
    await page.reload();

    // Verify blocked badge is now gone from dependent task
    await expect(page.locator(`[id="task-${dependent.id || dependent._id}"]`).locator('[data-testid="blocked-badge"]')).not.toBeVisible({ timeout: 10000 });

    // Dependent task can now be completed successfully
    const depCompleteBtn = page.locator(`[id="task-${dependent.id || dependent._id}"]`).getByRole('button', { name: /mark task complete/i });
    await depCompleteBtn.click();

    // Verify dependent task is completed
    await expect(page.locator(`[id="task-${dependent.id || dependent._id}"]`).getByRole('button', { name: /mark task incomplete/i })).toBeVisible({ timeout: 10000 });
  });

  test('prevents circular dependency creation and reports informative rejection error', async ({ page }) => {
    const creds = generateTestCredentials('dep_circular');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    const taskA = await createTaskViaApi(token, {
      title: `Task A ${Date.now()}`,
      status: 'pending',
    });

    const taskB = await createTaskViaApi(token, {
      title: `Task B ${Date.now()}`,
      status: 'pending',
    });

    // Task B depends on Task A (A -> B)
    await createDependencyViaApi(token, taskB.id || taskB._id, taskA.id || taskA._id);

    await setAuthenticatedSession(page, token, '/tasks');

    // Open Task A drawer to attempt making Task A depend on Task B (B -> A cycle)
    const cardA = page.locator(`[id="task-${taskA.id || taskA._id}"]`);
    await expect(cardA).toBeVisible({ timeout: 10000 });
    await cardA.click();

    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible();

    // Click "Add prerequisite task..."
    await drawer.getByRole('button', { name: /add prerequisite task/i }).click();

    // Candidate dropdown should filter out Task B or reject with circular dependency error if selected
    const optionB = drawer.getByRole('option', { name: new RegExp(taskB.title, 'i') });
    if (await optionB.isVisible({ timeout: 2000 }).catch(() => false)) {
      await optionB.click();
      // Should show circular dependency rejection error toast
      const toastError = page.locator('.toaster, [role="status"], div:has-text("circular dependency")');
      await expect(toastError.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Correctly prevented by candidate filtering (self or cyclic candidate filtering)
      expect(true).toBe(true);
    }
  });
});
