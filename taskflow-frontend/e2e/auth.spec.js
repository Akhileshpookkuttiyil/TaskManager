import { test, expect } from '@playwright/test';
import {
  generateTestCredentials,
  registerUserViaApi,
  cleanupUsers,
} from './helpers/test-setup.js';

test.describe('Journey A: Authentication & Route Protection', () => {
  const createdUserIds = [];

  test.afterAll(async () => {
    await cleanupUsers(createdUserIds);
  });

  test('user registration via UI redirects to dashboard with authenticated session', async ({ page }) => {
    const creds = generateTestCredentials('auth_reg');

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    await page.locator('#register-name').fill(creds.name);
    await page.locator('#register-email').fill(creds.email);
    await page.locator('#register-password').fill(creds.password);
    await page.getByRole('button', { name: /create account/i }).click();

    // Verify redirection to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /good/i })).toBeVisible();

    // Verify token exists in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // Capture user ID for cleanup
    const userPayload = await page.evaluate(() => {
      const jwt = localStorage.getItem('token');
      if (!jwt) return null;
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return payload.id || payload._id;
      } catch {
        return null;
      }
    });
    if (userPayload) createdUserIds.push(userPayload);
  });

  test('login with valid credentials authenticates user and navigates to dashboard', async ({ page }) => {
    // Register user via API for clean, fast credential isolation
    const creds = generateTestCredentials('auth_valid');
    const { user } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await page.goto('/login');
    await page.locator('#login-email').fill(creds.email);
    await page.locator('#login-password').fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /good/i })).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('login with invalid credentials fails and displays error message', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill('nonexistent_user@invalid-domain.com');
    await page.locator('#login-password').fill('WrongPassword999!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should stay on /login
    await expect(page).toHaveURL(/\/login/);

    // Should display toast error
    const toastError = page.locator('.toaster, [role="status"], div:has-text("Invalid email or password"), div:has-text("Invalid credentials")');
    await expect(toastError.first()).toBeVisible({ timeout: 5000 });

    // Token should remain null
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('authentication persists across page reloads', async ({ page }) => {
    const creds = generateTestCredentials('auth_persist');
    const { user } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await page.goto('/login');
    await page.locator('#login-email').fill(creds.email);
    await page.locator('#login-password').fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Reload the page
    await page.reload();

    // Verify still on dashboard with greeting visible
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /good/i })).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('logout clears session and redirects to login page', async ({ page }) => {
    const creds = generateTestCredentials('auth_logout');
    const { user } = await registerUserViaApi(creds);
    createdUserIds.push(user.id || user._id);

    await page.goto('/login');
    await page.locator('#login-email').fill(creds.email);
    await page.locator('#login-password').fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Open User menu in Topbar
    await page.locator('#user-menu-trigger').click();
    await expect(page.locator('#user-menu')).toBeVisible();

    // Click Sign out
    await page.locator('#menu-logout').click();

    // Redirection to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Token must be removed from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('protected routes block unauthenticated access and redirect to /login', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    const protectedPaths = ['/', '/tasks', '/profile', '/notifications', '/analytics'];

    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
    }
  });
});
