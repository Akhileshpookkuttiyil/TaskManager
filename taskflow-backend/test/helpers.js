const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_EXPIRY } = require('../constants');

const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY || '7d' });
};

const createTestUser = async (overrides = {}) => {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const password = overrides.password || 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: overrides.name || `Test User ${uniqueId}`,
      email: (overrides.email || `test_${uniqueId}@example.com`).toLowerCase().trim(),
      password: hashedPassword,
      avatar: overrides.avatar || null,
    },
  });

  const token = generateTestToken(user.id);

  return {
    user: {
      ...user,
      _id: user.id,
    },
    token,
    rawPassword: password,
  };
};

const createTestTask = async (userId, overrides = {}) => {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const task = await prisma.task.create({
    data: {
      userId,
      title: overrides.title || `Test Task ${uniqueId}`,
      description: overrides.description || null,
      status: overrides.status || 'pending',
      priority: overrides.priority || 'medium',
      recurrence: overrides.recurrence || 'none',
      dueDate: overrides.dueDate ? new Date(overrides.dueDate) : null,
      reminderDate: overrides.reminderDate ? new Date(overrides.reminderDate) : null,
      tags: overrides.tags || [],
      parentId: overrides.parentId || null,
    },
  });

  return {
    ...task,
    _id: task.id,
  };
};

const cleanupTestUsers = async (userIds = []) => {
  const validIds = userIds.filter((id) => id && typeof id === 'string');
  if (validIds.length === 0) return;

  try {
    // Cascade delete handles tasks, notifications, activities, and dependencies
    await prisma.user.deleteMany({
      where: {
        id: { in: validIds },
      },
    });
  } catch (err) {
    console.error('Failed to cleanup test users:', err.message);
  }
};

module.exports = {
  generateTestToken,
  createTestUser,
  createTestTask,
  cleanupTestUsers,
};
