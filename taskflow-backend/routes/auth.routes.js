const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth");
const { registerValidator, loginValidator } = require("../validators/auth.validator");
const { validate } = require("../middleware/validate");

// Tighter than the global API limiter — slows down credential stuffing / brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, ...registerValidator, validate, register);
router.post("/login", authLimiter, ...loginValidator, validate, login);
router.get("/me", protect, getMe);

module.exports = router;
