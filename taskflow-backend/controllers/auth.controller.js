const { registerUser, loginUser } = require("../services/auth.service");
const { sendSuccess } = require("../utils/response");

const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    sendSuccess(res, result, "Account created successfully", 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    sendSuccess(res, result, "Logged in successfully");
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  // req.user is already attached by protect middleware
  sendSuccess(res, { user: req.user });
};

module.exports = { register, login, getMe };
