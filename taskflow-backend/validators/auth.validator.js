const { body } = require("express-validator");

const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 50 }).withMessage("Name too long"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateProfileValidator = [
  body("name").optional({ checkFalsy: true }).trim().isLength({ max: 50 }).withMessage("Name too long"),
  body("email").optional({ checkFalsy: true }).trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("currentPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage("Current password must be at least 6 characters"),
  body("newPassword").optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];

module.exports = { registerValidator, loginValidator, updateProfileValidator };
