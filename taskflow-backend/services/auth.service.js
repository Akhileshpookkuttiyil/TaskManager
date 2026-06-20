const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { JWT_EXPIRY } = require("../constants");
const { serializeUser } = require("../utils/serializers");

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const assertRequiredAuthFields = (email, password, name) => {
  if (name !== undefined && !normalizeText(name)) {
    const error = new Error("Name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!normalizeEmail(email) || !normalizeText(password)) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const registerUser = async ({ name, email, password }) => {
  assertRequiredAuthFields(email, password, name);

  const normalizedName = normalizeText(name);
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user
    .create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
      },
    })
    .catch((error) => {
      if (error.code === "P2002") {
        const duplicateError = new Error("Email already in use");
        duplicateError.statusCode = 409;
        throw duplicateError;
      }

      throw error;
    });
  const serializedUser = serializeUser(user);
  const token = generateToken(serializedUser._id);

  return {
    token,
    user: serializedUser,
  };
};

const loginUser = async ({ email, password }) => {
  assertRequiredAuthFields(email, password);

  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const serializedUser = serializeUser(user);
  const token = generateToken(serializedUser._id);

  return {
    token,
    user: serializedUser,
  };
};

const updateProfile = async (userId, { name, email, currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const updates = {};

  if (name !== undefined) {
    updates.name = normalizeText(name);
  }

  if (email !== undefined) {
    const nextEmail = normalizeEmail(email);
    if (!nextEmail) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      throw error;
    }
    if (nextEmail !== user.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (duplicate && duplicate.id !== userId) {
        const error = new Error("Email already in use");
        error.statusCode = 409;
        throw error;
      }
    }
    updates.email = nextEmail;
  }

  if (newPassword) {
    if (!currentPassword) {
      const error = new Error("Current password is required to change your password");
      error.statusCode = 400;
      throw error;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      const error = new Error("Current password is incorrect");
      error.statusCode = 401;
      throw error;
    }

    updates.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updates).length === 0) {
    return { user: serializeUser(user) };
  }

  const updatedUser = await prisma.user
    .update({
      where: { id: userId },
      data: updates,
    })
    .catch((error) => {
      if (error.code === "P2002") {
        const duplicateError = new Error("Email already in use");
        duplicateError.statusCode = 409;
        throw duplicateError;
      }

      throw error;
    });

  return {
    user: serializeUser(updatedUser),
  };
};

module.exports = { registerUser, loginUser, updateProfile };
