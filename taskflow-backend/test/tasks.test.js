const request = require('supertest');
const app = require('../server');
const { createTestUser, createTestTask, cleanupTestUsers } = require('./helpers');

describe('Critical API: Task CRUD and Validation (/api/tasks)', () => {
  let testUser;
  const createdUserIds = [];

  beforeAll(async () => {
    testUser = await createTestUser({ name: 'Task Test User' });
    createdUserIds.push(testUser.user.id);
  });

  afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  describe('POST /api/tasks (Creation & Validation)', () => {
    it('creates a task with minimal required payload (title) and verifies defaults', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Minimal Payload Task',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task).toBeDefined();
      expect(res.body.data.task.title).toBe('Minimal Payload Task');
      expect(res.body.data.task.status).toBe('pending');
      expect(res.body.data.task.priority).toBe('medium');
      expect(res.body.data.task.description).toBe('');
      expect(Array.isArray(res.body.data.task.tags)).toBe(true);
    });

    it('creates a task with full payload including priority, tags, dueDate, and recurrence', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Full Featured Task',
          description: 'Detailed description of the task',
          priority: 'high',
          status: 'in_progress',
          dueDate: tomorrow,
          recurrence: 'daily',
          tags: ['backend', 'api-test', 'critical'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const { task } = res.body.data;
      expect(task.title).toBe('Full Featured Task');
      expect(task.description).toBe('Detailed description of the task');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('in_progress');
      expect(task.recurrence).toBe('daily');
      expect(task.tags).toEqual(expect.arrayContaining(['backend', 'api-test', 'critical']));
      expect(new Date(task.dueDate).toISOString()).toBe(tomorrow);
    });

    it('rejects task creation with empty or missing title with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/title is required/i);
    });

    it('rejects task creation when title exceeds 200 characters with 400', async () => {
      const longTitle = 'A'.repeat(201);
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: longTitle,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/title too long/i);
    });

    it('rejects task creation with invalid status with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Invalid Status Task',
          status: 'non_existent_status',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/status must be one of/i);
    });

    it('rejects task creation with invalid priority with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Invalid Priority Task',
          priority: 'urgent_critical_unknown',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/priority must be one of/i);
    });

    it('rejects task creation with invalid dueDate format with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Invalid Date Task',
          dueDate: 'not-a-valid-date-string',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid date format/i);
    });

    it('rejects task creation when tags is not an array with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Invalid Tags Task',
          tags: 'string-instead-of-array',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/tags must be an array/i);
    });
  });

  describe('GET /api/tasks (Retrieval, Filtering & Pagination)', () => {
    let taskPendingHigh;
    let taskCompletedLow;

    beforeAll(async () => {
      taskPendingHigh = await createTestTask(testUser.user.id, {
        title: 'Alpha Searchable Task',
        status: 'pending',
        priority: 'high',
        tags: ['urgent', 'alpha'],
      });

      taskCompletedLow = await createTestTask(testUser.user.id, {
        title: 'Beta Completed Task',
        status: 'completed',
        priority: 'low',
        tags: ['finished', 'beta'],
      });
    });

    it('lists tasks with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/tasks?limit=10&page=1')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination).toHaveProperty('total');
      expect(res.body.data.pagination).toHaveProperty('page');
      expect(res.body.data.pagination).toHaveProperty('limit');
    });

    it('filters tasks by status (e.g. status=completed)', async () => {
      const res = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(1);
      const allCompleted = res.body.data.tasks.every((t) => t.status === 'completed');
      expect(allCompleted).toBe(true);
    });

    it('filters tasks by priority (e.g. priority=high)', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(1);
      const allHigh = res.body.data.tasks.every((t) => t.priority === 'high');
      expect(allHigh).toBe(true);
    });

    it('filters tasks by search query matching title', async () => {
      const res = await request(app)
        .get('/api/tasks?search=Alpha')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.some((t) => t.title.includes('Alpha'))).toBe(true);
    });

    it('filters tasks by exact tag match', async () => {
      const res = await request(app)
        .get('/api/tasks?tag=urgent')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.some((t) => t._id === taskPendingHigh.id)).toBe(true);
      expect(res.body.data.tasks.some((t) => t._id === taskCompletedLow.id)).toBe(false);
    });
  });

  describe('GET /api/tasks/:id (Single Task Details)', () => {
    let task;

    beforeAll(async () => {
      task = await createTestTask(testUser.user.id, {
        title: 'Single Task Lookup',
        description: 'Lookup Details',
      });
    });

    it('retrieves an existing task by its ID', async () => {
      const res = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task).toBeDefined();
      expect(res.body.data.task.title).toBe('Single Task Lookup');
      expect(res.body.data.task._id).toBe(task.id);
    });

    it('returns 404 for a valid UUID that does not exist', async () => {
      const nonExistentUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .get(`/api/tasks/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/task not found/i);
    });

    it('returns 404 for an invalid non-UUID identifier', async () => {
      const res = await request(app)
        .get('/api/tasks/not-a-valid-uuid-string')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id (Update & Lifecycle Transitions)', () => {
    let task;

    beforeEach(async () => {
      task = await createTestTask(testUser.user.id, {
        title: 'Task Before Update',
        status: 'pending',
        priority: 'low',
      });
    });

    it('updates title, description, priority, and tags', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Task After Update',
          description: 'Updated Description',
          priority: 'high',
          tags: ['updated', 'v2'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Task After Update');
      expect(res.body.data.task.description).toBe('Updated Description');
      expect(res.body.data.task.priority).toBe('high');
      expect(res.body.data.task.tags).toEqual(['updated', 'v2']);
    });

    it('sets completedAt when transitioning status to completed', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          status: 'completed',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.task.status).toBe('completed');
      expect(res.body.data.task.completedAt).toBeDefined();
      expect(res.body.data.task.completedAt).not.toBeNull();
    });

    it('sets archivedAt when transitioning status to archived', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          status: 'archived',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.task.status).toBe('archived');
      expect(res.body.data.task.archivedAt).toBeDefined();
      expect(res.body.data.task.archivedAt).not.toBeNull();
    });

    it('rejects update with empty title with 400', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/title cannot be empty/i);
    });
  });

  describe('DELETE /api/tasks/:id (Deletion)', () => {
    it('successfully deletes an existing task', async () => {
      const taskToDelete = await createTestTask(testUser.user.id, {
        title: 'Task To Delete',
      });

      const res = await request(app)
        .delete(`/api/tasks/${taskToDelete.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/task deleted/i);

      // Verify that the task is no longer found
      const getRes = await request(app)
        .get(`/api/tasks/${taskToDelete.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(getRes.status).toBe(404);
    });

    it('returns 404 when attempting to delete non-existent task', async () => {
      const nonExistentUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .delete(`/api/tasks/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });
});
