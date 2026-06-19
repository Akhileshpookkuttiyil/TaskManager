const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

const JWT_EXPIRY = "7d";

module.exports = { TASK_STATUS, TASK_PRIORITY, JWT_EXPIRY };
