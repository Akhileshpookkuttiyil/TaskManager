const request = require('supertest');
const app = require('../server');
const prisma = require('../config/prisma');
const { createTestUser, createTestTask, cleanupTestUsers } = require('./helpers');

describe('Critical API: Notifications (/api/notifications)', () => {
  let userA;
  let userB;
  const createdUserIds = [];

  beforeAll(async () => {
    userA = await createTestUser({ name: 'Notification User A' });
    userB = await createTestUser({ name: 'Notification User B' });
    createdUserIds.push(userA.user.id, userB.user.id);

    // Create an overdue task for User A to automatically trigger notification sync
    const yesterday = new Date(Date.now() - 3600000).toISOString();
    await createTestTask(userA.user.id, {
      title: 'Notification Trigger Task',
      status: 'pending',
      dueDate: yesterday,
    });
  });

  afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  describe('GET /api/notifications', () => {
    it('returns notifications list and unread count for authenticated user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('notifications');
      expect(res.body.data).toHaveProperty('unreadCount');
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('supports unreadOnly query filter to return only unread notifications', async () => {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const allUnread = res.body.data.notifications.every((n) => n.isRead === false);
      expect(allUnread).toBe(true);
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/notifications');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    let testNotification;

    beforeEach(async () => {
      // Create an unread notification specifically for read tests
      testNotification = await prisma.notification.create({
        data: {
          userId: userA.user.id,
          title: 'Notification For Read Test',
          message: 'Will be marked as read',
          dedupeKey: `read_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'task_reminder',
          isRead: false,
        },
      });
    });

    it('marks a single notification as read', async () => {
      expect(testNotification).toBeDefined();

      const res = await request(app)
        .patch(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);
      expect(res.body.data.notification.readAt).toBeDefined();

      // Verify DB persistence
      const updated = await prisma.notification.findUnique({
        where: { id: testNotification.id },
      });
      expect(updated.isRead).toBe(true);
    });

    it('returns 404 when User B attempts to mark User A notification as read', async () => {
      expect(testNotification).toBeDefined();

      const res = await request(app)
        .patch(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/notification not found/i);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('marks all notifications as read for current user', async () => {
      // Create another notification for user A
      await prisma.notification.create({
        data: {
          userId: userA.user.id,
          title: 'Manual Notification',
          message: 'Test message',
          dedupeKey: `manual_${Date.now()}`,
          type: 'task_reminder',
          isRead: false,
        },
      });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify unreadCount is now 0
      const getRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(getRes.body.data.unreadCount).toBe(0);
    });
  });
});
