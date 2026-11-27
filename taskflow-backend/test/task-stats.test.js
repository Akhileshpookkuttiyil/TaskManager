const request = require('supertest');
const app = require('../server');
const { createTestUser, createTestTask, cleanupTestUsers } = require('./helpers');

describe('Critical API: Task Statistics (/api/tasks/stats)', () => {
  let userA;
  let userB;
  const createdUserIds = [];

  beforeAll(async () => {
    userA = await createTestUser({ name: 'Stats User A' });
    userB = await createTestUser({ name: 'Stats User B' });
    createdUserIds.push(userA.user.id, userB.user.id);

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    // Due later today (within today's bounds, but after current moment so it's not overdue)
    const dueLaterToday = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

    // User A tasks:
    // 1 pending task (due today)
    await createTestTask(userA.user.id, {
      title: 'User A Pending Today',
      status: 'pending',
      dueDate: dueLaterToday,
      tags: ['work', 'today'],
    });

    // 1 in_progress task (overdue)
    await createTestTask(userA.user.id, {
      title: 'User A In Progress Overdue',
      status: 'in_progress',
      dueDate: yesterday,
      tags: ['work', 'urgent'],
    });

    // 1 completed task
    await createTestTask(userA.user.id, {
      title: 'User A Completed Task',
      status: 'completed',
      tags: ['personal'],
    });

    // 1 archived task
    await createTestTask(userA.user.id, {
      title: 'User A Archived Task',
      status: 'archived',
    });

    // User B tasks (should not pollute User A stats):
    await createTestTask(userB.user.id, {
      title: 'User B Separate Task',
      status: 'pending',
      tags: ['userB-secret'],
    });
  });

  afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  it('returns structured statistics object with status breakdown and aggregations', async () => {
    const res = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toBeDefined();

    const { stats } = res.body.data;
    expect(stats.total).toBe(4);
    expect(stats.pending).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.archived).toBe(1);
    expect(stats.todo).toBe(1); // pending alias
    expect(stats.done).toBe(1); // completed alias
    expect(stats.overdue).toBe(1); // yesterday due date
    expect(stats.dueToday).toBe(1); // today due date
    expect(Array.isArray(stats.tags)).toBe(true);
    expect(stats.tags).toEqual(expect.arrayContaining(['work', 'today', 'urgent', 'personal']));
  });

  it('strictly enforces user isolation in statistics calculation', async () => {
    const resA = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${userA.token}`);

    const resB = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${userB.token}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // User A has 4 tasks, User B has 1 task
    expect(resA.body.data.stats.total).toBe(4);
    expect(resB.body.data.stats.total).toBe(1);

    // User A does not see User B's tags
    expect(resA.body.data.stats.tags).not.toContain('userB-secret');
    expect(resB.body.data.stats.tags).toContain('userB-secret');
  });

  it('rejects unauthenticated request to /api/tasks/stats with 401', async () => {
    const res = await request(app).get('/api/tasks/stats');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
