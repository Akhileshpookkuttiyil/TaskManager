const { body } = require("express-validator");
const { TASK_STATUS, TASK_PRIORITY, TASK_RECURRENCE, LEGACY_TASK_STATUS } = require("../constants");

const VALID_STATUSES = [...new Set([...Object.values(TASK_STATUS), ...Object.keys(LEGACY_TASK_STATUS)])];
const VALID_PRIORITIES = Object.values(TASK_PRIORITY);
const VALID_RECURRENCES = Object.values(TASK_RECURRENCE);
const isValidDateValue = (value) => {
  if (value === null || value === undefined || value === "") return true;

  return !Number.isNaN(new Date(value).getTime());
};

const taskValidator = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }).withMessage("Title too long"),
  body("description").optional().isLength({ max: 2000 }).withMessage("Description too long"),
  body("status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}`),
  body("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),
  body("recurrence")
    .optional()
    .isIn(VALID_RECURRENCES)
    .withMessage(`Recurrence must be one of: ${VALID_RECURRENCES.join(", ")}`),
  body("dueDate").optional({ nullable: true }).custom(isValidDateValue).withMessage("Invalid date format"),
  body("reminderDate").optional({ nullable: true }).custom(isValidDateValue).withMessage("Invalid reminder date format"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

module.exports = { taskValidator };
