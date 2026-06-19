const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

const LEGACY_TASK_STATUS = {
  TODO: TASK_STATUS.PENDING,
  DONE: TASK_STATUS.COMPLETED,
};

const JWT_EXPIRY = "7d";

module.exports = { TASK_STATUS, TASK_PRIORITY, LEGACY_TASK_STATUS, JWT_EXPIRY };
