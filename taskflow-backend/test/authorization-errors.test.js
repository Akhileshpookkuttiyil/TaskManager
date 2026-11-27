const request = require('supertest');
const app = require('../server');
const { createTestUser, createTestTask, cleanupTestUsers } = require('./helpers');

describe('Critical API: Authorization, User Isolation & Error Handling', () => {
  let userA;
  let userB;
  let userATask;
  const createdUserIds = [];

  beforeAll(async () => {
    userA = await createTestUser({ name: 'Isolation User A' });
    userB = await createTestUser({ name: 'Isolation User B' });
    createdUserIds.push(userA.user.id, userB.user.id);

    userATask = await createTestTask(userA.user.id, {
      title: 'Private Task of User A',
      status: 'pending',
    });
  });

  afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  describe('Cross-User Resource Access Isolation', () => {
    it('returns 404 when User B tries to GET User A private task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userATask.id}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/task not found/i);
    });

    it('returns 404 when User B tries to PUT (update) User A private task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userATask.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          title: 'Hacked Title By User B',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/task not found/i);

      // Verify task in DB was not modified
      const checkRes = await request(app)
        .get(`/api/tasks/${userATask.id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(checkRes.body.data.task.title).toBe('Private Task of User A');
    });

    it('returns 404 when User B tries to DELETE User A private task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${userATask.id}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify task still exists for User A
      const checkRes = await request(app)
        .get(`/api/tasks/${userATask.id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.task.title).toBe('Private Task of User A');
    });

    it('does not leak User A tasks in User B GET /api/tasks list', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      const containsUserATask = res.body.data.tasks.some((t) => t._id === userATask.id);
      expect(containsUserATask).toBe(false);
    });
  });

  describe('Unauthenticated Request Guarding', () => {
    it('rejects GET /api/tasks without token with 401', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized, no token/i);
    });

    it('rejects POST /api/tasks without token with 401', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Unauth Task' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects PUT /api/tasks/:id without token with 401', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userATask.id}`)
        .send({ title: 'Unauth Update' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects DELETE /api/tasks/:id without token with 401', async () => {
      const res = await request(app).delete(`/api/tasks/${userATask.id}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Global Routing and Error Handling', () => {
    it('returns structured 404 JSON for non-existent API endpoints', async () => {
      const res = await request(app).get('/api/undefined-endpoint-for-testing');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Route not found',
      });
    });

    it('returns root service health status at GET /', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'TaskFlow API is running',
      });
    });

    it('handles malformed JSON request body with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid-json": ');

      expect([400, 500]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });
});
