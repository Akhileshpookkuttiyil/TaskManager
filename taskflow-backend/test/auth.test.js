const request = require('supertest');
const app = require('../server');
const { createTestUser, cleanupTestUsers } = require('./helpers');

describe('Critical API: Authentication and /me (/api/auth)', () => {
  const createdUserIds = [];

  afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  describe('POST /api/auth/register', () => {
    it('successfully registers a new user with valid credentials', async () => {
      const email = `auth_reg_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Register Test User',
          email,
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Account created successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.name).toBe('Register Test User');
      expect(res.body.data.user).not.toHaveProperty('password');

      if (res.body.data.user.id || res.body.data.user._id) {
        createdUserIds.push(res.body.data.user.id || res.body.data.user._id);
      }
    });

    it('rejects registration when email is already registered with 409', async () => {
      const existingUser = await createTestUser();
      createdUserIds.push(existingUser.user.id);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Email User',
          email: existingUser.user.email,
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already (in use|exists)/i);
    });

    it('rejects registration with invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it('rejects registration with short password (< 6 characters) with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass User',
          email: `short_pass_${Date.now()}@example.com`,
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    it('rejects registration with empty name with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '   ',
          email: `noname_${Date.now()}@example.com`,
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name is required/i);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    const rawPassword = 'SecurePassword123!';

    beforeAll(async () => {
      testUser = await createTestUser({ password: rawPassword });
      createdUserIds.push(testUser.user.id);
    });

    it('successfully logs in with correct email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
          password: rawPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged in successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUser.user.email);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('rejects login with incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('rejects login with non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'non_existent_account_xyz@example.com',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('rejects login with missing password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser;

    beforeAll(async () => {
      testUser = await createTestUser({ name: 'Me Test User' });
      createdUserIds.push(testUser.user.id);
    });

    it('returns the current authenticated user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.user.email);
      expect(res.body.data.user.name).toBe('Me Test User');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('rejects request without authorization header with 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized, no token/i);
    });

    it('rejects request with invalid or tampered token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.jwttoken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized, invalid token/i);
    });
  });

  describe('PUT /api/auth/me', () => {
    let testUser;
    const initialPassword = 'InitialPassword123!';

    beforeEach(async () => {
      testUser = await createTestUser({ name: 'Original Name', password: initialPassword });
      createdUserIds.push(testUser.user.id);
    });

    it('updates user display name successfully', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Updated Name');
    });

    it('updates password when current password matches', async () => {
      const newPassword = 'BrandNewPassword123!';
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: initialPassword,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that logging in with the new password succeeds
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
          password: newPassword,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toHaveProperty('token');
    });

    it('rejects password update when current password is wrong with 401', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/current password is incorrect/i);
    });
  });
});
