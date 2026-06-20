const { registerUser, loginUser, updateProfile } = require("../services/auth.service");
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
  sendSuccess(res, { user: req.user });
};

const updateMe = async (req, res, next) => {
  try {
    const result = await updateProfile(req.user._id, req.body);
    sendSuccess(res, result, "Profile updated successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateMe };
