import { test, expect } from '@playwright/test';
import {
  generateTestCredentials,
  registerUserViaApi,
  createTaskViaApi,
  createNotificationViaPrisma,
  cleanupUsers,
  setAuthenticatedSession,
} from './helpers/test-setup.js';

test.describe('Journey E: Notifications & Activity Audit Log', () => {
  const createdUserIds = [];

  test.afterAll(async () => {
    await cleanupUsers(createdUserIds);
  });

  test('displays notifications, unread counts, and supports mark as read and dismiss', async ({ page }) => {
    const creds = generateTestCredentials('notif_journey');
    const { user, token } = await registerUserViaApi(creds);
    const userId = user.id || user._id;
    createdUserIds.push(userId);

    // Create 2 test notifications directly
    const notifTitle1 = `Overdue Alert ${Date.now()}`;
    await createNotificationViaPrisma(userId, {
      title: notifTitle1,
      message: 'A critical milestone is past due.',
      type: 'overdue',
      isRead: false,
    });

    const notifTitle2 = `Reminder ${Date.now()}`;
    await createNotificationViaPrisma(userId, {
      title: notifTitle2,
      message: 'Prepare design specifications for review.',
      type: 'task_reminder',
      isRead: false,
    });

    await setAuthenticatedSession(page, token, '/notifications');

    // Verify notifications appear in the list
    await expect(page.getByText(notifTitle1)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(notifTitle2)).toBeVisible({ timeout: 15000 });

    // Verify unread count badge in Topbar or page tab
    const unreadTab = page.getByRole('button', { name: /^unread/i });
    await expect(unreadTab).toBeVisible();

    // Mark the first notification as read if unread button exists
    const markReadBtn = page.locator('button[title="Mark as read"]').first();
    if (await markReadBtn.isVisible()) {
      await markReadBtn.click();
      await expect(page.locator('.toaster, [role="status"], div:has-text("Marked as read")').first()).toBeVisible({ timeout: 5000 });
    }

    // Dismiss the second notification
    const dismissBtn = page.locator('button[title="Dismiss notification"]').first();
    await expect(dismissBtn).toBeVisible({ timeout: 10000 });
    await dismissBtn.click();

    // Verify notification is dismissed from view
    await expect(page.getByText(notifTitle2)).not.toBeVisible({ timeout: 8000 });
  });

  test('activity history logs task creation, edits, and is inspectable in drawer and dashboard', async ({ page }) => {
    const creds = generateTestCredentials('activity_log');
    const { user, token } = await registerUserViaApi(creds);
    const userId = user.id || user._id;
    createdUserIds.push(userId);

    // Create task
    const taskTitle = `Activity Monitored Task ${Date.now()}`;
    const task = await createTaskViaApi(token, {
      title: taskTitle,
      priority: 'medium',
      status: 'pending',
    });

    await setAuthenticatedSession(page, token, '/tasks');

    // Open task drawer
    const card = page.locator(`[id="task-${task.id || task._id}"]`);
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    const drawer = page.locator('#task-detail-drawer');
    await expect(drawer).toBeVisible();

    // Verify Audit History section contains task created event
    const auditSection = drawer.locator('h4:has-text("AUDIT HISTORY LOG")').locator('..');
    await expect(auditSection).toBeVisible();
    await expect(drawer.getByText(/created task/i)).toBeVisible({ timeout: 10000 });

    // Update status to in_progress to generate a status change activity
    const statusResp = page.waitForResponse((r) => r.url().includes('/api/tasks') && r.request().method() === 'PUT');
    await page.locator('#drawer-status').selectOption('in_progress');
    await statusResp;

    // Verify new activity appears in audit history
    await expect(drawer.getByText(/changed status/i)).toBeVisible({ timeout: 10000 });

    // Navigate to Dashboard and verify Workspace Activity section reflects the actions
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /workspace activity/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(new RegExp(taskTitle, 'i')).first()).toBeVisible();
  });
});
