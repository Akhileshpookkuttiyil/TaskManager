import { test, expect } from '@playwright/test';
import {
  generateTestCredentials,
  registerUserViaApi,
  createTaskViaApi,
  cleanupUsers,
  setAuthenticatedSession,
} from './helpers/test-setup.js';

test.describe('Journey F: Error Handling & Resilience', () => {
  const createdUserIds = [];

  test.afterAll(async () => {
    await cleanupUsers(createdUserIds);
  });

  test('expired or malformed token clears session and redirects gracefully to login', async ({ page }) => {
    // Navigate to login to set localStorage on the origin
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('token', 'malformed.invalid.expired.jwt.token');
    });

    // Attempt to access protected dashboard
    await page.goto('/');

    // Application should encounter 401 on /api/auth/me and redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // Ensure application did not crash and login form is functional
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    // Token should have been cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('handles 500 API failure gracefully with ErrorState and recovers on retry', async ({ page }) => {
    const creds = generateTestCredentials('err_api');
    const { user, token } = await registerUserViaApi(creds);
    const userId = user.id || user._id;
    createdUserIds.push(userId);

    await createTaskViaApi(token, {
      title: 'Resilience Test Task',
      priority: 'high',
    });

    // Intercept backend API /api/tasks (explicitly targeting port 5000 so Vite source modules are not matched)
    let simulateFailure = true;
    await page.route('http://localhost:5000/api/tasks*', async (route) => {
      if (simulateFailure && route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify({
            success: false,
            message: 'Simulated backend database unavailable error',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await setAuthenticatedSession(page, token, '/tasks');

    // Verify ErrorState component renders without crashing the app
    const errorState = page.locator('div', { hasText: /failed to load tasks|something went wrong|a server error occurred|simulated backend database unavailable/i }).first();
    await expect(errorState).toBeVisible({ timeout: 15000 });

    // Now restore normal API behavior (simulating service recovery)
    simulateFailure = false;

    // Click "Retry" button on the error state
    const retryBtn = page.getByRole('button', { name: /retry/i });
    await retryBtn.click();

    // Verify application recovers and task card becomes visible
    await expect(page.locator('.card', { hasText: 'Resilience Test Task' })).toBeVisible({ timeout: 15000 });
  });

  test('handles non-existent resource gracefully without crashing', async ({ page }) => {
    const creds = generateTestCredentials('err_nonexistent');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await setAuthenticatedSession(page, token, '/');

    // Navigate to /tasks requesting focus on a non-existent task UUID
    await page.goto('/tasks?focus=00000000-0000-4000-8000-000000000000');

    // Page must remain operational and responsive
    await expect(page).toHaveURL(/tasks/);
    await expect(page.getByRole('button', { name: /new task/i })).toBeVisible({ timeout: 10000 });

    // No React unhandled crash error boundary banner
    await expect(page.locator('text=Uncaught Exception')).not.toBeVisible();
  });

  test('resilient to malformed unexpected API response payloads without unhandled crash', async ({ page }) => {
    const creds = generateTestCredentials('err_malformed');
    const { user, token } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    // Intercept backend /api/notifications targeting port 5000
    await page.route('http://localhost:5000/api/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: true,
          data: {
            notifications: [],
            unreadCount: 0,
            unexpectedField: 'malformed_extra_data',
          },
        }),
      });
    });

    await setAuthenticatedSession(page, token, '/notifications');

    // Page must remain operational and not crash with Uncaught Exception
    await expect(page).toHaveURL(/notifications/);
    await expect(page.locator('text=Uncaught Exception')).not.toBeVisible();
    await expect(page.getByText(/your inbox is clean|notification center/i).first()).toBeVisible({ timeout: 15000 });
  });
});
