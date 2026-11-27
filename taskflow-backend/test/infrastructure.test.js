const request = require('supertest');
const app = require('../server');

describe('Backend Testing Infrastructure & Environment Hardening', () => {
  it('ensures NODE_ENV is set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('responds with 200 and running status for root health endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'TaskFlow API is running' });
  });

  it('responds with 404 and structured json error for non-existent endpoint', async () => {
    const res = await request(app).get('/api/non-existent-test-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});
