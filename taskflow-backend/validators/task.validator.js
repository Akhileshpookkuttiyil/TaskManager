const { body } = require("express-validator");
const { TASK_STATUS, TASK_PRIORITY, TASK_RECURRENCE, LEGACY_TASK_STATUS } = require("../constants");

const VALID_STATUSES = [...new Set([...Object.values(TASK_STATUS), ...Object.keys(LEGACY_TASK_STATUS)])];
const VALID_PRIORITIES = Object.values(TASK_PRIORITY);
const VALID_RECURRENCES = Object.values(TASK_RECURRENCE);
const isValidTimeZone = (value) => {
  if (value === null || value === undefined || value === "") return true;

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch (error) {
    return false;
  }
};
const isValidDateValue = (value) => {
  if (value === null || value === undefined || value === "") return true;

  return !Number.isNaN(new Date(value).getTime());
};

const commonTaskRules = [
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
  body("timeZone").optional().custom(isValidTimeZone).withMessage("Invalid time zone"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("parentId").optional({ nullable: true }).isUUID().withMessage("Parent ID must be a valid UUID"),
];

const createTaskValidator = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }).withMessage("Title too long"),
  ...commonTaskRules,
];

const updateTaskValidator = [
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isLength({ max: 200 }).withMessage("Title too long"),
  ...commonTaskRules,
];

const createSubtaskValidator = [
  body("title").trim().notEmpty().withMessage("Subtask title is required").isLength({ max: 200 }).withMessage("Title too long"),
  body("priority").optional().isIn(VALID_PRIORITIES).withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),
  body("dueDate").optional({ nullable: true }).custom(isValidDateValue).withMessage("Invalid date format"),
  body("description").optional().isLength({ max: 2000 }).withMessage("Description too long"),
];

const updateSubtaskValidator = [
  body("title").optional().trim().notEmpty().withMessage("Subtask title cannot be empty").isLength({ max: 200 }).withMessage("Title too long"),
  body("status").optional().isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}`),
  body("priority").optional().isIn(VALID_PRIORITIES).withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),
  body("dueDate").optional({ nullable: true }).custom(isValidDateValue).withMessage("Invalid date format"),
  body("description").optional().isLength({ max: 2000 }).withMessage("Description too long"),
];

const taskValidator = createTaskValidator;

module.exports = { taskValidator, createTaskValidator, updateTaskValidator, createSubtaskValidator, updateSubtaskValidator };
