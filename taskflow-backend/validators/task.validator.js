const { body } = require("express-validator");
const { TASK_STATUS, TASK_PRIORITY } = require("../constants");

const taskValidator = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }).withMessage("Title too long"),
  body("description").optional().isLength({ max: 2000 }).withMessage("Description too long"),
  body("status")
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(", ")}`),
  body("priority")
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(TASK_PRIORITY).join(", ")}`),
  body("dueDate").optional({ nullable: true }).isISO8601().withMessage("Invalid date format"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

module.exports = { taskValidator };
