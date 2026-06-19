const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { JWT_EXPIRY } = require("../constants");
const { serializeUser } = require("../utils/serializers");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const registerUser = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user
    .create({
      data: {
        name,
        email,
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
  const user = await prisma.user.findUnique({ where: { email } });

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

module.exports = { registerUser, loginUser };
