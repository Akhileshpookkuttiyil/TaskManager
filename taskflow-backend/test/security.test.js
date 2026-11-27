const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { errorHandler } = require('../middleware/errorHandler');
const { createTestUser, cleanupTestUsers } = require('./helpers');

describe('Security & Vulnerability Remediation Suite', () => {
  const createdUserIds = [];

  afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  describe('1. Security Headers & Server Fingerprinting (Helmet)', () => {
    it('sets X-Content-Type-Options to nosniff to prevent MIME type sniffing', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets X-Frame-Options to SAMEORIGIN to prevent clickjacking', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('removes or hides X-Powered-By header to prevent server fingerprinting', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('2. CORS Allowlist Policy Enforcement', () => {
    it('allows requests from approved client origins (e.g. localhost:5173)', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('denies CORS headers to unauthorized or malicious origins', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'https://malicious-attacker-domain.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('3. Request Body Payload Limit (10kb)', () => {
    it('rejects oversized JSON request bodies (> 10kb) with HTTP 413', async () => {
      const oversizedPayload = {
        title: 'Huge Payload Task',
        description: 'A'.repeat(15 * 1024), // 15 KB payload
      };

      const res = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send(oversizedPayload);

      expect(res.status).toBe(413);
    });
  });

  describe('4. Sensitive Error Sanitization', () => {
    it('sanitizes 500 error messages in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const mockErr = new Error('DATABASE CONNECTION LEAK: secret_db_credentials_xyz at /internal/db.js:42');
        mockErr.statusCode = 500;

        let responseStatus = null;
        let responseJson = null;

        const mockRes = {
          status: (code) => {
            responseStatus = code;
            return {
              json: (data) => {
                responseJson = data;
              },
            };
          },
        };

        errorHandler(mockErr, {}, mockRes, () => {});

        expect(responseStatus).toBe(500);
        expect(responseJson.success).toBe(false);
        expect(responseJson.message).toBe('Internal server error');
        expect(responseJson.message).not.toContain('secret_db_credentials');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns informative message in non-production environments for debugging', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';

        const mockErr = new Error('Debug validation failure info');
        mockErr.statusCode = 400;

        let responseStatus = null;
        let responseJson = null;

        const mockRes = {
          status: (code) => {
            responseStatus = code;
            return {
              json: (data) => {
                responseJson = data;
              },
            };
          },
        };

        errorHandler(mockErr, {}, mockRes, () => {});

        expect(responseStatus).toBe(400);
        expect(responseJson.message).toBe('Debug validation failure info');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('5. Authentication & JWT Integrity', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed Bearer tokens with 401', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid.token.structure');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects tokens signed with an unauthorized secret with 401', async () => {
      const forgedToken = jwt.sign({ id: 'some-user-id' }, 'attacker-unauthorized-secret-key');

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('prevents user enumeration by returning identical error on non-existent email and bad password', async () => {
      const user = await createTestUser();
      createdUserIds.push(user.user.id);

      // Wrong password for existing user
      const wrongPwRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.user.email,
          password: 'IncorrectPassword999!',
        });

      expect(wrongPwRes.status).toBe(401);
      expect(wrongPwRes.body.message).toBe('Invalid email or password');

      // Non-existent email
      const nonExistentRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: `nonexistent_${Date.now()}@example.com`,
          password: 'SomeRandomPassword123!',
        });

      expect(nonExistentRes.status).toBe(401);
      expect(nonExistentRes.body.message).toBe('Invalid email or password');
    });

    it('never exposes password hashes in user registration responses', async () => {
      const email = `sec_reg_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Security User',
          email,
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user).not.toHaveProperty('password');

      if (res.body.data.user.id || res.body.data.user._id) {
        createdUserIds.push(res.body.data.user.id || res.body.data.user._id);
      }
    });

    it('never exposes password hashes in user login responses', async () => {
      const user = await createTestUser();
      createdUserIds.push(user.user.id);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.user.email,
          password: user.rawPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user).not.toHaveProperty('password');
    });
  });
});
