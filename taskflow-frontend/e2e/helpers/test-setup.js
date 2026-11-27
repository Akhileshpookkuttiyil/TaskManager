import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../taskflow-backend/.env');

if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const require = createRequire(import.meta.url);
let prisma = null;
try {
  prisma = require('../../../taskflow-backend/config/prisma');
} catch (err) {
  console.warn('Prisma client not accessible from E2E helpers:', err.message);
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * Generates a unique test user credential object to ensure test isolation.
 */
export const generateTestCredentials = (prefix = 'e2e') => {
  const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    name: `Test User ${unique}`,
    email: `${prefix}_${unique}@taskflow-test.org`.toLowerCase(),
    password: 'TestPassword123!',
  };
};

/**
 * Clean up test users from the database.
 * Cascades to tasks, dependencies, notifications, and activity logs.
 */
export const cleanupUsers = async (userIds = []) => {
  const validIds = userIds.filter((id) => id && typeof id === 'string');
  if (validIds.length === 0 || !prisma) return;

  try {
    await prisma.user.deleteMany({
      where: {
        id: { in: validIds },
      },
    });
  } catch (err) {
    console.warn('Failed to clean up test users in Neon DB:', err.message);
  }
};

/**
 * Fast API registration helper for creating pre-authenticated test fixtures.
 */
export const registerUserViaApi = async (credentials) => {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`API registration failed: ${body.message || res.status}`);
  }

  return body.data; // { user, token }
};

/**
 * Fast API helper for creating tasks under an authenticated user.
 * Normalizes backend response so caller receives the created task object.
 */
export const createTaskViaApi = async (token, taskData) => {
  const res = await fetch(`${BACKEND_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`API task creation failed: ${body.message || res.status}`);
  }

  return body.data?.task || body.data;
};

/**
 * Fast API helper for creating task dependency relationships.
 */
export const createDependencyViaApi = async (token, taskId, prerequisiteId) => {
  const res = await fetch(`${BACKEND_URL}/api/tasks/${taskId}/dependencies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prerequisiteId }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`API dependency creation failed: ${body.message || res.status}`);
  }

  return body.data;
};

/**
 * Creates a notification directly in Neon DB for testing notification workflows.
 */
export const createNotificationViaPrisma = async (userId, data = {}) => {
  if (!prisma) return null;
  const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return await prisma.notification.create({
    data: {
      userId,
      type: data.type || 'task_reminder',
      title: data.title || `Test Alert ${unique}`,
      message: data.message || 'Automated E2E test notification',
      dedupeKey: `notif_${unique}`,
      isRead: Boolean(data.isRead),
    },
  });
};

/**
 * Injects token into localStorage via Playwright init script before page load,
 * then navigates directly to target path. This guarantees zero race conditions
 * and instant hydration.
 */
export const setAuthenticatedSession = async (page, token, targetPath = '/') => {
  await page.addInitScript((jwt) => {
    localStorage.setItem('token', jwt);
  }, token);

  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
};
